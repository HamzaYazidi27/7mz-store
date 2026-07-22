import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

interface ErrorBody {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, string[]>;
  path: string;
  timestamp: string;
}

/**
 * Global exception filter — one consistent error envelope for every failure.
 * 5xx responses are logged with full stack; 4xx pass through quietly.
 * Internal error details are never leaked to clients in production.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Something went wrong on our side";
    let error = "Internal Server Error";
    let details: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === "string") {
        message = payload;
        error = exception.name;
      } else if (typeof payload === "object" && payload !== null) {
        const body = payload as Record<string, unknown>;
        error = (body.error as string) ?? exception.name;

        // class-validator returns message: string[]
        if (Array.isArray(body.message)) {
          message = "Validation failed";
          details = { _errors: body.message as string[] };
        } else {
          message = (body.message as string) ?? exception.message;
        }
        if (body.details && typeof body.details === "object") {
          details = body.details as Record<string, string[]>;
        }
      }
    } else if (exception instanceof Error) {
      // Unexpected error — log everything, expose nothing.
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}: ${
          exception instanceof Error ? exception.message : String(exception)
        }`,
      );
    }

    const body: ErrorBody = {
      statusCode: status,
      message,
      error,
      ...(details ? { details } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }
}
