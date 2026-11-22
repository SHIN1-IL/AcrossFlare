import { describe, expect, it } from "vitest";
import { parsePingPeResults, parsePingPeTaskPage, reachabilityFromSamples } from "@/lib/china-reachability/pingpe";

const PAGE = `
  var taskStartQuery = "203.0.113.10:443";
  var taskStartToken = "token-1";
  document.cookie="antiflood=abc123;max-age=86400";
  <tr data-pinger-id='CN_SH_1' data-location='China, Shanghai'>
  <tr data-pinger-id='CN_GD_1' data-location='China, Guangzhou'>
  <tr data-pinger-id='CN_JS_1' data-location='China, Jiangsu'>
  <tr data-pinger-id='HK_1' data-location='Hong Kong'>
  <tr data-pinger-id='JP_1' data-location='Japan, Tokyo'>
`;

describe("parsePingPeTaskPage", () => {
  it("keeps mainland China separate from Hong Kong", () => {
    const page = parsePingPeTaskPage(PAGE);
    expect(page?.query).toBe("203.0.113.10:443");
    expect(page?.cookie).toBe("antiflood=abc123");
    expect(page?.nodes.filter((node) => node.china).map((node) => node.id)).toEqual([
      "CN_SH_1",
      "CN_GD_1",
      "CN_JS_1",
    ]);
  });
});

describe("reachabilityFromSamples", () => {
  it("marks a China-only TCP failure as blocked", () => {
    const page = parsePingPeTaskPage(PAGE);
    expect(page).not.toBeNull();
    const samples = parsePingPeResults(
      JSON.stringify({
        state: { outstandingNodeCount: 0 },
        data: [
          { node_id: "CN_SH_1", result: 1 },
          { node_id: "CN_GD_1", result: 1 },
          { node_id: "CN_JS_1", result: 1 },
          { node_id: "HK_1", result: 18000 },
          { node_id: "JP_1", result: 0 },
        ],
      })
    );
    expect(reachabilityFromSamples(page!.nodes, samples.samples)).toBe("blocked");
  });
});
