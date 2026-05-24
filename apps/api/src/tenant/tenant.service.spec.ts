import { describe, it, expect } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { TenantService } from "./tenant.service.js";

describe("TenantService — slug validation", () => {
  const service = new TenantService();

  it.each([
    ["ok", true],
    ["acmebank", true],
    ["a-b-c", true],
    ["A", false],
    ["1abc", false],
    ["ab", false],
    ["with spaces", false],
    ["__weird", false],
  ])("validates slug %s -> %s", (slug, isValid) => {
    // @ts-expect-error — private API
    const callable = () => service.assertValidSlug(slug);
    if (isValid) {
      expect(callable).not.toThrow();
    } else {
      expect(callable).toThrow(BadRequestException);
    }
  });

  it("rejects reserved slugs", () => {
    // @ts-expect-error — private API
    expect(() => service.assertValidSlug("api")).toThrow();
    // @ts-expect-error — private API
    expect(() => service.assertValidSlug("www")).toThrow();
  });
});
