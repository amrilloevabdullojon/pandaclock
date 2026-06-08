import { describe, expect, it } from "vitest";
import { average, choiceDistribution, computeEnps, distribution } from "./enps-utils.js";

describe("computeEnps", () => {
  it("returns zeros for empty input", () => {
    expect(computeEnps([])).toEqual({ promoters: 0, passives: 0, detractors: 0, score: 0 });
  });

  it("classifies promoters (9-10), passives (7-8), detractors (0-6)", () => {
    const r = computeEnps([10, 9, 8, 7, 6, 0]);
    expect(r.promoters).toBe(2);
    expect(r.passives).toBe(2);
    expect(r.detractors).toBe(2);
  });

  it("scores +100 when all promoters", () => {
    expect(computeEnps([9, 10, 9]).score).toBe(100);
  });

  it("scores -100 when all detractors", () => {
    expect(computeEnps([0, 6, 3]).score).toBe(-100);
  });

  it("scores 0 when promoters equal detractors", () => {
    expect(computeEnps([10, 0]).score).toBe(0);
  });

  it("rounds the percentage score", () => {
    // 1 promoter, 2 detractors out of 3 → (1-2)/3 = -33.33 → -33
    expect(computeEnps([9, 0, 0]).score).toBe(-33);
  });
});

describe("average", () => {
  it("returns 0 for empty", () => {
    expect(average([])).toBe(0);
  });

  it("rounds to one decimal", () => {
    expect(average([1, 2])).toBe(1.5);
    expect(average([1, 1, 2])).toBe(1.3);
  });
});

describe("distribution", () => {
  it("counts occurrences per bucket", () => {
    expect(distribution([1, 1, 3, 5], [1, 2, 3, 4, 5])).toEqual([
      { label: "1", count: 2 },
      { label: "2", count: 0 },
      { label: "3", count: 1 },
      { label: "4", count: 0 },
      { label: "5", count: 1 },
    ]);
  });
});

describe("choiceDistribution", () => {
  it("maps option indices to labels with counts", () => {
    expect(choiceDistribution([0, 0, 1], ["A", "B", "C"])).toEqual([
      { label: "A", count: 2 },
      { label: "B", count: 1 },
      { label: "C", count: 0 },
    ]);
  });
});
