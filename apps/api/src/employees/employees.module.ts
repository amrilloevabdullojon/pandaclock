import { Module } from "@nestjs/common";
import { EmployeesService } from "./employees.service.js";
import { InvitationsService } from "./invitations.service.js";
import { ExcelImportService } from "./excel-import.service.js";
import { EmployeesController } from "./employees.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";
import { EmailModule } from "../email/email.module.js";

@Module({
  imports: [TenantModule, EmailModule],
  providers: [EmployeesService, InvitationsService, ExcelImportService],
  controllers: [EmployeesController],
  exports: [EmployeesService, InvitationsService],
})
export class EmployeesModule {}
