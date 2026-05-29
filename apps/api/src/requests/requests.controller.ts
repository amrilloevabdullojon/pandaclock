import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequestsService } from "./requests.service.js";
import { CreateLeaveRequestDto, DecideLeaveRequestDto } from "./dto/leave-request.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

@ApiTags("requests")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("requests")
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  @ApiOperation({ summary: "Список заявок (scope: my | team | all)" })
  list(@Query("scope") scope: "my" | "team" | "all" = "my", @CurrentUser() user: AuthRequestUser) {
    return this.requests.list(scope, user.id);
  }

  @Get("balance")
  balance(@CurrentUser() user: AuthRequestUser) {
    return this.requests.balance(user.id);
  }

  @Get(":id")
  detail(@Param("id", ParseUUIDPipe) id: string) {
    return this.requests.getById(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateLeaveRequestDto, @CurrentUser() user: AuthRequestUser) {
    return this.requests.create(dto, user.id);
  }

  @Post(":id/approve")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  approve(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DecideLeaveRequestDto,
    @CurrentUser() user: AuthRequestUser,
  ) {
    return this.requests.approve(id, user.id, dto.comment);
  }

  @Post(":id/reject")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  reject(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DecideLeaveRequestDto,
    @CurrentUser() user: AuthRequestUser,
  ) {
    return this.requests.reject(id, user.id, dto.comment);
  }

  @Post(":id/cancel")
  cancel(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthRequestUser) {
    return this.requests.cancel(id, user.id);
  }

  @Post("bulk/approve")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  bulkApprove(
    @Body() dto: { ids: string[]; comment?: string },
    @CurrentUser() user: AuthRequestUser,
  ) {
    return this.requests.bulkDecide(dto.ids, user.id, "APPROVED", dto.comment);
  }

  @Post("bulk/reject")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  bulkReject(
    @Body() dto: { ids: string[]; comment?: string },
    @CurrentUser() user: AuthRequestUser,
  ) {
    return this.requests.bulkDecide(dto.ids, user.id, "REJECTED", dto.comment);
  }
}
