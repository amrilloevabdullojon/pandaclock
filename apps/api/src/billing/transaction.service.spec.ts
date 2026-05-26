import { describe, expect, it } from "vitest";
import { TransactionService } from "./transaction.service.js";

describe("TransactionService.parseMerchantTransId", () => {
  const service = new TransactionService();

  it("parses correct id", () => {
    const result = service.parseMerchantTransId(
      "11111111-1111-1111-1111-111111111111:BUSINESS:MONTHLY",
    );
    expect(result).toEqual({
      tenantId: "11111111-1111-1111-1111-111111111111",
      plan: "BUSINESS",
      period: "MONTHLY",
    });
  });

  it("rejects wrong period", () => {
    expect(service.parseMerchantTransId("t:p:DAILY")).toBeNull();
  });

  it("rejects empty parts", () => {
    expect(service.parseMerchantTransId(":BUSINESS:MONTHLY")).toBeNull();
    expect(service.parseMerchantTransId("t::MONTHLY")).toBeNull();
  });

  it("rejects malformed strings", () => {
    expect(service.parseMerchantTransId("no-colons")).toBeNull();
    expect(service.parseMerchantTransId("only:two")).toBeNull();
  });
});
