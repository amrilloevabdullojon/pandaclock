import { Module } from "@nestjs/common";
import { RecruitmentService } from "./recruitment.service.js";
import { RecruitmentController } from "./recruitment.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";

@Module({
  imports: [TenantModule],
  providers: [RecruitmentService],
  controllers: [RecruitmentController],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
