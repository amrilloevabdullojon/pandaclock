import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly s3: S3Client;
  private readonly endpoint: string;
  private readonly publicBase: string;

  constructor(private readonly tenantDb: TenantPrismaService) {
    this.endpoint = process.env.MINIO_ENDPOINT ?? "http://localhost:9000";
    // Для браузера/мобайла нужен hostname, который видит клиент:
    // На R2 каждый bucket имеет свой публичный URL (pub-XXX.r2.dev) без префикса.
    // На MinIO (local) — один endpoint с path-style, поэтому fallback на старое поведение.
    this.publicBase =
      process.env.MINIO_AVATARS_PUBLIC_URL ??
      (process.env.MINIO_PUBLIC_BASE
        ? `${process.env.MINIO_PUBLIC_BASE}/avatars`
        : `${this.endpoint}/avatars`);
    this.s3 = new S3Client({
      endpoint: this.endpoint,
      region: "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY ?? "pandaclock",
        secretAccessKey: process.env.MINIO_SECRET_KEY ?? "pandaclockdev",
      },
    });
  }

  /**
   * Загружает аватар пользователя:
   * 1. Валидация MIME + size
   * 2. Resize до 512x512 + конверт в WebP (≈40-80kb)
   * 3. PUT в bucket `avatars` под ключом `{tenantSlug}/{userId}.webp`
   * 4. Update users.avatar_url
   * 5. Возвращает публичный URL
   */
  async uploadAvatar(
    userId: string,
    tenantSlug: string,
    file: { buffer: Buffer; mimetype: string; size: number },
  ): Promise<{ avatarUrl: string }> {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException({
        code: "INVALID_MIME",
        message: "Поддерживаются только JPEG, PNG и WebP",
      });
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException({
        code: "FILE_TOO_LARGE",
        message: `Максимальный размер — ${Math.floor(MAX_BYTES / 1024 / 1024)} MB`,
      });
    }

    // Resize + конверт в webp
    let resized: Buffer;
    try {
      resized = await sharp(file.buffer)
        .resize(512, 512, { fit: "cover", position: "center" })
        .webp({ quality: 85 })
        .toBuffer();
    } catch (error) {
      this.logger.error({ err: error }, "failed to resize avatar");
      throw new BadRequestException({
        code: "INVALID_IMAGE",
        message: "Не удалось обработать изображение",
      });
    }

    // Random suffix чтобы сбрасывать кэш браузера при перезагрузке
    const suffix = randomUUID().slice(0, 8);
    const key = `${tenantSlug}/${userId}-${suffix}.webp`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: "avatars",
        Key: key,
        Body: resized,
        ContentType: "image/webp",
        ACL: "public-read",
      }),
    );

    // publicBase уже включает /avatars при MinIO, или это сам bucket-domain для R2.
    const avatarUrl = `${this.publicBase}/${key}`;

    // Обновляем users.avatar_url
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE users SET avatar_url = $2, updated_at = NOW() WHERE id = $1::uuid`,
      userId,
      avatarUrl,
    );

    return { avatarUrl };
  }
}
