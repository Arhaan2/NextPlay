import { describe, expect, it } from "vitest";

import { createDemoPreset, createGoldenActionBatch } from "../../src/domain/presets";
import type { PlayAction, PlayDocument } from "../../src/domain/types";
import { getBallStateAt } from "../../src/engine/animation/ballPosition";
import { getPlayerPositionAt, getPlayDuration } from "../../src/engine/animation/playerPositions";
import { actionEndSecond } from "../../src/engine/time/seconds";
import { possessionEvents, validatePlay } from "../../src/engine/validation";
import { getZonePoint } from "../../src/domain/zones";

function goldenDocument(): PlayDocument {
  const document = createDemoPreset();
  document.actions = createGoldenActionBatch().map((action, index) => ({
    ...action,
    id: `A${index + 1}`,
    locked: false,
    createdBy: "agent",
    lastModifiedBy: "agent",
    createdAtRevision: 1,
    updatedAtRevision: 1,
  }));
  document.playRevision = 1;
  return document;
}

function withClock(clockSeconds: number): PlayDocument {
  return { ...structuredClone(goldenDocument()), clockSeconds };
}

describe("Phase 4 deterministic validation", () => {
  it("validates the canonical fixture with 7 ordered passing checks and no mutation", () => {
    const document = goldenDocument();
    const before = structuredClone(document);
    const first = validatePlay(document);
    const second = validatePlay(document);

    expect(first).toMatchObject({ status: "complete", validatedRevision: 1, valid: true, checksPassed: 7, checksTotal: 7, errors: [], warnings: [] });
    expect(first.checks.map((check) => check.id)).toEqual(["references", "clock", "player_overlap", "inbound_pass", "shot_present", "pass_possession", "shot_possession"]);
    expect(first.checks.every((check) => check.status === "passed")).toBe(true);
    expect(second).toEqual(first);
    expect(document).toEqual(before);
  });

  it("reports the exact A6 overflow while accepting an action that ends exactly at the clock", () => {
    const report = validatePlay(withClock(2));
    expect(report.errors).toContainEqual(expect.objectContaining({
      code: "CLOCK_OVERFLOW", actionId: "A6", playerId: "O2", startSecond: 1.72,
      endSecond: 2.15, clockSeconds: 2, overBySeconds: 0.15,
    }));
    const exact = withClock(2.15);
    expect(actionEndSecond(exact.actions[5])).toBe(2.15);
    expect(validatePlay(exact).errors.filter((issue) => issue.code === "CLOCK_OVERFLOW")).toEqual([]);
  });

  it("uses half-open overlap intervals in stable actor/action order", () => {
    const document = goldenDocument();
    document.actions.push({ ...document.actions[0], id: "A7", actorId: "O1", destinationZone: "top", startSecond: 1.7, durationSecond: 0.3 } as unknown as PlayAction);
    document.actions.push({ ...document.actions[4], id: "A8", actorId: "O1", targetPlayerId: "O2", startSecond: 2, durationSecond: 0.2 } as unknown as PlayAction);
    expect(validatePlay(document).errors.filter((issue) => issue.code === "PLAYER_ACTION_OVERLAP")).toEqual([]);

    document.actions[7] = { ...document.actions[7], startSecond: 1.99 };
    expect(validatePlay(document).errors).toContainEqual(expect.objectContaining({
      code: "PLAYER_ACTION_OVERLAP", actionId: "A7", relatedActionId: "A8", playerId: "O1", startSecond: 1.99, endSecond: 2,
    }));
  });

  it("returns malformed read-side references as stable issues instead of throwing", () => {
    const document = goldenDocument();
    document.actions.push({ ...document.actions[0], id: "A1", actorId: "X1" } as unknown as PlayAction);
    document.actions.push({ ...document.actions[2], id: "A7", targetPlayerId: "X1", destinationZone: "missing", durationSecond: Number.NaN } as unknown as PlayAction);
    const report = validatePlay(document);

    expect(report.checks[0]).toMatchObject({ id: "references", status: "failed" });
    expect(report.errors.filter((issue) => issue.code === "INVALID_ACTION_REFERENCE").map((issue) => issue.actionId)).toEqual(["A1", "A1", "A7", "A7", "A7"]);
  });

  it("covers missing scenario actions and exact possession ordering without invalid-pass transfer", () => {
    const noPass = goldenDocument();
    noPass.actions = noPass.actions.filter((action) => action.type !== "pass");
    expect(validatePlay(noPass).errors).toContainEqual(expect.objectContaining({ code: "MISSING_INBOUND_PASS" }));
    const halfCourt = { ...structuredClone(noPass), scenario: "half_court" as const };
    expect(validatePlay(halfCourt).checks.find((check) => check.id === "inbound_pass")).toMatchObject({ status: "not_applicable", errorCount: 0 });

    const invalidPass = goldenDocument();
    invalidPass.actions[4] = { ...invalidPass.actions[4], actorId: "O3" };
    const invalid = validatePlay(invalidPass);
    expect(invalid.errors).toContainEqual(expect.objectContaining({ code: "INVALID_PASS_POSSESSION", actionId: "A5" }));
    expect(invalid.errors).toContainEqual(expect.objectContaining({ code: "INVALID_SHOT_POSSESSION", actionId: "A6", actualOwnerId: "O1" }));

    const sameTime = goldenDocument();
    sameTime.actions[5] = { ...sameTime.actions[5], startSecond: 1.7 };
    expect(validatePlay(sameTime).errors.filter((issue) => issue.code === "INVALID_SHOT_POSSESSION")).toEqual([]);
    expect(possessionEvents(sameTime).filter((event) => event.time === 1.7).map((event) => event.kind)).toEqual(["pass_complete", "shot_start"]);

    const tooEarly = goldenDocument();
    tooEarly.actions[5] = { ...tooEarly.actions[5], startSecond: 1.699 };
    expect(validatePlay(tooEarly).errors).toContainEqual(expect.objectContaining({ code: "INVALID_SHOT_POSSESSION", actionId: "A6" }));
  });
});

describe("Phase 4 pure animation helpers", () => {
  it("derives duration, static defense, boundary positions, and a curved flare without mutation", () => {
    const document = goldenDocument();
    const before = structuredClone(document);
    expect(getPlayDuration(document)).toBe(2.15);
    expect(getPlayDuration(createDemoPreset())).toBe(0);
    expect(getPlayerPositionAt(document, "O3", 0)).toEqual(getZonePoint("left_corner"));
    expect(getPlayerPositionAt(document, "O3", 0.75)).toEqual(getZonePoint("left_wing"));
    expect(getPlayerPositionAt(document, "O4", 0.85)).toEqual(getZonePoint("rim"));
    expect(getPlayerPositionAt(document, "O5", 1.2)).toEqual(getZonePoint("right_block"));
    expect(getPlayerPositionAt(document, "O1", 2)).toEqual(getZonePoint("inbound_right"));
    expect(getPlayerPositionAt(document, "X1", 0)).toEqual(getPlayerPositionAt(document, "X1", 2.15));
    const start = getPlayerPositionAt(document, "O2", 0.3);
    const midpoint = getPlayerPositionAt(document, "O2", 0.825);
    const end = getPlayerPositionAt(document, "O2", 1.35);
    expect(start).toEqual(getZonePoint("right_block"));
    expect(end).toEqual(getZonePoint("right_corner"));
    expect(midpoint).not.toEqual({ x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 });
    expect(document).toEqual(before);
  });

  it("keeps ball ownership and phases correct at pass and shot boundaries", () => {
    const document = goldenDocument();
    expect(getBallStateAt(document, 0)).toMatchObject({ phase: "held", ownerId: "O1" });
    expect(getBallStateAt(document, 1.55)).toMatchObject({ phase: "passing", actionId: "A5" });
    expect(getBallStateAt(document, 1.7)).toMatchObject({ phase: "held", ownerId: "O2" });
    expect(getBallStateAt(document, 1.71)).toMatchObject({ phase: "held", ownerId: "O2" });
    expect(getBallStateAt(document, 1.9)).toMatchObject({ phase: "shooting", actionId: "A6" });
    expect(getBallStateAt(document, 2.15)).toEqual({ position: getZonePoint("rim"), phase: "at_rim", actionId: "A6" });
    expect(getBallStateAt(document, 1.55)).toEqual(getBallStateAt(document, 1.55));
  });
});
