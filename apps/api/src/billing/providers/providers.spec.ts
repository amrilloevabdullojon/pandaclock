import * as crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { ClickProvider } from "./click.provider.js";
import { PaymeProvider } from "./payme.provider.js";

function buildSignature(payload: {
  click_trans_id: string;
  service_id: string;
  secret: string;
  merchant_trans_id: string;
  merchant_prepare_id?: string;
  amount: string;
  action: "0" | "1";
  sign_time: string;
}): string {
  const components = [
    payload.click_trans_id,
    payload.service_id,
    payload.secret,
    payload.merchant_trans_id,
    payload.action === "1" ? (payload.merchant_prepare_id ?? "") : "",
    payload.amount,
    payload.action,
    payload.sign_time,
  ].filter(Boolean);
  return crypto.createHash("md5").update(components.join("")).digest("hex");
}

describe("ClickProvider.verifySignature", () => {
  const secret = "super-secret";
  const provider = new ClickProvider(secret);

  it("accepts a valid signature for prepare", () => {
    const sign_time = "2026-05-26 09:00:00";
    const sign = buildSignature({
      click_trans_id: "100",
      service_id: "1234",
      secret,
      merchant_trans_id: "tx-1",
      amount: "200000",
      action: "0",
      sign_time,
    });
    expect(
      provider.verifySignature({
        click_trans_id: "100",
        service_id: "1234",
        merchant_trans_id: "tx-1",
        amount: "200000",
        action: "0",
        error: "0",
        sign_time,
        sign_string: sign,
      }),
    ).toBe(true);
  });

  it("rejects tampered signature", () => {
    const sign_time = "2026-05-26 09:00:00";
    const sign = buildSignature({
      click_trans_id: "100",
      service_id: "1234",
      secret,
      merchant_trans_id: "tx-1",
      amount: "200000",
      action: "0",
      sign_time,
    });
    expect(
      provider.verifySignature({
        click_trans_id: "100",
        service_id: "1234",
        merchant_trans_id: "tx-1",
        amount: "999000",
        action: "0",
        error: "0",
        sign_time,
        sign_string: sign,
      }),
    ).toBe(false);
  });
});

describe("PaymeProvider.verifyAuthHeader", () => {
  const provider = new PaymeProvider("merchant-key");

  it("accepts correct Basic header", () => {
    const header = "Basic " + Buffer.from("Paycom:merchant-key").toString("base64");
    expect(provider.verifyAuthHeader(header)).toBe(true);
  });

  it("rejects wrong key", () => {
    const header = "Basic " + Buffer.from("Paycom:wrong").toString("base64");
    expect(provider.verifyAuthHeader(header)).toBe(false);
  });

  it("rejects missing header", () => {
    expect(provider.verifyAuthHeader(undefined)).toBe(false);
  });
});
