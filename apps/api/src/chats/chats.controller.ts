import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { ChatsService } from "./chats.service.js";
import { ChatUploadsService } from "./chat-uploads.service.js";
import { CreateChannelDto, SendMessageDto } from "./dto/chat.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

@ApiTags("chats")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("chats")
export class ChatsController {
  constructor(
    private readonly chats: ChatsService,
    private readonly uploads: ChatUploadsService,
  ) {}

  @Get("channels")
  channels(@CurrentUser() user: AuthRequestUser) {
    return this.chats.listChannels(user.id);
  }

  @Post("channels")
  createChannel(@Body() dto: CreateChannelDto, @CurrentUser() user: AuthRequestUser) {
    return this.chats.createChannel({
      type: dto.type,
      name: dto.name,
      departmentId: dto.departmentId,
      memberIds: dto.memberIds,
      createdById: user.id,
    });
  }

  @Get("channels/:id/messages")
  messages(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthRequestUser,
    @Query("limit") limit?: string,
  ) {
    return this.chats.listMessages(id, user.id, limit ? Number(limit) : 50);
  }

  @Post("channels/:id/messages")
  sendMessage(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthRequestUser,
  ) {
    return this.chats.sendMessage(id, user.id, dto.body, dto.attachments);
  }

  @Post("channels/:id/attachments")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 25 * 1024 * 1024 } }))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
      required: ["file"],
    },
  })
  async uploadAttachment(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile()
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    @CurrentUser() user: AuthRequestUser,
  ) {
    // Проверяем что юзер — член канала. Сама загрузка в S3 — отдельный сервис.
    await this.chats.assertMembershipPublic(id, user.id);
    return this.uploads.upload(user.tenantSlug, id, file);
  }

  @Post("channels/:id/read")
  read(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthRequestUser) {
    return this.chats.markRead(id, user.id);
  }

  // ===== Members =====

  @Get("channels/:id/members")
  members(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthRequestUser) {
    return this.chats.listMembers(id, user.id);
  }

  @Post("channels/:id/members")
  @HttpCode(204)
  async addMember(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { userId: string },
    @CurrentUser() user: AuthRequestUser,
  ): Promise<void> {
    await this.chats.addMember(id, body.userId, user.id);
  }

  @Delete("channels/:id/members/:userId")
  @HttpCode(204)
  async removeMember(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<void> {
    await this.chats.removeMember(id, userId, user.id);
  }
}
