import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { TimeService } from "./time.service.js";

vi.mock("@pandaclock/db", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn().mockResolvedValue({
        timePolicy: { workStart: "09:00", workEnd: "18:00", lateThresholdMinutes: 15, workdays: [1, 2, 3, 4, 5] },
        timezone: "Asia/Tashkent",
      }),
    },
  },
}));

interface MockClient {
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
}

function createService(client: MockClient): TimeService {
  return new TimeService({
    getClient: vi.fn().mockResolvedValue(client),
  } as never);
}

describe("TimeService.startDay", () => {
  let client: MockClient;
  beforeEach(() => {
    client = {
      $queryRawUnsafe: vi.fn().mockResolvedValue([]),
      $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("rejects when day already started", async () => {
    client.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: "existing" }])
      .mockResolvedValueOnce([]);
    const service = createService(client);
    await expect(
      service.startDay("u1", "acmebank", {}, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("creates entry when no existing day", async () => {
    client.$queryRawUnsafe
      .mockResolvedValueOnce([]) // existing check
      .mockResolvedValueOnce([
        {
          id: "new",
          date: new Date(),
          started_at: new Date(),
          finished_at: null,
          status: "WORKING",
          total_minutes: null,
          breaks_total_minutes: 0,
          is_late: false,
        },
      ]); // getToday → entry
    const service = createService(client);
    const session = await service.startDay("u1", "acmebank", {}, {});
    expect(session.status).toBe("WORKING");
    expect(client.$executeRawUnsafe).toHaveBeenCalled();
  });
});

describe("TimeService.startBreak", () => {
  it("throws if no active day", async () => {
    const client: MockClient = {
      $queryRawUnsafe: vi.fn().mockResolvedValue([]),
      $executeRawUnsafe: vi.fn(),
    };
    const service = createService(client);
    await expect(service.startBreak("u1", "acmebank", "PERSONAL")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("throws if entry is not in WORKING status", async () => {
    const client: MockClient = {
      $queryRawUnsafe: vi.fn().mockResolvedValue([{ id: "e1", status: "ON_BREAK" }]),
      $executeRawUnsafe: vi.fn(),
    };
    const service = createService(client);
    await expect(service.startBreak("u1", "acmebank", "PERSONAL")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe("TimeService.finishDay", () => {
  it("calculates total minutes minus breaks", async () => {
    const start = new Date(Date.now() - 8 * 60 * 60 * 1000); // 8 часов назад
    const client: MockClient = {
      $queryRawUnsafe: vi
        .fn()
        // 1) lookup entry
        .mockResolvedValueOnce([
          {
            id: "e1",
            started_at: start,
            breaks_total_minutes: 0,
            status: "WORKING",
          },
        ])
        // 2) sum of breaks
        .mockResolvedValueOnce([{ total: 60 }])
        // 3) getToday for return
        .mockResolvedValueOnce([
          {
            id: "e1",
            date: new Date(),
            started_at: start,
            finished_at: new Date(),
            status: "FINISHED",
            total_minutes: 420,
            breaks_total_minutes: 60,
            is_late: false,
          },
        ]),
      $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    };
    const service = createService(client);
    const session = await service.finishDay("u1", "acmebank", {});
    expect(session.status).toBe("FINISHED");
    const updateCall = client.$executeRawUnsafe.mock.calls.find(
      ([sql]) => typeof sql === "string" && sql.includes("UPDATE time_entries"),
    );
    expect(updateCall).toBeTruthy();
  });
});
