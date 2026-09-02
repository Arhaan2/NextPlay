import { ExpectedCommandError } from "./commandResults";
import type { PlayAction } from "../domain/types";

export type LockedActionSnapshot = Map<string, PlayAction>;

export function snapshotLockedActions(actions: PlayAction[]): LockedActionSnapshot {
  return new Map(actions.filter((action) => action.locked).map((action) => [action.id, structuredClone(action)]));
}

export function assertLockedActionsPreserved(
  before: LockedActionSnapshot,
  after: PlayAction[],
): void {
  for (const [actionId, snapshot] of before) {
    const current = after.find((action) => action.id === actionId);
    if (current === undefined || JSON.stringify(current) !== JSON.stringify(snapshot)) {
      throw new ExpectedCommandError(
        "LOCK_VIOLATION",
        `Locked action ${actionId} must remain unchanged.`,
        { actionId },
      );
    }
  }
}

export function assertCoachLockChangeOnly(
  before: PlayAction,
  after: PlayAction,
): void {
  const allowedBefore = { ...before, locked: undefined, lockOwner: undefined, lastModifiedBy: undefined, updatedAtRevision: undefined };
  const allowedAfter = { ...after, locked: undefined, lockOwner: undefined, lastModifiedBy: undefined, updatedAtRevision: undefined };
  if (JSON.stringify(allowedBefore) !== JSON.stringify(allowedAfter)) {
    throw new ExpectedCommandError("LOCK_VIOLATION", `Lock action ${before.id} changed tactical fields.`, { actionId: before.id });
  }
}
