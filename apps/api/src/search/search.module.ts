import { Module } from "@nestjs/common";
import { SearchService } from "./search.service.js";
import { SearchController } from "./search.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";

@Module({
  imports: [TenantModule],
  providers: [SearchService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
