import { describe, expect, it } from "vitest";

import { assertLockedActionsPreserved, snapshotLockedActions } from "../../src/application/lockGuard";
import { createGoldenActionBatch, createDemoPreset } from "../../src/domain/presets";
import {
  actionBatchSchema,
  actionPatchSchema,
  playActionInputSchema,
} from "../../src/domain/schemas";
import type { PlayAction, PlayActionInput } from "../../src/domain/types";
import { ZONE_IDS, ZONES, findClosestZone, getZonePoint, isZoneId } from "../../src/domain/zones";

const expectedZones = {
  inbound_left: { x: 0, y: 30 },
  inbound_right: { x: 100, y: 30 },
  rim: { x: 50, y: 13 },
  left_block: { x: 36, y: 26 },
  right_block: { x: 64, y: 26 },
  left_short_corner: { x: 18, y: 20 },
  right_short_corner: { x: 82, y: 20 },
  left_corner: { x: 8, y: 36 },
  right_corner: { x: 92, y: 36 },
  left_elbow: { x: 35, y: 44 },
  right_elbow: { x: 65, y: 44 },
  nail: { x: 50, y: 48 },
  top: { x: 50, y: 74 },
  left_slot: { x: 35, y: 65 },
  right_slot: { x: 65, y: 65 },
  left_wing: { x: 15, y: 57 },
  right_wing: { x: 85, y: 57 },
  backcourt_center: { x: 50, y: 94 },
};

const validActions: PlayActionInput[] = [
  { type: "move", actorId: "O1", destinationZone: "left_wing", startSecond: 0, durationSecond: 1 },
  { type: "dribble", actorId: "O2", destinationZone: "top", startSecond: 0, durationSecond: 1 },
  { type: "screen", actorId: "O3", targetPlayerId: "O2", destinationZone: "right_block", screenType: "pin_down", startSecond: 0, durationSecond: 1 },
  { type: "pass", actorId: "O1", targetPlayerId: "O2", startSecond: 0, durationSecond: 1 },
  { type: "shot", actorId: "O2", startSecond: 0, durationSecond: 1 },
];

function storedLockedAction(): PlayAction {
  return {
    ...createGoldenActionBatch()[2],
    id: "A3",
    locked: true,
    lockOwner: "coach",
    createdBy: "agent",
    lastModifiedBy: "coach",
    createdAtRevision: 1,
    updatedAtRevision: 2,
  };
}

describe("semantic court zones", () => {
  it("exposes the exact supported vocabulary and normalized coordinates", () => {
    expect(ZONES).toEqual(expectedZones);
    expect(ZONE_IDS).toEqual(Object.keys(expectedZones));
    expect(getZonePoint("right_elbow")).toEqual({ x: 65, y: 44 });
    expect(getZonePoint("right_elbow")).not.toBe(ZONES.right_elbow);
    expect(isZoneId("right_elbow")).toBe(true);
    expect(isZoneId("not-a-zone")).toBe(false);
  });

  it("chooses the nearest zone and resolves an exact nearest-zone tie by documented order", () => {
    expect(findClosestZone({ x: 35, y: 44 })).toBe("left_elbow");
    // This point is equidistant from left_block and left_short_corner; left_block comes first.
    expect(findClosestZone({ x: 27, y: 23 })).toBe("left_block");
  });
});

describe("strict action input schemas", () => {
  it("accepts every supported action type", () => {
    for (const action of validActions) {
      expect(playActionInputSchema.safeParse(action).success).toBe(true);
    }
  });

  it("requires action-specific fields", () => {
    expect(playActionInputSchema.safeParse({ type: "move", actorId: "O1", startSecond: 0, durationSecond: 1 }).success).toBe(false);
    expect(playActionInputSchema.safeParse({ type: "dribble", actorId: "O1", startSecond: 0, durationSecond: 1 }).success).toBe(false);
    expect(playActionInputSchema.safeParse({ type: "screen", actorId: "O1", targetPlayerId: "O2", screenType: "pin_down", startSecond: 0, durationSecond: 1 }).success).toBe(false);
    expect(playActionInputSchema.safeParse({ type: "screen", actorId: "O1", destinationZone: "rim", screenType: "pin_down", startSecond: 0, durationSecond: 1 }).success).toBe(false);
    expect(playActionInputSchema.safeParse({ type: "screen", actorId: "O1", destinationZone: "rim", targetPlayerId: "O2", startSecond: 0, durationSecond: 1 }).success).toBe(false);
    expect(playActionInputSchema.safeParse({ type: "pass", actorId: "O1", startSecond: 0, durationSecond: 1 }).success).toBe(false);
  });

  it("rejects unknown fields, invalid references, invalid zones, and invalid numeric boundaries", () => {
    expect(playActionInputSchema.safeParse({ ...validActions[0], unexpected: true }).success).toBe(false);
    expect(playActionInputSchema.safeParse({ ...validActions[0], actorId: "X1" }).success).toBe(false);
    expect(playActionInputSchema.safeParse({ ...validActions[0], destinationZone: "paint" }).success).toBe(false);
    expect(playActionInputSchema.safeParse({ ...validActions[3], targetPlayerId: "X2" }).success).toBe(false);
    expect(playActionInputSchema.safeParse({ ...validActions[4], destinationZone: "rim" }).success).toBe(false);

    for (const startSecond of [Number.NaN, Number.POSITIVE_INFINITY, -0.01]) {
      expect(playActionInputSchema.safeParse({ ...validActions[0], startSecond }).success).toBe(false);
    }
    for (const durationSecond of [Number.NaN, Number.POSITIVE_INFINITY, 0, -0.01]) {
      expect(playActionInputSchema.safeParse({ ...validActions[0], durationSecond }).success).toBe(false);
    }
    expect(playActionInputSchema.safeParse({ ...validActions[0], destinationPosition: { x: Number.NaN, y: 1 } }).success).toBe(false);
  });

  it("bounds batches and rejects empty or protected update patches", () => {
    expect(actionBatchSchema.safeParse([]).success).toBe(false);
    expect(actionBatchSchema.safeParse(Array.from({ length: 13 }, () => validActions[0])).success).toBe(false);
    expect(actionPatchSchema.safeParse({}).success).toBe(false);
    expect(actionPatchSchema.safeParse({ id: "A1" }).success).toBe(false);
    expect(actionPatchSchema.safeParse({ locked: true }).success).toBe(false);
    expect(actionPatchSchema.safeParse({ type: "shot" }).success).toBe(false);
  });
});

describe("deterministic SLOB preset", () => {
  it("has the exact initial offense, all unique players, and a pristine revision-zero document", () => {
    const preset = createDemoPreset();

    expect(preset).toMatchObject({
      id: "nextplay-slob-demo",
      playRevision: 0,
      scenario: "sideline_out_of_bounds",
      clockSeconds: 4.2,
      defenseScheme: "man",
      targetOutcome: "Right-corner three for O2",
      ballOwnerId: "O1",
      actions: [],
    });
    expect(preset.players.filter((player) => player.team === "offense").map((player) => [player.id, player.role, player.startingZone])).toEqual([
      ["O1", "inbounder", "inbound_right"],
      ["O2", "shooter", "right_block"],
      ["O3", "weak-side wing", "left_corner"],
      ["O4", "decoy cutter", "left_elbow"],
      ["O5", "screener", "right_elbow"],
    ]);
    expect(preset.players).toHaveLength(10);
    expect(new Set(preset.players.map((player) => player.id)).size).toBe(10);
  });

  it("returns deeply equal but independently mutable documents", () => {
    const first = createDemoPreset();
    const second = createDemoPreset();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.players).not.toBe(second.players);
    expect(first.players[0]).not.toBe(second.players[0]);
    first.players[0].startingPosition.x = 42;
    expect(second.players[0].startingPosition.x).toBe(100);
  });
});

describe("lock snapshots", () => {
  it("detects an indirect tactical mutation to a complete locked-action snapshot", () => {
    const locked = storedLockedAction();
    const snapshots = snapshotLockedActions([locked]);
    const changed = { ...locked, destinationZone: "right_elbow" as const };

    expect(() => assertLockedActionsPreserved(snapshots, [changed])).toThrow(/LOCK_VIOLATION|must remain unchanged/);
  });
});
