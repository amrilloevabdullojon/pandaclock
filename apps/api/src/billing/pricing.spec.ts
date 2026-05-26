import { describe, expect, it } from "vitest";
import { PRICING_TABLE, calculatePrice, planCanFit } from "./pricing.js";

describe("calculatePrice", () => {
  it("Starter — всегда 0", () => {
    expect(calculatePrice("STARTER", 0, "MONTHLY")).toBe(0);
    expect(calculatePrice("STARTER", 10, "YEARLY")).toBe(0);
  });

  it("Business: base + per-employee", () => {
    // 50,000 + 5,000 * 30 = 200,000
    expect(calculatePrice("BUSINESS", 30, "MONTHLY")).toBe(200_000);
  });

  it("Pro: только per-employee", () => {
    // 0 + 30,000 * 100 = 3,000,000
    expect(calculatePrice("PRO", 100, "MONTHLY")).toBe(3_000_000);
  });

  it("Yearly = monthly * 12 * 0.8", () => {
    expect(calculatePrice("BUSINESS", 30, "YEARLY")).toBe(Math.round(200_000 * 12 * 0.8));
  });
});

describe("planCanFit", () => {
  it("Enterprise умещает любое количество", () => {
    expect(planCanFit("ENTERPRISE", 100_000)).toBe(true);
  });

  it("Starter ограничен 10", () => {
    expect(planCanFit("STARTER", 10)).toBe(true);
    expect(planCanFit("STARTER", 11)).toBe(false);
  });

  it("Business ограничен 100", () => {
    expect(planCanFit("BUSINESS", 100)).toBe(true);
    expect(planCanFit("BUSINESS", 101)).toBe(false);
  });

  it("PRICING_TABLE consistency", () => {
    expect(Object.keys(PRICING_TABLE).sort()).toEqual([
      "BUSINESS",
      "ENTERPRISE",
      "PRO",
      "STARTER",
    ]);
  });
});
