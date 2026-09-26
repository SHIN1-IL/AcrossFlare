import { describe, expect, it } from "vitest";
import { nextHomePageTop } from "@/lib/home-page-snap";

const tops = [0, 800, 1600, 2400];

describe("nextHomePageTop", () => {
  it("moves to the next page after a downward drag and lands on its top", () => {
    expect(nextHomePageTop(tops, 0, 120, 800)).toBe(800);
  });

  it("moves to the previous page after an upward drag", () => {
    expect(nextHomePageTop(tops, 1600, 1500, 800)).toBe(800);
  });

  it("returns to the current page when the drag is too short", () => {
    expect(nextHomePageTop(tops, 800, 830, 800)).toBe(800);
  });

  it("does not skip past the following page on a long flick", () => {
    expect(nextHomePageTop(tops, 0, 1500, 800)).toBe(800);
  });
});
