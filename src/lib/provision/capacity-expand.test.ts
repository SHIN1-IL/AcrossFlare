import { describe, expect, it } from "vitest";
import {
  attachedSeatCount,
  chooseBootstrapTarget,
  groupSeatView,
  neededSlotsForPool,
  occupiedSeats,
} from "@/lib/provision/capacity-expand";

const at = (iso: string) => new Date(iso);

describe("neededSlotsForPool", () => {
  it("asks for nothing while seats remain", () => {
    expect(
      neededSlotsForPool({ maxSelectable: 1, seatsRemaining: 2, openingPrimaryOnline: null })
    ).toEqual([]);
  });

  it("asks for one PRIMARY on a full standard pool", () => {
    expect(
      neededSlotsForPool({ maxSelectable: 1, seatsRemaining: 0, openingPrimaryOnline: null })
    ).toEqual([{ role: "primary", count: 1 }]);
  });

  it("asks for the remaining PRIMARY nodes on an opening hybrid group", () => {
    expect(
      neededSlotsForPool({ maxSelectable: 2, seatsRemaining: 0, openingPrimaryOnline: 1 })
    ).toEqual([{ role: "primary", count: 1 }]);
  });
});

describe("occupied seats", () => {
  it("shows attached customers when the stored counter was never incremented", () => {
    expect(occupiedSeats(0, 4)).toBe(4);
    expect(occupiedSeats(3, 1)).toBe(3);
    expect(occupiedSeats(0, 0)).toBe(0);
  });

  it("keeps one hybrid customer as one seat across both nodes", () => {
    const subscriptions = [
      { instanceGroupId: null, nodeIds: ["tokyo", "la-a"] },
      { instanceGroupId: "hybrid-g1", nodeIds: ["tokyo"] },
      { instanceGroupId: "standard-g1", nodeIds: ["la-b", "tokyo"] },
    ];
    expect(attachedSeatCount({ id: "hybrid-g1", nodeIds: ["tokyo", "la-a"] }, subscriptions)).toBe(2);
    expect(attachedSeatCount({ id: "standard-g1", nodeIds: ["la-b"] }, subscriptions)).toBe(1);
  });

  it("reports remaining seats from the higher of the counter and attachments", () => {
    expect(groupSeatView({ seatsUsed: 0, seatsMax: 10, attached: 2 })).toEqual({
      used: 2,
      max: 10,
      remaining: 8,
      full: false,
    });
    expect(groupSeatView({ seatsUsed: 0, seatsMax: 10, attached: 10 }).full).toBe(true);
  });
});

describe("chooseBootstrapTarget", () => {
  it("attaches to the oldest READY group that still has seats", () => {
    const target = chooseBootstrapTarget({
      maxSelectable: 1,
      incomingRole: "PRIMARY",
      groups: [
        {
          id: "full",
          status: "READY",
          seatsUsed: 10,
          seatsMax: 10,
          primaryOnline: 1,
          createdAt: at("2026-01-01T00:00:00Z"),
        },
        {
          id: "room",
          status: "READY",
          seatsUsed: 3,
          seatsMax: 10,
          primaryOnline: 1,
          createdAt: at("2026-02-01T00:00:00Z"),
        },
      ],
    });

    expect(target).toEqual({ groupId: "room", status: "READY" });
  });

  it("starts a READY group when a standard pool is full", () => {
    const target = chooseBootstrapTarget({
      maxSelectable: 1,
      incomingRole: "PRIMARY",
      groups: [
        {
          id: "full",
          status: "READY",
          seatsUsed: 10,
          seatsMax: 10,
          primaryOnline: 1,
          createdAt: at("2026-01-01T00:00:00Z"),
        },
      ],
    });

    expect(target).toEqual({ groupId: null, status: "READY" });
  });

  it("keeps a new hybrid group OPENING until the second PRIMARY arrives", () => {
    const first = chooseBootstrapTarget({
      maxSelectable: 2,
      incomingRole: "PRIMARY",
      groups: [],
    });
    expect(first).toEqual({ groupId: null, status: "OPENING" });

    const second = chooseBootstrapTarget({
      maxSelectable: 2,
      incomingRole: "PRIMARY",
      groups: [
        {
          id: "opening",
          status: "OPENING",
          seatsUsed: 0,
          seatsMax: 10,
          primaryOnline: 1,
          createdAt: at("2026-03-01T00:00:00Z"),
        },
      ],
    });
    expect(second).toEqual({ groupId: "opening", status: "READY" });
  });

  it("does not open seats for a FAILOVER-only group", () => {
    const target = chooseBootstrapTarget({
      maxSelectable: 1,
      incomingRole: "FAILOVER",
      groups: [],
    });
    expect(target).toEqual({ groupId: null, status: "OPENING" });
  });
});
