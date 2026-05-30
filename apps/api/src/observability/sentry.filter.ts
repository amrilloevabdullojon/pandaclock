import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import * as Sentry from "@sentry/node";

/**
 * Глобальный exception filter:
 *  - формирует JSON-ответ с правильным status
 *  - 5xx (или unknown) → шлёт в Sentry с контекстом (path, method, user.role)
 *  - 4xx — НЕ шлёт в Sentry (это user-error, не баг)
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<{ url?: string; method?: string; user?: { role?: string } }>();
    const response = ctx.getResponse();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttp
      ? exception.getResponse()
      : { statusCode: 500, message: "Internal server error" };

    if (status >= 500) {
      Sentry.withScope((scope) => {
        scope.setTag("path", request.url ?? "?");
        scope.setTag("method", request.method ?? "?");
        if (request.user?.role) scope.setUser({ role: request.user.role });
        Sentry.captureException(exception);
      });
      this.logger.error(
        `${request.method ?? "?"} ${request.url ?? "?"} → ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    httpAdapter.reply(response, payload, status);
  }
}
