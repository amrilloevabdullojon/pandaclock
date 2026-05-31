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

    // Нормализованный формат ответа: { statusCode, code, message, details? }
    // Контракт: клиенты (web/mobile) ВСЕГДА читают body.code, без вложенностей.
    const payload = normalizeErrorPayload(exception, status);

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

interface ErrorPayload {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Сводит любую Nest exception к стабильному формату ответа.
 *
 * Поддерживает три типичных формы getResponse():
 *  - string  → message только
 *  - { code, ... } → наш собственный формат с error code
 *  - { message, statusCode, ... } → стандартный Nest (ValidationPipe и пр.)
 */
function normalizeErrorPayload(exception: unknown, status: number): ErrorPayload {
  if (!(exception instanceof HttpException)) {
    return { statusCode: status, code: "INTERNAL_ERROR", message: "Internal server error" };
  }

  const raw = exception.getResponse();

  if (typeof raw === "string") {
    return { statusCode: status, code: defaultCodeFor(status), message: raw };
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const code = typeof obj.code === "string" ? obj.code : defaultCodeFor(status);
    const message =
      typeof obj.message === "string"
        ? obj.message
        : Array.isArray(obj.message)
          ? obj.message.join("; ")
          : humanMessageFor(code, status);
    const { code: _c, message: _m, statusCode: _s, ...rest } = obj;
    const details = Object.keys(rest).length > 0 ? rest : undefined;
    return { statusCode: status, code, message, ...(details ? { details } : {}) };
  }

  return { statusCode: status, code: defaultCodeFor(status), message: humanMessageFor("", status) };
}

function defaultCodeFor(status: number): string {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 422) return "UNPROCESSABLE_ENTITY";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "INTERNAL_ERROR";
  return "ERROR";
}

function humanMessageFor(code: string, status: number): string {
  if (code) return code;
  return defaultCodeFor(status);
}
