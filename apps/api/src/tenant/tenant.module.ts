import { Module } from "@nestjs/common";
import { TenantService } from "./tenant.service.js";
import { TenantPrismaService } from "./tenant-prisma.service.js";
import { TenantController } from "./tenant.controller.js";

@Module({
  providers: [TenantService, TenantPrismaService],
  controllers: [TenantController],
  exports: [TenantService, TenantPrismaService],
})
export class TenantModule {}
