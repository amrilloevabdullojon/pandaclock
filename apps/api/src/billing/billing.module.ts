import { Module } from "@nestjs/common";
import { BillingService } from "./billing.service.js";
import { BillingController } from "./billing.controller.js";
import { WebhooksController } from "./webhooks.controller.js";
import { TransactionService } from "./transaction.service.js";
import { TenantModule } from "../tenant/tenant.module.js";

@Module({
  imports: [TenantModule],
  providers: [BillingService, TransactionService],
  controllers: [BillingController, WebhooksController],
  exports: [BillingService, TransactionService],
})
export class BillingModule {}
