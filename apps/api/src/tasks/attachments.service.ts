import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  // images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  // docs
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // text
  "text/plain",
  "text/csv",
  // archives
  "application/zip",
  "application/x-zip-compressed",
]);

export interface AttachmentRow {
  id: string;
  taskId: string;
  url: string;
  filename: string;
  size: number;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: Date;
}

interface RawRow {
  id: string;
  task_id: string;
  url: string;
  filename: string;
  size: string | number | bigint;
  uploaded_by_id: string;
  uploaded_by_name: string;
  uploaded_at: Date;
}

/**
 * CRUD attachments к задачам.
 *
 * Файлы хранятся в S3-совместимом storage (R2/MinIO) в bucket
 * `ATTACHMENTS_BUCKET` (default «attachments») под ключом
 * `{tenantSlug}/{taskId}/{randomUUID}-{filename}`. Метаданные — в tenant-schema
 * таблице `task_attachments`.
 *
 * Удалить вложение может только его автор, либо OWNER/ADMIN/HR/MANAGER.
 */
@Injectable()
export class TaskAttachmentsService {
  private readonly logger = new Logger(TaskAttachmentsService.name);
  private readonly s3: S3Client;
  private readonly publicBase: string;
  private readonly bucket: string;

  constructor(private readonly tenantDb: TenantPrismaService) {
    const endpoint = process.env.MINIO_ENDPOINT ?? "http://localhost:9000";
    this.bucket = process.env.ATTACHMENTS_BUCKET ?? "attachments";
    // На R2 у bucket'а свой публичный URL (pub-XXX.r2.dev), без префикса bucket в пути.
    // На MinIO — один endpoint с path-style, поэтому fallback с /{bucket}.
    this.publicBase =
      process.env.MINIO_ATTACHMENTS_PUBLIC_URL ??
      (process.env.MINIO_PUBLIC_BASE
        ? `${process.env.MINIO_PUBLIC_BASE}/${this.bucket}`
        : `${endpoint}/${this.bucket}`);
    this.s3 = new S3Client({
      endpoint,
      region: "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY ?? "pandaclock",
        secretAccessKey: process.env.MINIO_SECRET_KEY ?? "pandaclockdev",
      },
    });
  }

  async list(taskId: string): Promise<AttachmentRow[]> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<RawRow[]>(
      `SELECT a.id, a.task_id, a.url, a.filename, a.size,
              a.uploaded_by_id, a.uploaded_at,
              COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.email) AS uploaded_by_name
       FROM task_attachments a
       LEFT JOIN users u ON u.id = a.uploaded_by_id
       WHERE a.task_id = $1::uuid
       ORDER BY a.uploaded_at DESC`,
      taskId,
    );
    return rows.map((r) => ({
      id: r.id,
      taskId: r.task_id,
      url: r.url,
      filename: r.filename,
      size: typeof r.size === "bigint" ? Number(r.size) : Number(r.size),
      uploadedById: r.uploaded_by_id,
      uploadedByName: r.uploaded_by_name,
      uploadedAt: r.uploaded_at,
    }));
  }

  async upload(
    taskId: string,
    userId: string,
    tenantSlug: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
  ): Promise<AttachmentRow> {
    if (file.size <= 0) {
      throw new BadRequestException({ code: "EMPTY_FILE" });
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException({
        code: "FILE_TOO_LARGE",
        message: `Максимальный размер — ${Math.floor(MAX_BYTES / 1024 / 1024)} MB`,
      });
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException({
        code: "INVALID_MIME",
        message: "Тип файла не поддерживается",
      });
    }

    // Проверка существования задачи + защита от чужого tenant: TenantPrismaService уже
    // даёт search_path под tenant пользователя, так что SELECT увидит только свои задачи.
    const client = await this.tenantDb.getClient();
    const taskRows = await client.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM tasks WHERE id = $1::uuid LIMIT 1`,
      taskId,
    );
    if (taskRows.length === 0) {
      throw new NotFoundException({ code: "TASK_NOT_FOUND" });
    }

    // Безопасное имя — оставляем оригинальное для отображения, но в S3 key добавляем UUID
    // чтобы избежать коллизий и фейковых путей вроде «../../foo».
    const safeFilename = sanitizeFilename(file.originalname);
    const objectKey = `${tenantSlug}/${taskId}/${randomUUID()}-${safeFilename}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentDisposition: `inline; filename="${encodeURIComponent(safeFilename)}"`,
          ACL: "public-read",
        }),
      );
    } catch (error) {
      this.logger.error({ err: error }, "failed to put attachment to S3");
      throw new BadRequestException({
        code: "UPLOAD_FAILED",
        message: "Не удалось загрузить файл",
      });
    }

    // publicBase уже включает /{bucket} (MinIO) или это bucket-domain (R2).
    const url = `${this.publicBase}/${objectKey}`;

    const inserted = await client.$queryRawUnsafe<RawRow[]>(
      `INSERT INTO task_attachments (task_id, url, filename, size, uploaded_by_id)
       VALUES ($1::uuid, $2, $3, $4::bigint, $5::uuid)
       RETURNING id, task_id, url, filename, size, uploaded_by_id, uploaded_at,
         (SELECT COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), email)
          FROM users WHERE id = $5::uuid) AS uploaded_by_name`,
      taskId,
      url,
      safeFilename,
      file.size,
      userId,
    );
    const row = inserted[0];
    if (!row) {
      throw new BadRequestException({ code: "INSERT_FAILED" });
    }
    return {
      id: row.id,
      taskId: row.task_id,
      url: row.url,
      filename: row.filename,
      size: typeof row.size === "bigint" ? Number(row.size) : Number(row.size),
      uploadedById: row.uploaded_by_id,
      uploadedByName: row.uploaded_by_name,
      uploadedAt: row.uploaded_at,
    };
  }

  async remove(attachmentId: string, userId: string, role: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<
      {
        id: string;
        url: string;
        uploaded_by_id: string;
      }[]
    >(
      `SELECT id, url, uploaded_by_id FROM task_attachments WHERE id = $1::uuid LIMIT 1`,
      attachmentId,
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException({ code: "ATTACHMENT_NOT_FOUND" });
    }
    const privileged = ["OWNER", "ADMIN", "HR", "MANAGER"].includes(role);
    if (row.uploaded_by_id !== userId && !privileged) {
      throw new ForbiddenException({ code: "NOT_ALLOWED" });
    }

    // Попытка удалить из S3 — если упадёт, всё равно удаляем из БД,
    // чтобы метаданные не висели «фантомом». S3 cleanup можно сделать кроном.
    try {
      const key = extractKeyFromUrl(row.url, this.publicBase);
      if (key) {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      }
    } catch (error) {
      this.logger.warn({ err: error }, "failed to delete object from S3");
    }

    await client.$executeRawUnsafe(
      `DELETE FROM task_attachments WHERE id = $1::uuid`,
      attachmentId,
    );
  }
}

function sanitizeFilename(name: string): string {
  // Запрещаем path traversal и подозрительные символы.
  const base = name.replace(/^.*[\\/]/, ""); // отрезаем путь
  return base.replace(/[^\w.\-А-Яа-яЁё ]/g, "_").slice(0, 200) || "file";
}

function extractKeyFromUrl(url: string, publicBase: string): string | null {
  const prefix = `${publicBase}/`;
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length);
}
