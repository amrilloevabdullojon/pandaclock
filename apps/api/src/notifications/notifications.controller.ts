import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsBooleanString, IsIn, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { NotificationsService } from "./notifications.service.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

class RegisterPushDto {
  @IsString()
  token!: string;

  @IsIn(["ios", "android", "web"])
  platform!: "ios" | "android" | "web";
}

class UnregisterPushDto {
  @IsString()
  token!: string;
}

class ListNotificationsQuery {
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsBooleanString()
  onlyUnread?: string;
}

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /* ───────── In-app ───────── */

  @Get()
  @ApiOperation({ summary: "Список уведомлений с курсорной пагинацией" })
  list(@CurrentUser() user: AuthRequestUser, @Query() q: ListNotificationsQuery) {
    return this.notifications.list(user.id, {
      limit: q.limit,
      cursor: q.cursor,
      onlyUnread: q.onlyUnread === "true",
    });
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Число непрочитанных" })
  async unreadCount(@CurrentUser() user: AuthRequestUser) {
    const count = await this.notifications.unreadCount(user.id);
    return { count };
  }

  @Patch(":id/read")
  @HttpCode(204)
  @ApiOperation({ summary: "Пометить уведомление прочитанным" })
  markRead(
    @CurrentUser() user: AuthRequestUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.notifications.markRead(user.id, id);
  }

  @Post("mark-all-read")
  @ApiOperation({ summary: "Пометить все прочитанными" })
  markAllRead(@CurrentUser() user: AuthRequestUser) {
    return this.notifications.markAllRead(user.id);
  }

  /* ───────── Push tokens ───────── */

  @Post("push/register")
  @HttpCode(204)
  register(@Body() dto: RegisterPushDto, @CurrentUser() user: AuthRequestUser): Promise<void> {
    return this.notifications.registerToken(user.id, dto.token, dto.platform);
  }

  @Delete("push")
  @HttpCode(204)
  unregister(@Body() dto: UnregisterPushDto, @CurrentUser() user: AuthRequestUser): Promise<void> {
    return this.notifications.unregisterToken(user.id, dto.token);
  }
}
