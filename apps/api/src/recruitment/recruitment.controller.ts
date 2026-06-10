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
  RecruitmentService,
  type Candidate,
  type RecruitmentAnalytics,
  type Vacancy,
} from "./recruitment.service.js";
import {
  CreateCandidateDto,
  CreateVacancyDto,
  UpdateCandidateDto,
  UpdateCandidateStageDto,
  UpdateVacancyDto,
} from "./dto/recruitment.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

@ApiTags("recruitment")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("recruitment")
export class RecruitmentController {
  constructor(private readonly recruitment: RecruitmentService) {}

  @Get("analytics")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @ApiOperation({ summary: "Аналитика найма (воронка, источники, time-to-hire)" })
  analytics(): Promise<RecruitmentAnalytics> {
    return this.recruitment.analytics();
  }

  /* ───────── Вакансии ───────── */

  @Get("vacancies")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @ApiOperation({ summary: "Список вакансий" })
  listVacancies(@Query("status") status?: string): Promise<Vacancy[]> {
    return this.recruitment.listVacancies(status);
  }

  @Get("vacancies/:id")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  getVacancy(@Param("id", ParseUUIDPipe) id: string): Promise<Vacancy> {
    return this.recruitment.getVacancy(id);
  }

  @Post("vacancies")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(201)
  createVacancy(
    @Body() dto: CreateVacancyDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<Vacancy> {
    return this.recruitment.createVacancy(dto, user.id);
  }

  @Patch("vacancies/:id")
  @Roles("OWNER", "ADMIN", "HR")
  updateVacancy(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateVacancyDto,
  ): Promise<Vacancy> {
    return this.recruitment.updateVacancy(id, dto);
  }

  @Delete("vacancies/:id")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(204)
  removeVacancy(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.recruitment.removeVacancy(id);
  }

  /* ───────── Кандидаты ───────── */

  @Get("vacancies/:id/candidates")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @ApiOperation({ summary: "Кандидаты по вакансии (воронка)" })
  listCandidates(@Param("id", ParseUUIDPipe) id: string): Promise<Candidate[]> {
    return this.recruitment.listCandidates(id);
  }

  @Post("vacancies/:id/candidates")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(201)
  createCandidate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateCandidateDto,
  ): Promise<Candidate> {
    return this.recruitment.createCandidate(id, dto);
  }

  @Patch("candidates/:id")
  @Roles("OWNER", "ADMIN", "HR")
  updateCandidate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateDto,
  ): Promise<Candidate> {
    return this.recruitment.updateCandidate(id, dto);
  }

  @Patch("candidates/:id/stage")
  @Roles("OWNER", "ADMIN", "HR")
  @ApiOperation({ summary: "Сменить стадию кандидата (drag в воронке)" })
  setStage(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateStageDto,
  ): Promise<Candidate> {
    return this.recruitment.setStage(id, dto.stage);
  }

  @Delete("candidates/:id")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(204)
  removeCandidate(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.recruitment.removeCandidate(id);
  }
}
