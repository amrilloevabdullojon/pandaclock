import { describe, expect, it } from "vitest";
import { accruedDays, countWorkingDays, rangesOverlap } from "./leave-utils.js";

describe("countWorkingDays", () => {
  it("counts a single Monday as 1 day", () => {
    expect(countWorkingDays("2026-05-25", "2026-05-25")).toBe(1);
  });

  it("skips weekends in a Mon-Fri range", () => {
    expect(countWorkingDays("2026-05-25", "2026-05-29")).toBe(5);
  });

  it("skips weekends when range spans a weekend", () => {
    // Mon 2026-05-25 → Mon 2026-06-01 = 6 рабочих дней
    expect(countWorkingDays("2026-05-25", "2026-06-01")).toBe(6);
  });

  it("returns 0 for inverted range", () => {
    expect(countWorkingDays("2026-05-30", "2026-05-25")).toBe(0);
  });
});

describe("accruedDays", () => {
  it("returns 0 when hire date is missing", () => {
    expect(accruedDays(null)).toBe(0);
  });

  it("returns about 21 days after full year", () => {
    const hireIso = "2025-05-25";
    const value = accruedDays(hireIso, 21, new Date("2026-05-25T00:00:00Z"));
    expect(value).toBeGreaterThanOrEqual(21);
    expect(value).toBeLessThanOrEqual(22);
  });

  it("returns half year ≈ 10 days", () => {
    const hireIso = "2025-11-25";
    const value = accruedDays(hireIso, 21, new Date("2026-05-25T00:00:00Z"));
    expect(value).toBeGreaterThanOrEqual(9);
    expect(value).toBeLessThanOrEqual(11);
  });

  it("uses custom daysPerYear when policy differs", () => {
    const hireIso = "2025-05-25";
    const value = accruedDays(hireIso, 28, new Date("2026-05-25T00:00:00Z"));
    expect(value).toBeGreaterThanOrEqual(28);
  });
});

describe("rangesOverlap", () => {
  it("detects exact overlap", () => {
    expect(rangesOverlap("2026-05-01", "2026-05-05", "2026-05-03", "2026-05-10")).toBe(true);
  });

  it("treats touching ranges as overlap (boundary inclusive)", () => {
    expect(rangesOverlap("2026-05-01", "2026-05-05", "2026-05-05", "2026-05-10")).toBe(true);
  });

  it("detects no overlap", () => {
    expect(rangesOverlap("2026-05-01", "2026-05-05", "2026-05-06", "2026-05-10")).toBe(false);
  });
});
