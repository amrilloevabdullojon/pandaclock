import { Module } from "@nestjs/common";
import { UploadsService } from "./uploads.service.js";
import { UploadsController } from "./uploads.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";

@Module({
  imports: [TenantModule],
  providers: [UploadsService],
  controllers: [UploadsController],
  exports: [UploadsService],
})
export class UploadsModule {}
