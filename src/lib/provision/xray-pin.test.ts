import { describe, expect, it } from "vitest";
import { xrayNeedsKaringPin, xrayVersionFromStatus } from "@/lib/provision/xray-pin";

describe("xray pin for Karing", () => {
  it("pins only cores that require ML-KEM", () => {
    expect(xrayNeedsKaringPin("26.9.8")).toBe(true);
    expect(xrayNeedsKaringPin("v26.9.11")).toBe(true);
    expect(xrayNeedsKaringPin("26.10.0")).toBe(true);
    expect(xrayNeedsKaringPin("26.7.28")).toBe(false);
    expect(xrayNeedsKaringPin("v26.9.7")).toBe(false);
    expect(xrayNeedsKaringPin("")).toBe(false);
  });

  it("reads the panel status version", () => {
    expect(xrayVersionFromStatus({ obj: { xray: { version: "26.9.11" } } })).toBe("26.9.11");
    expect(xrayVersionFromStatus({ obj: { xrayVersion: "26.7.28" } })).toBe("26.7.28");
    expect(xrayVersionFromStatus(null)).toBe("");
  });
});
