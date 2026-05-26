import { Body, Controller, Headers, Logger, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ClickProvider, type ClickRequest } from "./providers/click.provider.js";
import { PaymeProvider } from "./providers/payme.provider.js";

/**
 * Public webhook endpoints. НЕ требуют JWT — провайдер аутентифицируется
 * через подпись (Click) или Basic-auth (Payme).
 *
 * Эти роуты в AppModule помечены excludeFromTenantMiddleware (см. exclude list).
 */
@ApiTags("billing-webhooks")
@Controller("webhooks")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private readonly click = new ClickProvider(process.env.CLICK_SECRET ?? "dev-secret");
  private readonly payme = new PaymeProvider(process.env.PAYME_MERCHANT_KEY ?? "dev-key");

  @Post("click")
  @ApiOperation({ summary: "Click webhook (Prepare + Complete)" })
  click(@Body() body: ClickRequest) {
    if (!this.click.verifySignature(body)) {
      this.logger.warn({ click_trans_id: body.click_trans_id }, "click signature mismatch");
      return this.click.buildResponse(body, { ok: false });
    }
    // TODO Sprint 8: связать с tenant через merchant_trans_id и продлить subscription
    return this.click.buildResponse(body, { ok: true, merchantPrepareId: Date.now() });
  }

  @Post("payme")
  @ApiOperation({ summary: "Payme Merchant API webhook (JSON-RPC)" })
  payme(@Body() body: { id: number; method: string; params: unknown }, @Headers("authorization") auth?: string) {
    if (!this.payme.verifyAuthHeader(auth)) {
      return this.payme.errorResponse(-32504, "Insufficient privilege", body.id);
    }
    // Заглушка: возвращаем successful CheckPerformTransaction.
    return this.payme.okResponse({ allow: true }, body.id);
  }
}
