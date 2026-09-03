import { z } from "zod";

import { ExpectedCommandError, commandFailure, type CommandResult } from "./commandResults";
import type { CommandMetadata } from "./commandMetadata";
import { assertLockedActionsPreserved, snapshotLockedActions, type LockedActionSnapshot } from "./lockGuard";
import { StructuralInvariantError, assertStructuralInvariants } from "../domain/invariants";
import type { ActivityEvent, PlayAction, PlayDocument } from "../domain/types";
import type { PlayStore } from "../state/playStore";
import { refreshSessionAfterContentMutation } from "./sessionCommands";
import type { AnimationController } from "../engine/animation/animationController";

export interface CommandDependencies {
  now: () => number;
  createActivityId: (sequence: number) => string;
  animationController?: AnimationController;
}

export const deterministicCommandDependencies: CommandDependencies = {
  now: () => 0,
  createActivityId: (sequence) => `activity-${sequence}`,
};

export interface TransactionOptions<TResult> {
  expectedRevision?: number;
  expectedRevisionFrom?: () => unknown;
  preserveLockedActionIdFrom?: () => string | undefined;
  validateInput?: () => void;
  preserveLockedActionId?: string;
  /** Demo replacement is the sole content command allowed to replace locked actions. */
  replaceWholeDocument?: boolean;
  summary: (data: TResult) => string;
  details?: (data: TResult) => unknown;
  onCommitted?: () => void;
}

export type DraftMutation<TResult> = (draft: PlayDocument, nextRevision: number) => TResult;

function validationCounts(store: PlayStore): { errors: number; warnings: number } {
  const validation = store.getState().session.validation;
  return { errors: validation.errors.length, warnings: validation.warnings.length };
}

export function appendActivityEvent(
  store: PlayStore,
  dependencies: CommandDependencies,
  event: Omit<ActivityEvent, "id" | "timestamp">,
): ActivityEvent {
  const state = store.getState();
  const sequence = state.session.nextActivitySequence;
  const created: ActivityEvent = {
    ...event,
    id: dependencies.createActivityId(sequence),
    timestamp: dependencies.now(),
  };
  state.updateSession((session) => ({
    ...session,
    activity: [...session.activity, created],
    nextActivitySequence: sequence + 1,
  }));
  return created;
}

function expectedErrorFrom(error: unknown): ExpectedCommandError | undefined {
  if (error instanceof ExpectedCommandError) {
    return error;
  }
  if (error instanceof StructuralInvariantError) {
    return new ExpectedCommandError("INVALID_ACTION_REFERENCE", error.message, error.details);
  }
  if (error instanceof z.ZodError) {
    return new ExpectedCommandError("INVALID_INPUT", "The command input is invalid.", error.issues);
  }
  return undefined;
}

export function executeContentTransaction<TResult>(
  store: PlayStore,
  dependencies: CommandDependencies,
  metadata: CommandMetadata,
  options: TransactionOptions<TResult>,
  mutate: DraftMutation<TResult>,
): CommandResult<TResult> {
  const before = store.getState().document;
  const fail = (error: ExpectedCommandError): CommandResult<TResult> => {
    appendActivityEvent(store, dependencies, {
      actor: metadata.actor,
      channel: metadata.channel,
      operation: metadata.operation,
      toolName: metadata.toolName,
      summary: error.message,
      revisionBefore: before.playRevision,
      revisionAfter: before.playRevision,
      status: "failed",
      details: error.details,
    });
    return commandFailure(before.playRevision, error);
  };

  try {
    options.validateInput?.();
    const expectedRevision = options.expectedRevisionFrom?.() ?? options.expectedRevision;
    if (expectedRevision !== undefined && (typeof expectedRevision !== "number" || !Number.isFinite(expectedRevision) || !Number.isInteger(expectedRevision) || expectedRevision < 0)) {
      throw new ExpectedCommandError("INVALID_INPUT", "The expected revision must be a nonnegative integer.", { expectedRevision });
    }
    if (expectedRevision !== undefined && expectedRevision !== before.playRevision) {
      throw new ExpectedCommandError(
        "STALE_PLAY_STATE",
        "The play changed. Read the current play before editing.",
        { expectedRevision, currentRevision: before.playRevision },
      );
    }
    const snapshots: LockedActionSnapshot = options.replaceWholeDocument
      ? new Map<string, PlayAction>()
      : snapshotLockedActions(before.actions);
    const preservedActionId = options.preserveLockedActionIdFrom?.() ?? options.preserveLockedActionId;
    if (!options.replaceWholeDocument && preservedActionId !== undefined) {
      snapshots.delete(preservedActionId);
    }
    const draft = structuredClone(before);
    const nextRevision = before.playRevision + 1;
    const data = mutate(draft, nextRevision);
    assertLockedActionsPreserved(snapshots, draft.actions);
    assertStructuralInvariants(draft);
    draft.playRevision = nextRevision;
    store.getState().commitDocument(draft);
    dependencies.animationController?.cancel();
    refreshSessionAfterContentMutation(store);
    options.onCommitted?.();
    appendActivityEvent(store, dependencies, {
      actor: metadata.actor,
      channel: metadata.channel,
      operation: metadata.operation,
      toolName: metadata.toolName,
      summary: options.summary(data),
      revisionBefore: before.playRevision,
      revisionAfter: nextRevision,
      status: "completed",
      details: options.details?.(data),
    });
    return { ok: true, revision: nextRevision, data, validation: validationCounts(store) };
  } catch (error: unknown) {
    const expected = expectedErrorFrom(error);
    if (expected !== undefined) {
      return fail(expected);
    }
    throw error;
  }
}
