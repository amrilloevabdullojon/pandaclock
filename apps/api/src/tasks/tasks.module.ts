import { Module } from "@nestjs/common";
import { TasksService } from "./tasks.service.js";
import { TasksController } from "./tasks.controller.js";
import { TaskAttachmentsService } from "./attachments.service.js";
import { TenantModule } from "../tenant/tenant.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";

@Module({
  imports: [TenantModule, NotificationsModule],
  providers: [TasksService, TaskAttachmentsService],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}
