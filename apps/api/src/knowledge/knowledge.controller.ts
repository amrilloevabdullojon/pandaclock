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
  KnowledgeService,
  type Article,
  type Course,
  type CourseDetail,
} from "./knowledge.service.js";
import {
  CreateArticleDto,
  CreateCourseDto,
  UpdateArticleDto,
  UpdateCourseDto,
} from "./dto/knowledge.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

const WRITE_ROLES = ["OWNER", "ADMIN", "HR"];

function canWrite(user: AuthRequestUser): boolean {
  return WRITE_ROLES.includes(user.role);
}

@ApiTags("knowledge")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("knowledge")
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  /* ───────── База знаний ───────── */

  @Get("articles")
  @ApiOperation({ summary: "Статьи базы знаний (черновики видят только редакторы)" })
  listArticles(
    @CurrentUser() user: AuthRequestUser,
    @Query("category") category?: string,
    @Query("q") q?: string,
  ): Promise<Article[]> {
    return this.knowledge.listArticles(canWrite(user), category, q);
  }

  @Get("articles/:id")
  getArticle(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<Article> {
    return this.knowledge.getArticle(id, canWrite(user));
  }

  @Post("articles")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(201)
  createArticle(
    @Body() dto: CreateArticleDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<Article> {
    return this.knowledge.createArticle(dto, user.id);
  }

  @Patch("articles/:id")
  @Roles("OWNER", "ADMIN", "HR")
  updateArticle(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleDto,
  ): Promise<Article> {
    return this.knowledge.updateArticle(id, dto);
  }

  @Delete("articles/:id")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(204)
  removeArticle(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.knowledge.removeArticle(id);
  }

  /* ───────── LMS: курсы ───────── */

  @Get("courses")
  @ApiOperation({ summary: "Курсы (черновики видят только редакторы) + мой прогресс" })
  listCourses(@CurrentUser() user: AuthRequestUser): Promise<Course[]> {
    return this.knowledge.listCourses(user.id, canWrite(user));
  }

  @Get("courses/:id")
  getCourse(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<CourseDetail> {
    return this.knowledge.getCourse(id, user.id, canWrite(user));
  }

  @Post("courses")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(201)
  createCourse(
    @Body() dto: CreateCourseDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<CourseDetail> {
    return this.knowledge.createCourse(dto, user.id);
  }

  @Patch("courses/:id")
  @Roles("OWNER", "ADMIN", "HR")
  updateCourse(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<CourseDetail> {
    return this.knowledge.updateCourse(id, dto, user.id);
  }

  @Delete("courses/:id")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(204)
  removeCourse(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.knowledge.removeCourse(id);
  }

  @Post("courses/:id/enroll")
  @HttpCode(201)
  @ApiOperation({ summary: "Записаться на курс" })
  enroll(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<CourseDetail> {
    return this.knowledge.enroll(id, user.id);
  }

  @Post("courses/:id/lessons/:lessonId/complete")
  @ApiOperation({ summary: "Отметить урок пройденным" })
  completeLesson(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<CourseDetail> {
    return this.knowledge.completeLesson(id, lessonId, user.id);
  }
}
