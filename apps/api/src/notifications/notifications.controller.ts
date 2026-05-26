import { Body, Controller, Delete, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";
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

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

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
