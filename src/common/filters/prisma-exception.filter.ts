import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Response } from "express";

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const mappedException = this.mapException(exception);
    const status = mappedException.getStatus();

    response.status(status).json({
      statusCode: status,
      message: mappedException.message,
      error: mappedException.name,
      ...("code" in exception ? { prismaCode: exception.code } : {}),
    });
  }

  private mapException(
    exception:
      Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
  ) {
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return new BadRequestException("Invalid request payload");
    }

    switch (exception.code) {
      case "P2002":
        return new ConflictException(
          "A record with this unique value already exists",
        );
      case "P2025":
        return new NotFoundException("Record not found");
      default:
        return new InternalServerErrorException(exception.message);
    }
  }
}
