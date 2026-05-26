import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { resolvePeriod } from "./period.js";

describe("resolvePeriod", () => {
  it("returns provided start/end when both present", () => {
    const period = resolvePeriod(
      { start: "2026-05-01", end: "2026-05-31" },
      "Asia/Tashkent",
    );
    expect(period.startIso).toBe("2026-05-01");
    expect(period.endIso).toBe("2026-05-31");
  });

  describe("with frozen date", () => {
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-15T10:00:00Z"));
    });
    afterAll(() => {
      vi.useRealTimers();
    });

    it("fills with current month when nothing provided", () => {
      const period = resolvePeriod({}, "Asia/Tashkent");
      expect(period.startIso).toBe("2026-05-01");
      expect(period.endIso).toBe("2026-05-31");
    });

    it("handles February (28 days)", () => {
      vi.setSystemTime(new Date("2026-02-15T10:00:00Z"));
      const period = resolvePeriod({}, "Asia/Tashkent");
      expect(period.startIso).toBe("2026-02-01");
      expect(period.endIso).toBe("2026-02-28");
    });
  });
});
