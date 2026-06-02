import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB — чаты допускают чуть больше (видео-сообщения)
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "audio/mpeg",
  "audio/mp4",
  "audio/webm",
  "video/mp4",
  "video/webm",
]);

export interface ChatAttachmentMeta {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

/**
 * Загрузка файла в S3 для прикрепления к чат-сообщению.
 *
 * В отличие от task attachments, мы НЕ сохраняем метаданные отдельной таблицей —
 * они попадают в `chat_messages.attachments` JSONB через ChatsService.sendMessage.
 * Поэтому здесь только S3-часть.
 */
@Injectable()
export class ChatUploadsService {
  private readonly logger = new Logger(ChatUploadsService.name);
  private readonly s3: S3Client;
  private readonly publicBase: string;
  private readonly bucket: string;

  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT ?? "http://localhost:9000";
    this.bucket = process.env.ATTACHMENTS_BUCKET ?? "attachments";
    // Тот же bucket что и task attachments — переиспользуем MINIO_ATTACHMENTS_PUBLIC_URL.
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

  async upload(
    tenantSlug: string,
    channelId: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
  ): Promise<ChatAttachmentMeta> {
    if (file.size <= 0) {
      throw new BadRequestException({ code: "EMPTY_FILE" });
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException({
        code: "FILE_TOO_LARGE",
        message: `Максимум ${Math.floor(MAX_BYTES / 1024 / 1024)} МБ`,
      });
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException({
        code: "INVALID_MIME",
        message: "Тип файла не поддерживается",
      });
    }

    const safeFilename = sanitizeFilename(file.originalname);
    const key = `${tenantSlug}/chat/${channelId}/${randomUUID()}-${safeFilename}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentDisposition: `inline; filename="${encodeURIComponent(safeFilename)}"`,
          ACL: "public-read",
        }),
      );
    } catch (error) {
      this.logger.error({ err: error }, "failed to upload chat attachment");
      throw new BadRequestException({ code: "UPLOAD_FAILED" });
    }

    return {
      url: `${this.publicBase}/${key}`,
      filename: safeFilename,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/^.*[\\/]/, "");
  return base.replace(/[^\w.\-А-Яа-яЁё ]/g, "_").slice(0, 200) || "file";
}
