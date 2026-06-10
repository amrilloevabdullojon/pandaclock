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
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AnnouncementsService, type Announcement } from "./announcements.service.js";
import { CreateAnnouncementDto, UpdateAnnouncementDto } from "./dto/announcement.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

@ApiTags("announcements")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("announcements")
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  @ApiOperation({ summary: "Лента объявлений компании" })
  list(@CurrentUser() user: AuthRequestUser): Promise<Announcement[]> {
    return this.announcements.list(user.id);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: AuthRequestUser): Promise<{ count: number }> {
    return this.announcements.unreadCount(user.id);
  }

  @Post()
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(201)
  create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<Announcement> {
    return this.announcements.create(dto, user.id);
  }

  @Patch(":id")
  @Roles("OWNER", "ADMIN", "HR")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<Announcement> {
    return this.announcements.update(id, dto, user.id);
  }

  @Delete(":id")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(204)
  remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.announcements.remove(id);
  }

  @Post(":id/read")
  @HttpCode(200)
  markRead(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<{ ok: true }> {
    return this.announcements.markRead(id, user.id);
  }
}
