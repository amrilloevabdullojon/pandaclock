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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TasksService } from "./tasks.service.js";
import { TaskAttachmentsService } from "./attachments.service.js";
import { SubtasksService } from "./subtasks.service.js";
import {
  AddCommentDto,
  CreateSubtaskDto,
  CreateTaskDto,
  TasksQueryDto,
  UpdateSubtaskDto,
  UpdateTaskDto,
} from "./dto/task.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

@ApiTags("tasks")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("tasks")
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly attachments: TaskAttachmentsService,
    private readonly subtasks: SubtasksService,
  ) {}

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

  // ===== Attachments =====

  @Get(":id/attachments")
  @ApiOperation({ summary: "Список вложений задачи" })
  listAttachments(@Param("id", ParseUUIDPipe) id: string) {
    return this.attachments.list(id);
  }

  @Post(":id/attachments")
  @HttpCode(201)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: "Загрузить вложение (до 10 MB)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
      required: ["file"],
    },
  })
  uploadAttachment(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile()
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    @CurrentUser() user: AuthRequestUser,
  ) {
    return this.attachments.upload(id, user.id, user.tenantSlug, file);
  }

  @Delete(":id/attachments/:attachmentId")
  @HttpCode(204)
  removeAttachment(
    @Param("id", ParseUUIDPipe) _id: string,
    @Param("attachmentId", ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: AuthRequestUser,
  ) {
    return this.attachments.remove(attachmentId, user.id, user.role);
  }

  // ===== Subtasks =====

  @Get(":id/subtasks")
  @ApiOperation({ summary: "Список subtasks задачи" })
  listSubtasks(@Param("id", ParseUUIDPipe) id: string) {
    return this.subtasks.list(id);
  }

  @Post(":id/subtasks")
  @HttpCode(201)
  @ApiOperation({ summary: "Добавить subtask" })
  createSubtask(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CreateSubtaskDto) {
    return this.subtasks.create(id, dto.title);
  }

  @Patch(":id/subtasks/:subtaskId")
  @ApiOperation({ summary: "Обновить subtask (title/done/position)" })
  updateSubtask(
    @Param("id", ParseUUIDPipe) _id: string,
    @Param("subtaskId", ParseUUIDPipe) subtaskId: string,
    @Body() dto: UpdateSubtaskDto,
  ) {
    return this.subtasks.update(subtaskId, dto);
  }

  @Delete(":id/subtasks/:subtaskId")
  @HttpCode(204)
  removeSubtask(
    @Param("id", ParseUUIDPipe) _id: string,
    @Param("subtaskId", ParseUUIDPipe) subtaskId: string,
  ) {
    return this.subtasks.remove(subtaskId);
  }
}
