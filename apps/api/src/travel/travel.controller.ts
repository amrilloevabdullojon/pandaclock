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
  TravelService,
  type BusinessTrip,
  type BusinessTripDetail,
  type Expense,
  type Scope,
} from "./travel.service.js";
import {
  CreateBusinessTripDto,
  CreateExpenseDto,
  DecisionDto,
  UpdateBusinessTripDto,
  UpdateExpenseDto,
} from "./dto/travel.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

const APPROVER_ROLES = ["OWNER", "ADMIN", "HR", "MANAGER"];

function canApprove(user: AuthRequestUser): boolean {
  return APPROVER_ROLES.includes(user.role);
}

@ApiTags("travel")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("travel")
export class TravelController {
  constructor(private readonly travel: TravelService) {}

  /* ───────── Командировки ───────── */

  @Get("trips")
  @ApiOperation({ summary: "Список командировок (scope: my | team | all)" })
  listTrips(
    @Query("scope") scope: Scope = "my",
    @CurrentUser() user: AuthRequestUser,
  ): Promise<BusinessTrip[]> {
    return this.travel.listTrips(scope, user.id, canApprove(user));
  }

  @Get("trips/:id")
  getTrip(@Param("id", ParseUUIDPipe) id: string): Promise<BusinessTripDetail> {
    return this.travel.getTrip(id);
  }

  @Post("trips")
  @HttpCode(201)
  createTrip(
    @Body() dto: CreateBusinessTripDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<BusinessTripDetail> {
    return this.travel.createTrip(dto, user.id);
  }

  @Patch("trips/:id")
  updateTrip(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateBusinessTripDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<BusinessTripDetail> {
    return this.travel.updateTrip(id, dto, user.id);
  }

  @Post("trips/:id/submit")
  @ApiOperation({ summary: "Отправить командировку на одобрение" })
  submitTrip(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<BusinessTripDetail> {
    return this.travel.submitTrip(id, user.id);
  }

  @Post("trips/:id/decide")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @ApiOperation({ summary: "Одобрить/отклонить командировку" })
  decideTrip(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DecisionDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<BusinessTripDetail> {
    return this.travel.decideTrip(
      id,
      user.id,
      dto.decision as "APPROVED" | "REJECTED",
      dto.comment,
    );
  }

  @Delete("trips/:id")
  @HttpCode(204)
  removeTrip(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<void> {
    return this.travel.removeTrip(id, user.id, canApprove(user));
  }

  /* ───────── Расходы ───────── */

  @Get("expenses")
  @ApiOperation({ summary: "Список расходов (scope: my | team | all)" })
  listExpenses(
    @Query("scope") scope: Scope = "my",
    @Query("tripId") tripId: string | undefined,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<Expense[]> {
    return this.travel.listExpenses(scope, user.id, canApprove(user), tripId);
  }

  @Post("expenses")
  @HttpCode(201)
  createExpense(
    @Body() dto: CreateExpenseDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<Expense> {
    return this.travel.createExpense(dto, user.id);
  }

  @Patch("expenses/:id")
  updateExpense(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<Expense> {
    return this.travel.updateExpense(id, dto, user.id);
  }

  @Post("expenses/:id/decide")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @ApiOperation({ summary: "Одобрить/отклонить расход" })
  decideExpense(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DecisionDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<Expense> {
    return this.travel.decideExpense(
      id,
      user.id,
      dto.decision as "APPROVED" | "REJECTED",
      dto.comment,
    );
  }

  @Delete("expenses/:id")
  @HttpCode(204)
  removeExpense(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<void> {
    return this.travel.removeExpense(id, user.id, canApprove(user));
  }
}
