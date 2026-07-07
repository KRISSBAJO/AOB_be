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

    const decimal = this.serializeDecimal(value);
    if (decimal !== null) {
      return decimal;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        this.serialize(item),
      ]),
    );
  }

  private serializeDecimal(value: object) {
    if (
      value.constructor?.name === "Decimal" &&
      "toString" in value &&
      typeof value.toString === "function"
    ) {
      return String(value);
    }

    const maybeDecimal = value as Record<string, unknown>;
    if (
      typeof maybeDecimal.s === "number" &&
      typeof maybeDecimal.e === "number" &&
      Array.isArray(maybeDecimal.d)
    ) {
      return this.decimalObjectToString(
        maybeDecimal as { s: number; e: number; d: number[] },
      );
    }

    return null;
  }

  private decimalObjectToString(value: { s: number; e: number; d: number[] }) {
    if (!value.d.length) return "0";

    const digits =
      [
        String(value.d[0]),
        ...value.d.slice(1).map((part) => String(part).padStart(7, "0")),
      ]
        .join("")
        .replace(/0+$/, "") || "0";
    const decimalAt = value.e + 1;
    let normalized: string;

    if (decimalAt <= 0) {
      normalized = `0.${"0".repeat(Math.abs(decimalAt))}${digits}`;
    } else if (decimalAt >= digits.length) {
      normalized = `${digits}${"0".repeat(decimalAt - digits.length)}`;
    } else {
      normalized = `${digits.slice(0, decimalAt)}.${digits.slice(decimalAt)}`;
    }

    return `${value.s < 0 ? "-" : ""}${normalized}`;
  }
}
