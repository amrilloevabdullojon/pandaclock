import { Module } from "@nestjs/common";
import { OrgService } from "./org.service.js";
import { OrgController } from "./org.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";

@Module({
  imports: [TenantModule],
  providers: [OrgService],
  controllers: [OrgController],
  exports: [OrgService],
})
export class OrgModule {}
