import { describe, it, expect } from "vitest";
import { UnauthorizedException } from "@nestjs/common";
import { JwtStrategy } from "./jwt.strategy.js";

describe("JwtStrategy", () => {
  const strategy = new JwtStrategy();

  it("returns the user when JWT tenant matches request tenant", () => {
    const req = { tenant: { slug: "acmebank" } } as never;
    const payload = {
      sub: "u1",
      email: "a@b.uz",
      role: "OWNER",
      tenant: "acmebank",
    };
    const user = strategy.validate(req, payload);
    expect(user).toEqual({ id: "u1", email: "a@b.uz", role: "OWNER", tenantSlug: "acmebank" });
  });

  it("throws when JWT tenant differs from request tenant", () => {
    const req = { tenant: { slug: "other" } } as never;
    const payload = {
      sub: "u1",
      email: "a@b.uz",
      role: "OWNER",
      tenant: "acmebank",
    };
    expect(() => strategy.validate(req, payload)).toThrow(UnauthorizedException);
  });

  it("falls back to x-tenant-slug header when req.tenant is missing", () => {
    const req = { headers: { "x-tenant-slug": "acmebank" } } as never;
    const payload = {
      sub: "u1",
      email: "a@b.uz",
      role: "OWNER",
      tenant: "acmebank",
    };
    expect(() => strategy.validate(req, payload)).not.toThrow();
  });
});
