import { describe, expect, it } from "vitest";
import {
  attachedSeatCount,
  chooseBootstrapTarget,
  groupSeatView,
  neededSlotsForPool,
  occupiedSeats,
  parseHybridSeats,
  parseHybridSelectable,
  planHybridSeatUpdate,
  selectableBundle,
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
  it("opens the next bundle when the designated primary count is already filled", () => {
    const target = chooseBootstrapTarget({
      maxSelectable: 2,
      incomingRole: "PRIMARY",
      groups: [
        {
          id: "hybrid",
          status: "READY",
          seatsUsed: 3,
          seatsMax: 10,
          primaryOnline: 2,
          createdAt: at("2026-02-01T00:00:00Z"),
        },
      ],
    });

    expect(target).toEqual({ groupId: null, status: "OPENING" });
  });

  it("fills the oldest bundle that is still short of the designated count", () => {
    const target = chooseBootstrapTarget({
      maxSelectable: 2,
      incomingRole: "PRIMARY",
      groups: [
        {
          id: "full",
          status: "READY",
          seatsUsed: 1,
          seatsMax: 10,
          primaryOnline: 2,
          createdAt: at("2026-01-01T00:00:00Z"),
        },
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

    expect(target).toEqual({ groupId: "opening", status: "READY" });
  });

  it("joins a short bundle before opening another when the admin raises the count", () => {
    const target = chooseBootstrapTarget({
      maxSelectable: 3,
      incomingRole: "PRIMARY",
      groups: [
        {
          id: "hybrid",
          status: "READY",
          seatsUsed: 3,
          seatsMax: 10,
          primaryOnline: 2,
          createdAt: at("2026-02-01T00:00:00Z"),
        },
      ],
    });

    expect(target).toEqual({ groupId: "hybrid", status: "READY" });
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

  it("puts the designated node count into one bundle", () => {
    const nodes = [
      { id: "tokyo", role: "PRIMARY", status: "ONLINE" },
      { id: "la", role: "PRIMARY", status: "ONLINE" },
      { id: "extra", role: "PRIMARY", status: "ONLINE" },
      { id: "spare", role: "FAILOVER", status: "ONLINE" },
      { id: "down", role: "PRIMARY", status: "OFFLINE" },
    ];
    expect(selectableBundle(nodes, 2).map((node) => node.id)).toEqual(["tokyo", "la"]);
    expect(selectableBundle(nodes, 3).map((node) => node.id)).toEqual(["tokyo", "la", "extra"]);
  });

  it("skips placeholder nodes when filling the designated count", () => {
    const nodes = [
      { id: "seed-tokyo", role: "PRIMARY", status: "ONLINE", host: "10.0.0.22", password: "seed-only" },
      { id: "tokyo", role: "PRIMARY", status: "ONLINE", host: "203.113.10.8", password: "real" },
      { id: "seed-la", role: "PRIMARY", status: "ONLINE", host: "10.0.0.66", password: "seed-only" },
      { id: "la", role: "PRIMARY", status: "ONLINE", host: "203.113.10.9", password: "real" },
    ];
    expect(selectableBundle(nodes, 2).map((node) => node.id)).toEqual(["tokyo", "la"]);
  });
});

describe("hybrid team limits", () => {
  it("keeps the hybrid node count between 2 and 9", () => {
    expect(parseHybridSelectable(2)).toBe(2);
    expect(parseHybridSelectable(9)).toBe(9);
    expect(parseHybridSelectable(1)).toBeNull();
    expect(parseHybridSelectable(10)).toBeNull();
    expect(parseHybridSelectable(2.5)).toBeNull();
  });

  it("keeps the hybrid team size between 1 and 10", () => {
    expect(parseHybridSeats(1)).toBe(1);
    expect(parseHybridSeats(10)).toBe(10);
    expect(parseHybridSeats(0)).toBeNull();
    expect(parseHybridSeats(11)).toBeNull();
  });

  it("refuses a team size below people already assigned", () => {
    expect(
      planHybridSeatUpdate(
        [
          { id: "ready", status: "READY", seatsUsed: 4 },
          { id: "opening", status: "OPENING", seatsUsed: 0 },
          { id: "old", status: "DRAINING", seatsUsed: 9 },
        ],
        3
      )
    ).toEqual({ ok: false, error: "seats_below_used" });
  });

  it("updates ready and opening teams together", () => {
    expect(
      planHybridSeatUpdate(
        [
          { id: "ready", status: "READY", seatsUsed: 2 },
          { id: "opening", status: "OPENING", seatsUsed: 0 },
        ],
        2
      )
    ).toEqual({ ok: true, groupIds: ["ready", "opening"] });
  });
});
