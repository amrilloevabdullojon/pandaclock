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
import { TasksService } from "./tasks.service.js";
import { AddCommentDto, CreateTaskDto, TasksQueryDto, UpdateTaskDto } from "./dto/task.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

@ApiTags("tasks")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("tasks")
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @ApiOperation({ summary: "Список задач" })
  list(@Query() query: TasksQueryDto, @CurrentUser() user: AuthRequestUser) {
    return this.tasks.list(query, user.id);
  }

  @Get("board")
  @ApiOperation({ summary: "Канбан-доска (группировка по статусу)" })
  board(@CurrentUser() user: AuthRequestUser) {
    return this.tasks.board(user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Детали задачи" })
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.tasks.getById(id);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Создать задачу" })
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthRequestUser) {
    return this.tasks.create(dto, user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Обновить задачу или сменить статус" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthRequestUser,
  ) {
    return this.tasks.update(id, dto, user.id);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.tasks.remove(id);
  }

  @Get(":id/comments")
  comments(@Param("id", ParseUUIDPipe) id: string) {
    return this.tasks.listComments(id);
  }

  @Post(":id/comments")
  @HttpCode(201)
  async addComment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: AuthRequestUser,
  ) {
    await this.tasks.addComment(id, user.id, dto.body);
    return { ok: true };
  }
}
