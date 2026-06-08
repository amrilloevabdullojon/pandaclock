import { describe, expect, it } from "vitest";
import { computeNet, isValidRunTransition } from "./payroll-utils.js";

describe("computeNet", () => {
  it("adds bonus and subtracts deductions", () => {
    expect(computeNet(1000, 200, 50)).toBe(1150);
  });

  it("returns base when no bonus/deductions", () => {
    expect(computeNet(1000, 0, 0)).toBe(1000);
  });

  it("never returns negative", () => {
    expect(computeNet(1000, 0, 5000)).toBe(0);
  });
});

describe("isValidRunTransition", () => {
  it("allows DRAFT → APPROVED", () => {
    expect(isValidRunTransition("DRAFT", "APPROVED")).toBe(true);
  });

  it("allows APPROVED → PAID", () => {
    expect(isValidRunTransition("APPROVED", "PAID")).toBe(true);
  });

  it("blocks DRAFT → PAID (skipping approval)", () => {
    expect(isValidRunTransition("DRAFT", "PAID")).toBe(false);
  });

  it("blocks PAID → APPROVED (no rollback)", () => {
    expect(isValidRunTransition("PAID", "APPROVED")).toBe(false);
  });

  it("blocks re-approving an approved run", () => {
    expect(isValidRunTransition("APPROVED", "APPROVED")).toBe(false);
  });
});
