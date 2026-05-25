import { describe, expect, it } from "vitest";
import { canTransition } from "./task-status.js";

describe("canTransition", () => {
  it("allows NEW → IN_PROGRESS", () => {
    expect(canTransition("NEW", "IN_PROGRESS")).toBe(true);
  });

  it("allows IN_PROGRESS → DONE", () => {
    expect(canTransition("IN_PROGRESS", "DONE")).toBe(true);
  });

  it("allows DONE → IN_PROGRESS (reopen)", () => {
    expect(canTransition("DONE", "IN_PROGRESS")).toBe(true);
  });

  it("blocks DONE → REJECTED", () => {
    expect(canTransition("DONE", "REJECTED")).toBe(false);
  });

  it("blocks DONE → NEW", () => {
    expect(canTransition("DONE", "NEW")).toBe(false);
  });

  it("treats same-status as allowed", () => {
    expect(canTransition("DONE", "DONE")).toBe(true);
  });

  it("allows REJECTED to be restored", () => {
    expect(canTransition("REJECTED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("REJECTED", "NEW")).toBe(true);
  });
});
