import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ChatsService } from "./chats.service.js";
import { CreateChannelDto, SendMessageDto } from "./dto/chat.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

@ApiTags("chats")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("chats")
export class ChatsController {
  constructor(private readonly chats: ChatsService) {}

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
    return this.chats.sendMessage(id, user.id, dto.body);
  }

  @Post("channels/:id/read")
  read(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthRequestUser) {
    return this.chats.markRead(id, user.id);
  }
}
