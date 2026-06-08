import { describe, expect, it } from "vitest";
import { effectiveScope } from "./scope-utils.js";

describe("effectiveScope", () => {
  it("keeps requested scope for approvers", () => {
    expect(effectiveScope("all", true)).toBe("all");
    expect(effectiveScope("team", true)).toBe("team");
    expect(effectiveScope("my", true)).toBe("my");
  });

  it("forces non-approvers down to 'my'", () => {
    expect(effectiveScope("all", false)).toBe("my");
    expect(effectiveScope("team", false)).toBe("my");
    expect(effectiveScope("my", false)).toBe("my");
  });
});
