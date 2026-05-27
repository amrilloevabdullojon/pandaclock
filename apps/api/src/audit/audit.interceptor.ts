import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import type { Request } from "express";
import { Observable, tap } from "rxjs";
import { PrismaClient } from "@pandaclock/db";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

/**
 * Записывает в tenant.audit_log каждую успешную мутацию (POST/PATCH/PUT/DELETE).
 *
 * Зарегистрирован как APP_INTERCEPTOR (singleton scope) — поэтому держит собственный
 * PrismaClient и явно переключает search_path при каждой записи.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  private readonly prisma = new PrismaClient();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<
      Request & { user?: AuthRequestUser; tenant?: { slug: string; schemaName: string } }
    >();
    const method = request.method;
    const isMutation = method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE";

    const logger = this.logger;
    const prisma = this.prisma;

    return next.handle().pipe(
      tap((responseBody) => {
        if (!isMutation || !request.tenant || !request.user) return;

        const entityType = extractEntityType(request.url);
        const entityId = extractEntityId(responseBody, request);
        const ip = request.ip ?? null;
        const userAgent = (request.headers["user-agent"] as string | undefined) ?? null;
        const action = `${method} ${normalizePath(request.url)}`;
        const schemaName = request.tenant.schemaName;
        const userId = request.user.id;
        const changes = request.body;

        void writeAudit(prisma, schemaName, userId, action, entityType, entityId, changes, ip, userAgent).catch(
          (error: unknown) => logger.warn({ err: error }, "audit log write failed"),
        );
      }),
    );
  }
}

async function writeAudit(
  prisma: PrismaClient,
  schemaName: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  changes: unknown,
  ip: string | null,
  userAgent: string | null,
): Promise<void> {
  if (!/^tenant_[a-z][a-z0-9_]*$/.test(schemaName)) return;
  await prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}"`);
  await prisma.$executeRawUnsafe(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, changes, ip_address, user_agent)
     VALUES ($1::uuid, $2, $3, $4::uuid, $5::jsonb, $6::inet, $7)`,
    userId,
    action,
    entityType,
    entityId,
    JSON.stringify(changes ?? {}),
    ip,
    userAgent,
  );
}

function extractEntityType(url: string): string {
  const path = url.split("?")[0] ?? "";
  const parts = path.split("/").filter(Boolean);
  return parts[2] ?? "unknown";
}

function extractEntityId(responseBody: unknown, request: Request): string | null {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const path = request.url.split("?")[0] ?? "";
  const parts = path.split("/").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const seg = parts[i] ?? "";
    if (uuidRe.test(seg)) return seg;
  }
  if (responseBody && typeof responseBody === "object" && "id" in responseBody) {
    const id = (responseBody as { id?: unknown }).id;
    if (typeof id === "string" && uuidRe.test(id)) return id;
  }
  return null;
}

function normalizePath(url: string): string {
  return (url.split("?")[0] ?? "").replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ":id",
  );
}
