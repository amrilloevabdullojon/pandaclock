import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { TenantMiddleware } from "./tenant.middleware.js";

vi.mock("@pandaclock/db", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
    },
  },
}));

const { prisma } = await import("@pandaclock/db");

const findUniqueMock = prisma.tenant.findUnique as unknown as ReturnType<typeof vi.fn>;

function makeReq(overrides: { host?: string; header?: string }) {
  return {
    headers: {
      ...(overrides.host ? { host: overrides.host } : {}),
      ...(overrides.header ? { "x-tenant-slug": overrides.header } : {}),
    },
  } as unknown as Parameters<TenantMiddleware["use"]>[0];
}

describe("TenantMiddleware", () => {
  const middleware = new TenantMiddleware();
  const next = vi.fn();

  beforeEach(() => {
    next.mockReset();
    findUniqueMock.mockReset();
  });

  it("extracts slug from subdomain", async () => {
    findUniqueMock.mockResolvedValue({ id: "1", slug: "acmebank", schemaName: "tenant_acmebank" });
    const req = makeReq({ host: "acmebank.pandaclock.uz" });
    await middleware.use(req, {} as never, next);
    expect(findUniqueMock).toHaveBeenCalledWith({ where: { slug: "acmebank" } });
    expect(next).toHaveBeenCalledOnce();
  });

  it("uses x-tenant-slug header as fallback", async () => {
    findUniqueMock.mockResolvedValue({ id: "1", slug: "demo", schemaName: "tenant_demo" });
    const req = makeReq({ host: "localhost:4000", header: "demo" });
    await middleware.use(req, {} as never, next);
    expect(findUniqueMock).toHaveBeenCalledWith({ where: { slug: "demo" } });
  });

  it("throws when subdomain is technical (www, api)", async () => {
    const req = makeReq({ host: "www.pandaclock.uz" });
    await expect(middleware.use(req, {} as never, next)).rejects.toBeInstanceOf(NotFoundException);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("throws when tenant not found", async () => {
    findUniqueMock.mockResolvedValue(null);
    const req = makeReq({ host: "ghost.pandaclock.uz" });
    await expect(middleware.use(req, {} as never, next)).rejects.toBeInstanceOf(NotFoundException);
  });
});
