import * as crypto from "node:crypto";

/**
 * Реализация серверной проверки подписи Click.
 * Click формирует sign_string = MD5(click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time).
 * Документация: https://docs.click.uz/click-api-request/
 */
export interface ClickRequest {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id?: string;
  merchant_trans_id: string;
  amount: string;
  action: "0" | "1";
  error: string;
  error_note?: string;
  sign_time: string;
  sign_string: string;
}

export interface ClickResponse {
  click_trans_id: string;
  merchant_trans_id: string;
  merchant_prepare_id?: number;
  error: number;
  error_note: string;
}

const PREPARE = "0";
const COMPLETE = "1";

export class ClickProvider {
  constructor(private readonly secretKey: string) {}

  verifySignature(body: ClickRequest, merchantPrepareId = ""): boolean {
    const components = [
      body.click_trans_id,
      body.service_id,
      this.secretKey,
      body.merchant_trans_id,
      body.action === COMPLETE ? merchantPrepareId : "",
      body.amount,
      body.action,
      body.sign_time,
    ].filter(Boolean);
    const expected = crypto.createHash("md5").update(components.join("")).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(body.sign_string));
  }

  buildResponse(input: ClickRequest, opts: { ok: boolean; merchantPrepareId?: number }): ClickResponse {
    return {
      click_trans_id: input.click_trans_id,
      merchant_trans_id: input.merchant_trans_id,
      merchant_prepare_id: opts.merchantPrepareId,
      error: opts.ok ? 0 : -9,
      error_note: opts.ok ? "Success" : "Transaction cancelled",
    };
  }

  isPrepare(input: ClickRequest): boolean {
    return input.action === PREPARE;
  }
  isComplete(input: ClickRequest): boolean {
    return input.action === COMPLETE;
  }
}
