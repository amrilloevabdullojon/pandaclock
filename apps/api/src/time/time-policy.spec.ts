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
    offices: [],
    leave: { vacationDaysPerYear: 21, sickDaysPerYearWithoutDoc: 3, unpaidDaysPerYear: 14 },
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
    expect(
      distanceMeters({ latitude: 41.3, longitude: 69.27 }, { latitude: 41.3, longitude: 69.27 }),
    ).toBe(0);
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
  const BASE = {
    workStart: "09:00",
    workEnd: "18:00",
    lateThresholdMinutes: 15,
    workdays: [1],
    leave: { vacationDaysPerYear: 21, sickDaysPerYearWithoutDoc: 3, unpaidDaysPerYear: 14 },
  };

  it("returns no_geofence when offices is empty", () => {
    expect(isWithinGeofence({ ...BASE, offices: [] }, undefined)).toBe("no_geofence");
  });

  it("returns no_coords when coords missing", () => {
    expect(
      isWithinGeofence(
        {
          ...BASE,
          offices: [{ id: "1", name: "Main", latitude: 41.3, longitude: 69.27, radius: 200 }],
        },
        undefined,
      ),
    ).toBe("no_coords");
  });

  it("returns inside / outside based on radius", () => {
    const policy: TimePolicy = {
      ...BASE,
      offices: [{ id: "1", name: "Main", latitude: 41.3, longitude: 69.27, radius: 200 }],
    };
    expect(isWithinGeofence(policy, { latitude: 41.3, longitude: 69.27 })).toBe("inside");
    expect(isWithinGeofence(policy, { latitude: 41.4, longitude: 69.4 })).toBe("outside");
  });

  it("returns inside when in ANY of multiple offices", () => {
    const policy: TimePolicy = {
      ...BASE,
      offices: [
        { id: "1", name: "Tashkent", latitude: 41.3, longitude: 69.27, radius: 200 },
        { id: "2", name: "Samarkand", latitude: 39.65, longitude: 66.97, radius: 200 },
      ],
    };
    // На точке samarkand-офиса должен быть inside
    expect(isWithinGeofence(policy, { latitude: 39.65, longitude: 66.97 })).toBe("inside");
    // Вдалеке от обоих — outside
    expect(isWithinGeofence(policy, { latitude: 50, longitude: 30 })).toBe("outside");
  });
});

describe("parseTimePolicy — legacy migration", () => {
  it("converts legacy single geofence to offices[]", () => {
    const policy = parseTimePolicy({
      workStart: "09:00",
      geofence: { latitude: 41, longitude: 69, radius: 250, name: "Главный офис" },
    });
    expect(policy.offices).toHaveLength(1);
    expect(policy.offices[0]?.name).toBe("Главный офис");
    expect(policy.offices[0]?.radius).toBe(250);
  });

  it("prefers offices[] over legacy geofence when both present", () => {
    const policy = parseTimePolicy({
      offices: [{ id: "x", name: "New office", latitude: 1, longitude: 1, radius: 100 }],
      geofence: { latitude: 99, longitude: 99, radius: 9999 },
    });
    expect(policy.offices).toHaveLength(1);
    expect(policy.offices[0]?.name).toBe("New office");
  });
});
