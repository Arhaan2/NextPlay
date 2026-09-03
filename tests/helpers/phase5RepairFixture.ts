import { type PlayCommands } from "../../src/application/commands";
import { COACH_UI } from "../../src/application/commandMetadata";
import type { CommandResult } from "../../src/application/commandResults";
import type { PlayAction } from "../../src/domain/types";
import type { PlayStore } from "../../src/state/playStore";

export const PHASE5_REPAIR_PATCHES = {
  A5: { startSecond: 1.35, durationSecond: 0.25 },
  A6: { startSecond: 1.6, durationSecond: 0.35 },
} as const;

function requireSuccess<T>(result: CommandResult<T>, step: string): Extract<CommandResult<T>, { ok: true }> {
  if (!result.ok) {
    throw new Error(`${step} failed: ${result.code}`);
  }
  return result;
}

function action(store: PlayStore, id: string): PlayAction {
  const found = store.getState().document.actions.find((candidate) => candidate.id === id);
  if (found === undefined) {
    throw new Error(`Canonical repair fixture is missing ${id}.`);
  }
  return found;
}

/** Builds the deterministic coach-intervened document at r5 used by every Phase 5 repair test. */
export function prepareCanonicalPhase5Repair(commands: PlayCommands, store: PlayStore) {
  const initialRevision = store.getState().document.playRevision;
  requireSuccess(commands.addActions({ actions: commands.goldenActions(), expectedRevision: initialRevision }), "Add golden actions");
  requireSuccess(commands.updateAction({ actionId: "A3", expectedRevision: initialRevision + 1, patch: { destinationZone: "right_elbow" } }, COACH_UI), "Coach edit A3");
  requireSuccess(commands.setActionLocked({ actionId: "A3", locked: true, expectedRevision: initialRevision + 2 }), "Lock A3");
  requireSuccess(commands.setActionLocked({ actionId: "A4", locked: true, expectedRevision: initialRevision + 3 }), "Lock A4");
  requireSuccess(commands.setClock({ clockSeconds: 2, expectedRevision: initialRevision + 4 }), "Set 2 second clock");
  requireSuccess(commands.runValidation(), "Validate the coach intervention");

  const a3 = structuredClone(action(store, "A3"));
  const a4 = structuredClone(action(store, "A4"));
  return {
    revision: store.getState().document.playRevision,
    locked: { A3: a3, A4: a4 },
    repairPatches: PHASE5_REPAIR_PATCHES,
  };
}
