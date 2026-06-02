import { Module } from "@nestjs/common";
import { TasksService } from "./tasks.service.js";
import { TasksController } from "./tasks.controller.js";
import { TaskAttachmentsService } from "./attachments.service.js";
import { SubtasksService } from "./subtasks.service.js";
import { TenantModule } from "../tenant/tenant.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";

@Module({
  imports: [TenantModule, NotificationsModule],
  providers: [TasksService, TaskAttachmentsService, SubtasksService],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}
