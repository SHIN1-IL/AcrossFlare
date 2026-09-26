import { describe, expect, it } from "vitest";
import ko from "../../../messages/ko.json";
import { GAP_MS, LINE_MS, readServiceLead, typingLeadFrame } from "./typing-lead";

const lines = ["아주 빠른 속도가 필요한게 아니라면", "그래도 유튜브 정도는 끊김없이 보고 싶다면"] as const;

describe("service typing lead", () => {
  it("uses the standard and hybrid lines above the product title", () => {
    expect(ko.services.standard.lead).toEqual([
      "아주 빠른 속도가 필요한게 아니라면",
      "그래도 유튜브 정도는 끊김없이 보고 싶다면",
    ]);
    expect(ko.services.hybrid.lead).toEqual([
      "좀 더 빠른 속도가 필요하다면",
      "끊김없는 화상회의를 원한다면",
    ]);
    expect(readServiceLead(ko.services.standard.lead)).toEqual(ko.services.standard.lead);
    expect(readServiceLead(ko.services.workspace)).toBeNull();
  });

  it("types the first line, pauses, then types the second", () => {
    expect(typingLeadFrame(0, lines)).toEqual({ index: 0, count: 0, done: false });
    const mid = typingLeadFrame(LINE_MS / 2, lines);
    expect(mid.index).toBe(0);
    expect(mid.count).toBeGreaterThan(0);
    expect(mid.count).toBeLessThan(lines[0].length);
    expect(typingLeadFrame(LINE_MS, lines)).toEqual({
      index: 0,
      count: lines[0].length,
      done: false,
    });
    expect(typingLeadFrame(LINE_MS + GAP_MS, lines)).toEqual({
      index: 1,
      count: 0,
      done: false,
    });
    expect(typingLeadFrame(LINE_MS + GAP_MS + LINE_MS, lines)).toEqual({
      index: 1,
      count: lines[1].length,
      done: true,
    });
  });
});