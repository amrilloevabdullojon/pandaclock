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
import { PerformanceService, type GoalRow, type ReviewRow } from "./performance.service.js";
import {
  CreateGoalDto,
  CreateReviewDto,
  UpdateGoalDto,
  UpdateProgressDto,
  UpdateReviewDto,
} from "./dto/performance.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

@ApiTags("performance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("performance")
export class PerformanceController {
  constructor(private readonly performance: PerformanceService) {}

  /* ───────── Goals ───────── */

  @Get("goals")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @ApiOperation({ summary: "Все цели (опц. фильтр по сотруднику)" })
  listGoals(@Query("userId") userId?: string): Promise<GoalRow[]> {
    return this.performance.listGoals(userId);
  }

  @Get("goals/my")
  @ApiOperation({ summary: "Мои цели" })
  myGoals(@CurrentUser() user: AuthRequestUser): Promise<GoalRow[]> {
    return this.performance.listMyGoals(user.id);
  }

  @Post("goals")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @HttpCode(201)
  createGoal(@Body() dto: CreateGoalDto, @CurrentUser() user: AuthRequestUser): Promise<GoalRow> {
    return this.performance.createGoal(dto, user.id);
  }

  @Patch("goals/:id")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  updateGoal(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateGoalDto): Promise<GoalRow> {
    return this.performance.updateGoal(id, dto);
  }

  @Patch("goals/:id/progress")
  @ApiOperation({ summary: "Обновить прогресс своей цели" })
  updateProgress(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgressDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<GoalRow> {
    return this.performance.updateOwnProgress(id, user.id, dto.progress);
  }

  @Delete("goals/:id")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @HttpCode(204)
  removeGoal(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.performance.removeGoal(id);
  }

  /* ───────── Reviews ───────── */

  @Get("reviews")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @ApiOperation({ summary: "Оценки (опц. фильтр по сотруднику)" })
  listReviews(@Query("userId") userId?: string): Promise<ReviewRow[]> {
    return this.performance.listReviews(userId);
  }

  @Get("reviews/my")
  @ApiOperation({ summary: "Мои оценки" })
  myReviews(@CurrentUser() user: AuthRequestUser): Promise<ReviewRow[]> {
    return this.performance.listMyReviews(user.id);
  }

  @Post("reviews")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @HttpCode(201)
  createReview(
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<ReviewRow> {
    return this.performance.createReview(dto, user.id);
  }

  @Patch("reviews/:id")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  updateReview(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ): Promise<ReviewRow> {
    return this.performance.updateReview(id, dto);
  }

  @Delete("reviews/:id")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @HttpCode(204)
  removeReview(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.performance.removeReview(id);
  }
}
