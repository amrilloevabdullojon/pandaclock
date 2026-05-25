import { describe, expect, it } from "vitest";
import {
  distanceMeters,
  isLateArrival,
  isWithinGeofence,
  parseTimePolicy,
  type TimePolicy,
} from "./time-policy.js";

describe("parseTimePolicy", () => {
  it("returns defaults when raw is null/undefined", () => {
    expect(parseTimePolicy(null).workStart).toBe("09:00");
    expect(parseTimePolicy(undefined).lateThresholdMinutes).toBe(15);
  });

  it("merges with stored values", () => {
    const policy = parseTimePolicy({ workStart: "10:00", lateThresholdMinutes: 5 });
    expect(policy.workStart).toBe("10:00");
    expect(policy.lateThresholdMinutes).toBe(5);
    expect(policy.workdays).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("isLateArrival", () => {
  const policy: TimePolicy = {
    workStart: "09:00",
    workEnd: "18:00",
    lateThresholdMinutes: 15,
    workdays: [1, 2, 3, 4, 5],
  };

  it("returns false if arrived before threshold", () => {
    // 09:14 in Asia/Tashkent (UTC+5) → 04:14 UTC
    const localDate = new Date("2026-05-25T04:14:00Z");
    expect(isLateArrival(policy, localDate, "Asia/Tashkent")).toBe(false);
  });

  it("returns true if arrived after threshold", () => {
    const localDate = new Date("2026-05-25T04:30:00Z"); // 09:30 local
    expect(isLateArrival(policy, localDate, "Asia/Tashkent")).toBe(true);
  });
});

describe("distanceMeters", () => {
  it("returns 0 for the same point", () => {
    expect(distanceMeters({ latitude: 41.3, longitude: 69.27 }, { latitude: 41.3, longitude: 69.27 })).toBe(0);
  });

  it("calculates a meaningful distance", () => {
    const meters = distanceMeters(
      { latitude: 41.3, longitude: 69.27 },
      { latitude: 41.31, longitude: 69.28 },
    );
    expect(meters).toBeGreaterThan(900);
    expect(meters).toBeLessThan(1600);
  });
});

describe("isWithinGeofence", () => {
  it("returns no_geofence when policy has no geofence", () => {
    expect(isWithinGeofence({ workStart: "09:00", workEnd: "18:00", lateThresholdMinutes: 15, workdays: [1] }, undefined)).toBe(
      "no_geofence",
    );
  });

  it("returns no_coords when coords missing", () => {
    expect(
      isWithinGeofence(
        {
          workStart: "09:00",
          workEnd: "18:00",
          lateThresholdMinutes: 15,
          workdays: [1],
          geofence: { latitude: 41.3, longitude: 69.27, radius: 200 },
        },
        undefined,
      ),
    ).toBe("no_coords");
  });

  it("returns inside / outside based on radius", () => {
    const policy: TimePolicy = {
      workStart: "09:00",
      workEnd: "18:00",
      lateThresholdMinutes: 15,
      workdays: [1],
      geofence: { latitude: 41.3, longitude: 69.27, radius: 200 },
    };
    expect(isWithinGeofence(policy, { latitude: 41.3, longitude: 69.27 })).toBe("inside");
    expect(isWithinGeofence(policy, { latitude: 41.4, longitude: 69.4 })).toBe("outside");
  });
});
