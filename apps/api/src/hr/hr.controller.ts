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
import {
  HrService,
  type HrDocumentRow,
  type MyHrDocument,
  type OnboardingItem,
} from "./hr.service.js";
import {
  CreateHrDocumentDto,
  CreateOnboardingItemDto,
  SeedChecklistDto,
  UpdateOnboardingItemDto,
} from "./dto/hr.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

const MANAGER_ROLES = ["OWNER", "ADMIN", "HR"];

@ApiTags("hr")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("hr")
export class HrController {
  constructor(private readonly hr: HrService) {}

  /* ───────── Онбординг/офбординг ───────── */

  @Get("onboarding")
  @Roles("OWNER", "ADMIN", "HR")
  @ApiOperation({ summary: "Чек-лист сотрудника" })
  listItems(
    @Query("userId", ParseUUIDPipe) userId: string,
    @Query("kind") kind?: string,
  ): Promise<OnboardingItem[]> {
    return this.hr.listItems(userId, kind);
  }

  @Get("onboarding/my")
  @ApiOperation({ summary: "Мой чек-лист" })
  myItems(
    @CurrentUser() user: AuthRequestUser,
    @Query("kind") kind?: string,
  ): Promise<OnboardingItem[]> {
    return this.hr.listItems(user.id, kind);
  }

  @Post("onboarding")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(201)
  createItem(
    @Body() dto: CreateOnboardingItemDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<OnboardingItem> {
    return this.hr.createItem(dto, user.id);
  }

  @Post("onboarding/seed")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(201)
  seed(
    @Body() dto: SeedChecklistDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<OnboardingItem[]> {
    return this.hr.seedChecklist(dto.userId, dto.kind, user.id);
  }

  @Patch("onboarding/:id")
  @ApiOperation({ summary: "Отметить/изменить пункт (владелец или менеджер)" })
  updateItem(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateOnboardingItemDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<OnboardingItem> {
    return this.hr.updateItem(id, dto, user.id, MANAGER_ROLES.includes(user.role));
  }

  @Delete("onboarding/:id")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(204)
  removeItem(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.hr.removeItem(id);
  }

  /* ───────── Кадровый ЭДО ───────── */

  @Get("documents")
  @Roles("OWNER", "ADMIN", "HR")
  @ApiOperation({ summary: "Все кадровые документы со статистикой подтверждений" })
  listDocuments(): Promise<HrDocumentRow[]> {
    return this.hr.listDocuments();
  }

  @Get("documents/my")
  @ApiOperation({ summary: "Мои документы на ознакомление" })
  myDocuments(@CurrentUser() user: AuthRequestUser): Promise<MyHrDocument[]> {
    return this.hr.listMyDocuments(user.id);
  }

  @Post("documents")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(201)
  createDocument(
    @Body() dto: CreateHrDocumentDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<HrDocumentRow> {
    return this.hr.createDocument(dto, user.id);
  }

  @Post("documents/:id/ack")
  @ApiOperation({ summary: "Подтвердить ознакомление (эл. подпись)" })
  acknowledge(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<{ acknowledgedAt: Date }> {
    return this.hr.acknowledge(id, user.id);
  }

  @Delete("documents/:id")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(204)
  removeDocument(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.hr.removeDocument(id);
  }
}
