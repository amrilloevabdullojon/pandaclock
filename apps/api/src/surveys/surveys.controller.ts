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
import {
  SurveysService,
  type ActiveSurvey,
  type RespondentSurvey,
  type Survey,
  type SurveyDetail,
  type SurveyResults,
} from "./surveys.service.js";
import { CreateSurveyDto, SubmitResponseDto, UpdateSurveyDto } from "./dto/survey.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

@ApiTags("surveys")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("surveys")
export class SurveysController {
  constructor(private readonly surveys: SurveysService) {}

  /* ───────── Прохождение (все сотрудники) ───────── */

  @Get("active")
  @ApiOperation({ summary: "Активные опросы для текущего пользователя" })
  active(@CurrentUser() user: AuthRequestUser): Promise<ActiveSurvey[]> {
    return this.surveys.listActiveForUser(user.id);
  }

  @Get(":id/fill")
  @ApiOperation({ summary: "Опрос для прохождения (вопросы + статус)" })
  fill(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<RespondentSurvey> {
    return this.surveys.getForRespondent(id, user.id);
  }

  @Post(":id/respond")
  @HttpCode(201)
  @ApiOperation({ summary: "Отправить ответы на опрос" })
  respond(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SubmitResponseDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<{ ok: true }> {
    return this.surveys.respond(id, user.id, dto);
  }

  /* ───────── Управление (OWNER/ADMIN/HR) ───────── */

  @Get()
  @Roles("OWNER", "ADMIN", "HR")
  @ApiOperation({ summary: "Все опросы" })
  list(): Promise<Survey[]> {
    return this.surveys.listSurveys();
  }

  @Post()
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(201)
  create(
    @Body() dto: CreateSurveyDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<SurveyDetail> {
    return this.surveys.createSurvey(dto, user.id);
  }

  @Get(":id")
  @Roles("OWNER", "ADMIN", "HR")
  getSurvey(@Param("id", ParseUUIDPipe) id: string): Promise<SurveyDetail> {
    return this.surveys.getSurvey(id);
  }

  @Patch(":id")
  @Roles("OWNER", "ADMIN", "HR")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateSurveyDto,
  ): Promise<SurveyDetail> {
    return this.surveys.updateSurvey(id, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(204)
  remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.surveys.removeSurvey(id);
  }

  @Get(":id/results")
  @Roles("OWNER", "ADMIN", "HR")
  @ApiOperation({ summary: "Агрегированные результаты опроса (eNPS и т.д.)" })
  results(@Param("id", ParseUUIDPipe) id: string): Promise<SurveyResults> {
    return this.surveys.getResults(id);
  }
}
