import { describe, expect, it } from "vitest";
import { courseProgress, isCourseComplete } from "./progress-utils.js";

describe("courseProgress", () => {
  it("returns 0 for a course without lessons", () => {
    expect(courseProgress(0, 0)).toBe(0);
  });

  it("returns 0 when nothing done", () => {
    expect(courseProgress(0, 4)).toBe(0);
  });

  it("returns 50 at half", () => {
    expect(courseProgress(2, 4)).toBe(50);
  });

  it("returns 100 when all done", () => {
    expect(courseProgress(4, 4)).toBe(100);
  });

  it("rounds partial progress", () => {
    expect(courseProgress(1, 3)).toBe(33);
  });

  it("clamps done above total to 100", () => {
    expect(courseProgress(5, 4)).toBe(100);
  });
});

describe("isCourseComplete", () => {
  it("is false for empty course", () => {
    expect(isCourseComplete(0, 0)).toBe(false);
  });

  it("is false while lessons remain", () => {
    expect(isCourseComplete(3, 4)).toBe(false);
  });

  it("is true when all lessons done", () => {
    expect(isCourseComplete(4, 4)).toBe(true);
  });
});
