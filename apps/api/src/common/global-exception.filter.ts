import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * WHY: Global exception filter prevents internal error details from leaking
 * to clients. Without this, NestJS default error handling returns err.message
 * which can expose database errors, Slack/GitHub API internals, and stack traces.
 * Full error details are logged server-side only.
 * See: https://docs.nestjs.com/exception-filters#catch-everything
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.id ?? 'unknown';

    // WHY: HttpExceptions (thrown by guards, validators, controllers) are
    // intentional — their messages are safe to return to clients.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Log 5xx server errors with full details + request ID for correlation
      if (status >= 500) {
        this.logger.error(
          `[${requestId}] ${request.method} ${request.url} — ${status}`,
          exception.stack,
        );
      }

      response.status(status).json(
        typeof exceptionResponse === 'string'
          ? { statusCode: status, message: exceptionResponse }
          : exceptionResponse,
      );
      return;
    }

    // WHY: Unhandled exceptions (thrown by services, DB errors, external API
    // failures) are not safe to return. Log full details, return generic message.
    this.logger.error(
      `[${requestId}] ${request.method} ${request.url} — Unhandled exception`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An internal error occurred. Please try again later.',
    });
  }
}
