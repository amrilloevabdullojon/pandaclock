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
import { AssetsService, type Asset, type AssetDetail } from "./assets.service.js";
import { AssignAssetDto, CreateAssetDto, ReturnAssetDto, UpdateAssetDto } from "./dto/asset.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

@ApiTags("assets")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("assets")
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get("my")
  @ApiOperation({ summary: "Активы, закреплённые за мной" })
  my(@CurrentUser() user: AuthRequestUser): Promise<Asset[]> {
    return this.assets.listMy(user.id);
  }

  @Get()
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @ApiOperation({ summary: "Инвентарь (фильтры: status, category, assignedTo, q)" })
  list(
    @Query("status") status?: string,
    @Query("category") category?: string,
    @Query("assignedTo") assignedTo?: string,
    @Query("q") q?: string,
  ): Promise<Asset[]> {
    return this.assets.list({ status, category, assignedTo, q });
  }

  @Post()
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(201)
  create(@Body() dto: CreateAssetDto): Promise<AssetDetail> {
    return this.assets.create(dto);
  }

  @Get(":id")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  getById(@Param("id", ParseUUIDPipe) id: string): Promise<AssetDetail> {
    return this.assets.getById(id);
  }

  @Patch(":id")
  @Roles("OWNER", "ADMIN", "HR")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ): Promise<AssetDetail> {
    return this.assets.update(id, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(204)
  remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.assets.remove(id);
  }

  @Post(":id/assign")
  @Roles("OWNER", "ADMIN", "HR")
  @ApiOperation({ summary: "Выдать актив сотруднику" })
  assign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignAssetDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<AssetDetail> {
    return this.assets.assign(id, dto.userId, user.id, dto.note);
  }

  @Post(":id/return")
  @Roles("OWNER", "ADMIN", "HR")
  @ApiOperation({ summary: "Принять актив обратно" })
  returnAsset(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReturnAssetDto,
  ): Promise<AssetDetail> {
    return this.assets.returnAsset(id, dto.note);
  }
}
