import { Module } from "@nestjs/common";
import { BillingService } from "./billing.service.js";
import { BillingController } from "./billing.controller.js";
import { WebhooksController } from "./webhooks.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";

@Module({
  imports: [TenantModule],
  providers: [BillingService],
  controllers: [BillingController, WebhooksController],
  exports: [BillingService],
})
export class BillingModule {}
