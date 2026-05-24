import { Module } from "@nestjs/common";
import { DepartmentsService } from "./departments.service.js";
import { DepartmentsController } from "./departments.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";

@Module({
  imports: [TenantModule],
  providers: [DepartmentsService],
  controllers: [DepartmentsController],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
