import { Module } from "@nestjs/common";
import { ReportsService } from "./reports.service.js";
import { ExportService } from "./export.service.js";
import { ReportsController } from "./reports.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";

@Module({
  imports: [TenantModule],
  providers: [ReportsService, ExportService],
  controllers: [ReportsController],
  exports: [ReportsService, ExportService],
})
export class ReportsModule {}
