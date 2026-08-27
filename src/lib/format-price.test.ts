import { describe, expect, it } from "vitest";
import { amountCharSlots, primaryAmountSlots } from "@/lib/format-price";

describe("format-price slots", () => {
  it("pads the 만 place so 5,900 lines up with 19,900", () => {
    const month = primaryAmountSlots("ko", { krw: 19900, usd: 15, cny: 99, jpy: 2300 });
    const week = primaryAmountSlots("ko", { krw: 5900, usd: 5, cny: 29, jpy: 680 });

    expect(month.join("")).toBe(" 19,900");
    expect(week).toHaveLength(month.length);
    expect(week.join("")).toBe("  5,900");
    expect(week[0]).toBe(" ");
    expect(week.slice(2).join("")).toBe("5,900");
    expect(month[3]).toBe(",");
    expect(week[3]).toBe(",");
  });

  it("pads shorter USD and JPY amounts from the left", () => {
    expect(amountCharSlots("5", "en").join("")).toMatch(/^\s*5$/);
    expect(amountCharSlots("680", "ja")).toHaveLength(amountCharSlots("11,400", "ja").length);
  });
});
