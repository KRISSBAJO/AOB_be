import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";

@Injectable()
export class JsonSerializationInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((value) => this.serialize(value)));
  }

  private serialize(value: unknown): unknown {
    if (typeof value === "bigint") {
      return value.toString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.serialize(item));
    }

    if (!value || typeof value !== "object" || value instanceof Date) {
      return value;
    }

    if (this.isDecimalLike(value)) {
      return String(value);
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        this.serialize(item),
      ]),
    );
  }

  private isDecimalLike(value: object) {
    if (
      value.constructor?.name === "Decimal" &&
      "toString" in value &&
      typeof value.toString === "function"
    ) {
      return true;
    }

    const maybeDecimal = value as Record<string, unknown>;
    const hasCustomToString =
      "toString" in value &&
      typeof value.toString === "function" &&
      value.toString !== Object.prototype.toString;

    return (
      hasCustomToString &&
      typeof maybeDecimal.s === "number" &&
      typeof maybeDecimal.e === "number" &&
      Array.isArray(maybeDecimal.d)
    );
  }
}
