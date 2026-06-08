import { Module } from "@nestjs/common";
import { KnowledgeService } from "./knowledge.service.js";
import { KnowledgeController } from "./knowledge.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";

@Module({
  imports: [TenantModule],
  providers: [KnowledgeService],
  controllers: [KnowledgeController],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
