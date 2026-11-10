import { describe, expect, it } from "vitest";
import {
  canCancelSupplierProfile,
  marginAllows,
  selectPackage,
  type SupplierPackage,
  wholesaleUsd,
} from "@/lib/esim/supplier-policy";

const GB = 1024 ** 3;

function pack(overrides: Partial<SupplierPackage> & Pick<SupplierPackage, "name" | "packageCode">): SupplierPackage {
  return {
    price: 35200,
    volume: 5 * GB,
    duration: 30,
    durationUnit: "DAY",
    type: "BASE",
    ...overrides,
  };
}

describe("selectPackage", () => {
  const catalog = [
    pack({ packageCode: "cn-5", name: "China 5GB 30Days (nonhkip)", price: 35200, volume: 5 * GB }),
    pack({ packageCode: "cn-10", name: "China 10GB 30Days (nonhkip)", price: 67800, volume: 10 * GB }),
    pack({ packageCode: "day", name: "China 5GB/Day (nonhkip)", price: 10000, volume: 5 * GB, duration: 1 }),
    pack({ packageCode: "hk", name: "China 5GB 30Days", price: 29600, volume: 5 * GB }),
  ];

  it("keeps only the pinned non-Hong Kong 30-day plans", () => {
    expect(selectPackage(catalog, "cn-5gb")?.packageCode).toBe("cn-5");
    expect(selectPackage(catalog, "cn-10gb")?.packageCode).toBe("cn-10");
    expect(selectPackage(catalog, "other")).toBeNull();
  });

  it("refuses the product when two packages match", () => {
    expect(
      selectPackage(
        [
          pack({ packageCode: "a", name: "China 5GB 30Days (nonhkip)" }),
          pack({ packageCode: "b", name: "China 5GB 30Days nonhkip" }),
        ],
        "cn-5gb"
      )
    ).toBeNull();
  });
});

describe("sale gates", () => {
  it("stops a new sale when the wholesale cost reaches the selling price", () => {
    expect(marginAllows(wholesaleUsd(35200), 19900)).toBe(true);
    expect(marginAllows(15, 19900)).toBe(false);
  });

  it("allows cancel only before the profile is installed", () => {
    expect(canCancelSupplierProfile("GOT_RESOURCE", "RELEASED")).toBe(true);
    expect(canCancelSupplierProfile("GOT_RESOURCE", "AVAILABLE")).toBe(true);
    expect(canCancelSupplierProfile("IN_USE", "ENABLED")).toBe(false);
    expect(canCancelSupplierProfile("GOT_RESOURCE", "INSTALLED")).toBe(false);
    expect(canCancelSupplierProfile("GOT_RESOURCE", "DOWNLOAD")).toBe(false);
  });
});
