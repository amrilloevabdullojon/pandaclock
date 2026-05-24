import { Module } from "@nestjs/common";
import { TenantService } from "./tenant.service.js";
import { TenantPrismaService } from "./tenant-prisma.service.js";

@Module({
  providers: [TenantService, TenantPrismaService],
  exports: [TenantService, TenantPrismaService],
})
export class TenantModule {}
