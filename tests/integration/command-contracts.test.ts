import { describe, expect, it } from "vitest";

import { AGENT_WEBMCP, COACH_UI, metadataFor } from "../../src/application/commandMetadata";
import { executeContentTransaction } from "../../src/application/transaction";
import { createDemoPreset, createGoldenActionBatch } from "../../src/domain/presets";
import type { CommandResult } from "../../src/application/commandResults";
import type { PlayStore } from "../../src/state/playStore";
import { createPlayTestContext } from "../helpers/playTestContext";

function expectSuccess<T>(result: CommandResult<T>): asserts result is Extract<CommandResult<T>, { ok: true }> {
  expect(result.ok).toBe(true);
}

function expectFailure<T>(result: CommandResult<T>, code: string): asserts result is Extract<CommandResult<T>, { ok: false }> {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.code).toBe(code);
  }
}

function expectInvalidEnvelope(
  store: PlayStore,
  beforeDocument: ReturnType<PlayStore["getState"]>["document"],
  result: CommandResult<unknown>,
): void {
  expectFailure(result, "INVALID_INPUT");
  expect(store.getState().document).toEqual(beforeDocument);
  expect(store.getState().session.activity.at(-1)).toMatchObject({
    status: "failed",
    revisionBefore: beforeDocument.playRevision,
    revisionAfter: beforeDocument.playRevision,
  });
}

describe("Phase 1 shared play commands", () => {
  it("commits the canonical six-action batch atomically with stable IDs and metadata", () => {
    const { commands, store } = createPlayTestContext();
    const before = structuredClone(store.getState().document);

    const result = commands.addActions(commands.goldenActions());

    expectSuccess(result);
    expect(result).toMatchObject({ revision: 1, data: { actionIds: ["A1", "A2", "A3", "A4", "A5", "A6"] } });
    const document = store.getState().document;
    expect(document.playRevision).toBe(before.playRevision + 1);
    expect(document.actions).toHaveLength(6);
    expect(document.actions.map((action) => action.id)).toEqual(["A1", "A2", "A3", "A4", "A5", "A6"]);
    expect(document.actions.map((action) => ({
      type: action.type,
      actorId: action.actorId,
      targetPlayerId: "targetPlayerId" in action ? action.targetPlayerId : undefined,
      destinationZone: "destinationZone" in action ? action.destinationZone : undefined,
      pathStyle: action.pathStyle,
      screenType: "screenType" in action ? action.screenType : undefined,
      startSecond: action.startSecond,
      durationSecond: action.durationSecond,
      label: action.label,
    }))).toEqual([
      { type: "move", actorId: "O3", targetPlayerId: undefined, destinationZone: "left_wing", pathStyle: undefined, screenType: undefined, startSecond: 0, durationSecond: 0.75, label: "Clear" },
      { type: "move", actorId: "O4", targetPlayerId: undefined, destinationZone: "rim", pathStyle: undefined, screenType: undefined, startSecond: 0, durationSecond: 0.85, label: "Decoy cut" },
      { type: "screen", actorId: "O5", targetPlayerId: "O2", destinationZone: "right_block", pathStyle: undefined, screenType: "pin_down", startSecond: 0.15, durationSecond: 0.8, label: "Pin-down" },
      { type: "move", actorId: "O2", targetPlayerId: undefined, destinationZone: "right_corner", pathStyle: "flare", screenType: undefined, startSecond: 0.3, durationSecond: 1.05, label: "Corner flare" },
      { type: "pass", actorId: "O1", targetPlayerId: "O2", destinationZone: undefined, pathStyle: undefined, screenType: undefined, startSecond: 1.4, durationSecond: 0.3, label: "Inbound pass" },
      { type: "shot", actorId: "O2", targetPlayerId: undefined, destinationZone: undefined, pathStyle: undefined, screenType: undefined, startSecond: 1.72, durationSecond: 0.43, label: "Corner three" },
    ]);
    expect(document.actions.map((action) => ({
      actorId: action.actorId,
      createdBy: action.createdBy,
      lastModifiedBy: action.lastModifiedBy,
      createdAtRevision: action.createdAtRevision,
      updatedAtRevision: action.updatedAtRevision,
      locked: action.locked,
      lockOwner: action.lockOwner,
    }))).toEqual([
      { actorId: "O3", createdBy: "agent", lastModifiedBy: "agent", createdAtRevision: 1, updatedAtRevision: 1, locked: false, lockOwner: undefined },
      { actorId: "O4", createdBy: "agent", lastModifiedBy: "agent", createdAtRevision: 1, updatedAtRevision: 1, locked: false, lockOwner: undefined },
      { actorId: "O5", createdBy: "agent", lastModifiedBy: "agent", createdAtRevision: 1, updatedAtRevision: 1, locked: false, lockOwner: undefined },
      { actorId: "O2", createdBy: "agent", lastModifiedBy: "agent", createdAtRevision: 1, updatedAtRevision: 1, locked: false, lockOwner: undefined },
      { actorId: "O1", createdBy: "agent", lastModifiedBy: "agent", createdAtRevision: 1, updatedAtRevision: 1, locked: false, lockOwner: undefined },
      { actorId: "O2", createdBy: "agent", lastModifiedBy: "agent", createdAtRevision: 1, updatedAtRevision: 1, locked: false, lockOwner: undefined },
    ]);
    expect(document.actions[5]).not.toHaveProperty("destinationZone");
    expect(store.getState().session.activity).toEqual([expect.objectContaining({
      id: "test-activity-1",
      timestamp: 1_700_000_000_000,
      actor: "agent",
      channel: "webmcp",
      operation: "add_actions",
      status: "completed",
      revisionBefore: 0,
      revisionAfter: 1,
    })]);
  });

  it("rejects an invalid batch without changing any document content or consuming IDs", () => {
    const { commands, store } = createPlayTestContext();
    const invalid = createGoldenActionBatch();
    invalid[2] = { ...invalid[2], destinationZone: "not_a_zone" } as unknown as (typeof invalid)[number];
    const before = structuredClone(store.getState().document);

    const rejected = commands.addActions(invalid);

    expectFailure(rejected, "INVALID_INPUT");
    expect(rejected.revision).toBe(0);
    expect(store.getState().document).toEqual(before);
    expect(store.getState().session.activity.at(-1)).toMatchObject({ status: "failed", revisionBefore: 0, revisionAfter: 0 });

    const accepted = commands.addActions(commands.goldenActions());
    expectSuccess(accepted);
    expect(accepted.data.actionIds).toEqual(["A1", "A2", "A3", "A4", "A5", "A6"]);
  });

  it("rejects stale expected revisions before mutation and records an equal-revision failure", () => {
    const { commands, store } = createPlayTestContext();
    expectSuccess(commands.setClock({ clockSeconds: 3 }));
    const before = structuredClone(store.getState().document);

    const result = commands.setClock({ clockSeconds: 2, expectedRevision: 0 });

    expectFailure(result, "STALE_PLAY_STATE");
    expect(result.revision).toBe(1);
    expect(store.getState().document).toEqual(before);
    expect(store.getState().session.activity.at(-1)).toMatchObject({
      actor: "coach",
      channel: "ui",
      operation: "set_clock",
      status: "failed",
      revisionBefore: 1,
      revisionAfter: 1,
    });
  });

  it("changes only the clock content and increments its revision once", () => {
    const { commands, store } = createPlayTestContext();
    const before = structuredClone(store.getState().document);

    const result = commands.setClock({ clockSeconds: 2 });

    expectSuccess(result);
    expect(store.getState().document).toEqual({ ...before, clockSeconds: 2, playRevision: 1 });
  });

  it("enforces coach UI lock authority, preserves the complete locked action, and supports UI unlock", () => {
    const { commands, store } = createPlayTestContext();
    expectSuccess(commands.addActions(commands.goldenActions()));
    const original = structuredClone(store.getState().document.actions[2]);

    const locked = commands.setActionLocked({ actionId: "A3", locked: true });
    expectSuccess(locked);
    expect(locked.revision).toBe(2);
    const lockedAction = structuredClone(store.getState().document.actions[2]);
    expect(lockedAction).toEqual({
      ...original,
      locked: true,
      lockOwner: "coach",
      lastModifiedBy: "coach",
      updatedAtRevision: 2,
    });

    const rejectedUpdate = commands.updateAction({ actionId: "A3", patch: { destinationZone: "right_elbow" } });
    expectFailure(rejectedUpdate, "ACTION_LOCKED");
    expect(store.getState().document.playRevision).toBe(2);
    expect(store.getState().document.actions[2]).toEqual(lockedAction);
    expect(store.getState().session.activity.at(-1)).toMatchObject({ status: "failed", revisionBefore: 2, revisionAfter: 2 });

    const nonUi = commands.setActionLocked({ actionId: "A3", locked: false }, AGENT_WEBMCP);
    expectFailure(nonUi, "UNAUTHORIZED_LOCK_CHANGE");
    expect(store.getState().document.playRevision).toBe(2);
    expect(store.getState().document.actions[2]).toEqual(lockedAction);

    const coachOverWebMcp = commands.setActionLocked({ actionId: "A3", locked: false }, { actor: "coach", channel: "webmcp" });
    expectFailure(coachOverWebMcp, "UNAUTHORIZED_LOCK_CHANGE");
    expect(store.getState().document.playRevision).toBe(2);
    expect(store.getState().document.actions[2]).toEqual(lockedAction);

    const unlocked = commands.setActionLocked({ actionId: "A3", locked: false }, COACH_UI);
    expectSuccess(unlocked);
    expect(unlocked.revision).toBe(3);
    expect(store.getState().document.actions[2]).toEqual({
      ...original,
      locked: false,
      lastModifiedBy: "coach",
      updatedAtRevision: 3,
    });
  });

  it("rejects low-level indirect locked-action mutation at the transaction boundary without committing", () => {
    const { commands, dependencies, store } = createPlayTestContext();
    expectSuccess(commands.addActions(commands.goldenActions()));
    expectSuccess(commands.setActionLocked({ actionId: "A3", locked: true }));
    const before = structuredClone(store.getState().document);

    const result = executeContentTransaction(
      store,
      dependencies,
      metadataFor("test_indirect_mutation", AGENT_WEBMCP),
      { summary: () => "Attempted an indirect locked mutation." },
      (draft) => {
        const action = draft.actions.find((candidate) => candidate.id === "A3");
        if (action === undefined || action.type !== "screen") {
          throw new Error("Test fixture is missing A3 screen action.");
        }
        action.destinationZone = "right_elbow";
        return { actionId: action.id };
      },
    );

    expectFailure(result, "LOCK_VIOLATION");
    expect(store.getState().document).toEqual(before);
    expect(store.getState().session.activity.at(-1)).toMatchObject({
      operation: "test_indirect_mutation",
      status: "failed",
      revisionBefore: 2,
      revisionAfter: 2,
    });
  });

  it("keeps session-only selection and activity appends out of the content revision", () => {
    const first = createPlayTestContext();
    const second = createPlayTestContext();

    first.commands.selectAction("A1");
    const activity = first.commands.appendActivity({
      actor: "system",
      channel: "preset",
      operation: "test_note",
      summary: "A deterministic session note.",
      revisionBefore: 0,
      revisionAfter: 0,
      status: "completed",
    });

    expect(first.store.getState().document.playRevision).toBe(0);
    expect(first.store.getState().session.selectedActionId).toBe("A1");
    expect(activity).toMatchObject({ id: "test-activity-1", timestamp: 1_700_000_000_000 });
    expect(second.store.getState().document).toEqual(createDemoPreset());
    expect(second.store.getState().session.activity).toEqual([]);
  });

  it("resets to pristine demo content while preserving monotonic runtime revision and compatible session fields", () => {
    const { commands, store } = createPlayTestContext();
    expectSuccess(commands.addActions(commands.goldenActions()));
    commands.selectAction("A3");
    store.getState().updateSession((session) => ({
      ...session,
      webmcp: { available: true, registeredToolNames: ["future_tool"] },
      validation: { status: "complete", errors: ["stale"], warnings: ["stale"] },
      animation: { status: "playing", currentSecond: 1, speed: 2, loop: true },
    }));

    const result = commands.resetDemo();

    expectSuccess(result);
    expect(result.revision).toBe(2);
    expect(store.getState().document).toEqual({ ...createDemoPreset(), playRevision: 2 });
    expect(store.getState().session.selectedActionId).toBeUndefined();
    expect(store.getState().session).toMatchObject({
      validation: { status: "not_run", errors: [], warnings: [] },
      animation: { status: "idle", currentSecond: 0, speed: 1, loop: false },
      webmcp: { available: true, registeredToolNames: ["future_tool"] },
      activity: [expect.objectContaining({ operation: "reset_demo", status: "completed", revisionBefore: 1, revisionAfter: 2 })],
    });
  });

  it("does not allow loadDemoPreset to remove a pre-existing locked action", () => {
    const { commands, store } = createPlayTestContext();
    expectSuccess(commands.addActions(commands.goldenActions()));
    expectSuccess(commands.setActionLocked({ actionId: "A3", locked: true }));
    const before = structuredClone(store.getState().document);

    const result = commands.loadDemoPreset();

    expectFailure(result, "LOCK_VIOLATION");
    expect(result.revision).toBe(2);
    expect(store.getState().document).toEqual(before);
    expect(store.getState().session.activity.at(-1)).toMatchObject({
      operation: "load_demo_preset",
      status: "failed",
      revisionBefore: 2,
      revisionAfter: 2,
    });
  });

  it("rejects unknown properties on every public content-command envelope", () => {
    const add = createPlayTestContext();
    const addBefore = structuredClone(add.store.getState().document);
    expectInvalidEnvelope(
      add.store,
      addBefore,
      add.commands.addActions({ actions: add.commands.goldenActions(), unexpected: true } as unknown as Parameters<typeof add.commands.addActions>[0]),
    );

    const clock = createPlayTestContext();
    const clockBefore = structuredClone(clock.store.getState().document);
    expectInvalidEnvelope(
      clock.store,
      clockBefore,
      clock.commands.setClock({ clockSeconds: 2, unexpected: true } as unknown as Parameters<typeof clock.commands.setClock>[0]),
    );

    const update = createPlayTestContext();
    expectSuccess(update.commands.addActions(update.commands.goldenActions()));
    const updateBefore = structuredClone(update.store.getState().document);
    expectInvalidEnvelope(
      update.store,
      updateBefore,
      update.commands.updateAction({ actionId: "A1", patch: { label: "Changed" }, unexpected: true } as unknown as Parameters<typeof update.commands.updateAction>[0]),
    );

    const lock = createPlayTestContext();
    expectSuccess(lock.commands.addActions(lock.commands.goldenActions()));
    const lockBefore = structuredClone(lock.store.getState().document);
    expectInvalidEnvelope(
      lock.store,
      lockBefore,
      lock.commands.setActionLocked({ actionId: "A3", locked: true, unexpected: true } as unknown as Parameters<typeof lock.commands.setActionLocked>[0]),
    );

    const reset = createPlayTestContext();
    const resetBefore = structuredClone(reset.store.getState().document);
    expectInvalidEnvelope(
      reset.store,
      resetBefore,
      reset.commands.resetDemo({ unexpected: true } as unknown as Parameters<typeof reset.commands.resetDemo>[0]),
    );
  });

  it("returns INVALID_INPUT, not stale-state, for malformed expectedRevision values", () => {
    const add = createPlayTestContext();
    const addBefore = structuredClone(add.store.getState().document);
    expectInvalidEnvelope(
      add.store,
      addBefore,
      add.commands.addActions({ actions: add.commands.goldenActions(), expectedRevision: "zero" } as unknown as Parameters<typeof add.commands.addActions>[0]),
    );

    const clock = createPlayTestContext();
    const clockBefore = structuredClone(clock.store.getState().document);
    expectInvalidEnvelope(
      clock.store,
      clockBefore,
      clock.commands.setClock({ clockSeconds: 2, expectedRevision: Number.NaN }),
    );

    const update = createPlayTestContext();
    expectSuccess(update.commands.addActions(update.commands.goldenActions()));
    const updateBefore = structuredClone(update.store.getState().document);
    expectInvalidEnvelope(
      update.store,
      updateBefore,
      update.commands.updateAction({ actionId: "A1", patch: { label: "Changed" }, expectedRevision: Number.POSITIVE_INFINITY }),
    );

    const lock = createPlayTestContext();
    expectSuccess(lock.commands.addActions(lock.commands.goldenActions()));
    const lockBefore = structuredClone(lock.store.getState().document);
    expectInvalidEnvelope(
      lock.store,
      lockBefore,
      lock.commands.setActionLocked({ actionId: "A3", locked: true, expectedRevision: "two" } as unknown as Parameters<typeof lock.commands.setActionLocked>[0]),
    );

    const reset = createPlayTestContext();
    const resetBefore = structuredClone(reset.store.getState().document);
    expectInvalidEnvelope(
      reset.store,
      resetBefore,
      reset.commands.resetDemo({ expectedRevision: [] } as unknown as Parameters<typeof reset.commands.resetDemo>[0]),
    );
  });

  it("rejects protected update fields and non-boolean lock values without mutating content", () => {
    const update = createPlayTestContext();
    expectSuccess(update.commands.addActions(update.commands.goldenActions()));
    const updateBefore = structuredClone(update.store.getState().document);
    expectInvalidEnvelope(
      update.store,
      updateBefore,
      update.commands.updateAction({ actionId: "A1", patch: { locked: true } }),
    );

    const lock = createPlayTestContext();
    expectSuccess(lock.commands.addActions(lock.commands.goldenActions()));
    const lockBefore = structuredClone(lock.store.getState().document);
    expectInvalidEnvelope(
      lock.store,
      lockBefore,
      lock.commands.setActionLocked({ actionId: "A3", locked: "true" } as unknown as Parameters<typeof lock.commands.setActionLocked>[0]),
    );
  });
});
