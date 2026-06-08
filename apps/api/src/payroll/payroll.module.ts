import { Module } from "@nestjs/common";
import { PayrollService } from "./payroll.service.js";
import { PayrollController } from "./payroll.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { ExportService } from "../reports/export.service.js";

@Module({
  imports: [TenantModule, NotificationsModule],
  providers: [PayrollService, ExportService],
  controllers: [PayrollController],
  exports: [PayrollService],
})
export class PayrollModule {}
