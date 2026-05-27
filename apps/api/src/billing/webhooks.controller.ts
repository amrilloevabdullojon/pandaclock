import { Body, Controller, Headers, Logger, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ClickProvider, type ClickRequest } from "./providers/click.provider.js";
import { PaymeProvider } from "./providers/payme.provider.js";
import { TransactionService } from "./transaction.service.js";

/**
 * Public webhook endpoints. НЕ требуют JWT — провайдер аутентифицируется
 * через подпись (Click) или Basic-auth (Payme).
 */
@ApiTags("billing-webhooks")
@Controller("webhooks")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private readonly clickProvider = new ClickProvider(process.env.CLICK_SECRET ?? "dev-secret");
  private readonly paymeProvider = new PaymeProvider(process.env.PAYME_MERCHANT_KEY ?? "dev-key");

  constructor(private readonly transactions: TransactionService) {}

  @Post("click")
  @ApiOperation({ summary: "Click webhook (Prepare + Complete)" })
  async click(@Body() body: ClickRequest) {
    if (!this.clickProvider.verifySignature(body)) {
      this.logger.warn({ click_trans_id: body.click_trans_id }, "click signature mismatch");
      return this.clickProvider.buildResponse(body, { ok: false });
    }

    if (this.clickProvider.isComplete(body) && body.error === "0") {
      try {
        await this.transactions.recordSuccess({
          merchantTransId: body.merchant_trans_id,
          amount: Number(body.amount),
          currency: "UZS",
          provider: "CLICK",
          providerTxId: body.click_paydoc_id ?? body.click_trans_id,
        });
      } catch (error) {
        this.logger.error({ err: error }, "failed to record click transaction");
      }
    }

    return this.clickProvider.buildResponse(body, { ok: true, merchantPrepareId: Date.now() });
  }

  @Post("payme")
  @ApiOperation({ summary: "Payme Merchant API webhook (JSON-RPC)" })
  async payme(
    @Body() body: { id: number; method: string; params: Record<string, unknown> },
    @Headers("authorization") auth?: string,
  ) {
    if (!this.paymeProvider.verifyAuthHeader(auth)) {
      return this.paymeProvider.errorResponse(-32504, "Insufficient privilege", body.id);
    }

    if (body.method === "PerformTransaction") {
      const account = body.params.account as { order?: string } | undefined;
      const amount = Number(body.params.amount ?? 0) / 100;
      const txId = String(body.params.id ?? "");
      if (account?.order && amount > 0 && txId) {
        try {
          await this.transactions.recordSuccess({
            merchantTransId: account.order,
            amount,
            currency: "UZS",
            provider: "PAYME",
            providerTxId: txId,
          });
        } catch (error) {
          this.logger.error({ err: error }, "failed to record payme transaction");
        }
      }
    }

    return this.paymeProvider.okResponse({ allow: true }, body.id);
  }
}
