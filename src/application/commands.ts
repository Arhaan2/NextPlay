import { z } from "zod";

import { AGENT_WEBMCP, COACH_UI, SYSTEM_PRESET, metadataFor, type CommandIdentity } from "./commandMetadata";
import { ExpectedCommandError, type CommandResult } from "./commandResults";
import { assertCoachLockChangeOnly } from "./lockGuard";
import { appendActivityEvent, deterministicCommandDependencies, executeContentTransaction, type CommandDependencies } from "./transaction";
import { createDemoPreset, createGoldenActionBatch } from "../domain/presets";
import { actionBatchSchema, parseActionInput, parseActionPatch, positiveClockSchema } from "../domain/schemas";
import type { ActivityEvent, PlayAction, PlayActionInput, PlaySessionState } from "../domain/types";
import { createInitialSessionState } from "../state/initialState";
import { playStore, type PlayStore } from "../state/playStore";

export interface ExpectedRevisionInput {
  expectedRevision?: number;
}

export interface AddActionsInput extends ExpectedRevisionInput {
  actions: unknown;
}

export interface SetClockInput extends ExpectedRevisionInput {
  clockSeconds: unknown;
}

export interface UpdateActionInput extends ExpectedRevisionInput {
  actionId: string;
  patch: unknown;
}

export interface SetActionLockedInput extends ExpectedRevisionInput {
  actionId: string;
  locked: boolean;
}

const expectedRevisionSchema = z.number().finite().int().nonnegative().optional();
const addActionsCommandSchema = z.object({ actions: z.unknown(), expectedRevision: expectedRevisionSchema }).strict();
const setClockCommandSchema = z.object({ clockSeconds: z.unknown(), expectedRevision: expectedRevisionSchema }).strict();
const updateActionCommandSchema = z.object({ actionId: z.string().min(1), patch: z.unknown(), expectedRevision: expectedRevisionSchema }).strict();
const setActionLockedCommandSchema = z.object({ actionId: z.string().min(1), locked: z.boolean(), expectedRevision: expectedRevisionSchema }).strict();
const resetDemoCommandSchema = z.object({ expectedRevision: expectedRevisionSchema }).strict();

type AddActionsCommandInput = z.infer<typeof addActionsCommandSchema>;
type SetClockCommandInput = z.infer<typeof setClockCommandSchema>;
type UpdateActionCommandInput = z.infer<typeof updateActionCommandSchema>;
type SetActionLockedCommandInput = z.infer<typeof setActionLockedCommandSchema>;
type ResetDemoCommandInput = z.infer<typeof resetDemoCommandSchema>;

function nextActionId(actions: PlayAction[]): string {
  const numbers = actions
    .map((action) => /^A(\d+)$/.exec(action.id)?.[1])
    .filter((value): value is string => value !== undefined)
    .map(Number);
  return `A${(numbers.length === 0 ? 0 : Math.max(...numbers)) + 1}`;
}

function createStoredAction(
  input: PlayActionInput,
  id: string,
  revision: number,
  actor: "coach" | "agent",
): PlayAction {
  return {
    ...input,
    id,
    locked: false,
    createdBy: actor,
    lastModifiedBy: actor,
    createdAtRevision: revision,
    updatedAtRevision: revision,
  };
}

function toActionInput(action: PlayAction): PlayActionInput {
  const input: Partial<PlayAction> = { ...action };
  delete input.id;
  delete input.locked;
  delete input.lockOwner;
  delete input.createdBy;
  delete input.lastModifiedBy;
  delete input.createdAtRevision;
  delete input.updatedAtRevision;
  return input as PlayActionInput;
}

function resetSessionForDemo(session: PlaySessionState): PlaySessionState {
  const pristine = createInitialSessionState();
  return {
    ...pristine,
    webmcp: structuredClone(session.webmcp),
    nextActivitySequence: session.nextActivitySequence,
  };
}

function asAddActionsInput(input: AddActionsInput | unknown[]): unknown {
  return Array.isArray(input) ? { actions: input } : input;
}

export interface PlayCommands {
  loadDemoPreset: () => CommandResult<{ reset: true }>;
  resetDemo: (input?: ExpectedRevisionInput, identity?: CommandIdentity) => CommandResult<{ reset: true }>;
  setClock: (input: SetClockInput, identity?: CommandIdentity) => CommandResult<{ clockSeconds: number }>;
  addActions: (input: AddActionsInput | unknown[], identity?: CommandIdentity) => CommandResult<{ actionIds: string[] }>;
  updateAction: (input: UpdateActionInput, identity?: CommandIdentity) => CommandResult<{ actionId: string }>;
  setActionLocked: (input: SetActionLockedInput, identity?: CommandIdentity) => CommandResult<{ actionId: string; locked: boolean }>;
  selectAction: (actionId?: string) => void;
  appendActivity: (event: Omit<ActivityEvent, "id" | "timestamp">) => ActivityEvent;
  goldenActions: () => PlayActionInput[];
}

export function createPlayCommands(
  store: PlayStore,
  dependencies: CommandDependencies = deterministicCommandDependencies,
): PlayCommands {
  return {
    loadDemoPreset: () => executeContentTransaction(
      store,
      dependencies,
      metadataFor("load_demo_preset", SYSTEM_PRESET),
      { summary: () => "Loaded the deterministic SLOB preset." },
      (draft, nextRevision) => {
        Object.assign(draft, createDemoPreset(), { playRevision: nextRevision });
        return { reset: true };
      },
    ),
    resetDemo: (input = {}, identity = COACH_UI) => {
      let parsed!: ResetDemoCommandInput;
      return executeContentTransaction(
      store,
      dependencies,
      metadataFor("reset_demo", identity),
      {
        expectedRevisionFrom: () => parsed.expectedRevision,
        validateInput: () => { parsed = resetDemoCommandSchema.parse(input); },
        replaceWholeDocument: true,
        summary: () => "Reset the deterministic SLOB preset.",
        onCommitted: () => store.getState().updateSession((session) => resetSessionForDemo(session)),
      },
      (draft, nextRevision) => {
        Object.assign(draft, createDemoPreset(), { playRevision: nextRevision });
        return { reset: true };
      },
      );
    },
    setClock: (input, identity = COACH_UI) => {
      let parsed!: SetClockCommandInput;
      return executeContentTransaction(
      store,
      dependencies,
      metadataFor("set_clock", identity),
      {
        expectedRevisionFrom: () => parsed.expectedRevision,
        validateInput: () => { parsed = setClockCommandSchema.parse(input); },
        summary: (data) => `Set the play clock to ${data.clockSeconds} seconds.`,
      },
      (draft) => {
        const clockSeconds = positiveClockSchema.parse(parsed.clockSeconds);
        draft.clockSeconds = clockSeconds;
        return { clockSeconds };
      },
      );
    },
    addActions: (rawInput, identity = AGENT_WEBMCP) => {
      let input!: AddActionsCommandInput;
      return executeContentTransaction(
        store,
        dependencies,
        metadataFor("add_actions", identity),
        {
          expectedRevisionFrom: () => input.expectedRevision,
          validateInput: () => { input = addActionsCommandSchema.parse(asAddActionsInput(rawInput)); },
          summary: (data) => `Added ${data.actionIds.length} play actions.`,
          details: (data) => data,
        },
        (draft, nextRevision) => {
          if (identity.actor === "system") {
            throw new ExpectedCommandError("INVALID_INPUT", "System commands cannot create play actions.");
          }
          const actions = actionBatchSchema.parse(input.actions) as PlayActionInput[];
          const firstId = nextActionId(draft.actions);
          const initialNumber = Number(firstId.slice(1));
          const added = actions.map((action, index) => createStoredAction(
            parseActionInput(action),
            `A${initialNumber + index}`,
            nextRevision,
            identity.actor as "coach" | "agent",
          ));
          draft.actions.push(...added);
          return { actionIds: added.map((action) => action.id) };
        },
      );
    },
    updateAction: (input, identity = AGENT_WEBMCP) => {
      let parsed!: UpdateActionCommandInput;
      return executeContentTransaction(
      store,
      dependencies,
      metadataFor("update_action", identity),
      {
        expectedRevisionFrom: () => parsed.expectedRevision,
        validateInput: () => { parsed = updateActionCommandSchema.parse(input); },
        summary: (data) => `Updated action ${data.actionId}.`,
        details: (data) => data,
      },
      (draft, nextRevision) => {
        const index = draft.actions.findIndex((action) => action.id === parsed.actionId);
        if (index < 0) {
          throw new ExpectedCommandError("ACTION_NOT_FOUND", `Action ${parsed.actionId} does not exist.`, { actionId: parsed.actionId });
        }
        const current = draft.actions[index];
        if (current.locked) {
          throw new ExpectedCommandError("ACTION_LOCKED", `${current.id} is locked by the coach and cannot be changed. Update an unlocked action instead.`, { actionId: current.id });
        }
        if (identity.actor === "system") {
          throw new ExpectedCommandError("INVALID_INPUT", "System commands cannot update play actions.");
        }
        const patch = parseActionPatch(parsed.patch);
        const completeInput = { ...toActionInput(current), ...patch };
        const valid = parseActionInput(completeInput);
        draft.actions[index] = {
          ...valid,
          id: current.id,
          locked: false,
          createdBy: current.createdBy,
          lastModifiedBy: identity.actor,
          createdAtRevision: current.createdAtRevision,
          updatedAtRevision: nextRevision,
        };
        return { actionId: current.id };
      },
      );
    },
    setActionLocked: (input, identity = COACH_UI) => {
      let parsed!: SetActionLockedCommandInput;
      return executeContentTransaction(
      store,
      dependencies,
      metadataFor("set_action_locked", identity),
      {
        expectedRevisionFrom: () => parsed.expectedRevision,
        preserveLockedActionIdFrom: () => parsed.actionId,
        validateInput: () => { parsed = setActionLockedCommandSchema.parse(input); },
        summary: (data) => `${data.locked ? "Locked" : "Unlocked"} action ${data.actionId}.`,
        details: (data) => data,
      },
      (draft, nextRevision) => {
        if (identity.actor !== "coach" || identity.channel !== "ui") {
          throw new ExpectedCommandError("UNAUTHORIZED_LOCK_CHANGE", "Only the coach can change action locks through the UI.", { actor: identity.actor, channel: identity.channel });
        }
        const index = draft.actions.findIndex((action) => action.id === parsed.actionId);
        if (index < 0) {
          throw new ExpectedCommandError("ACTION_NOT_FOUND", `Action ${parsed.actionId} does not exist.`, { actionId: parsed.actionId });
        }
        const before = draft.actions[index];
        const unlockedAction = { ...before };
        delete unlockedAction.lockOwner;
        const after: PlayAction = parsed.locked
          ? { ...before, locked: true, lockOwner: "coach", lastModifiedBy: "coach", updatedAtRevision: nextRevision }
          : { ...unlockedAction, locked: false, lastModifiedBy: "coach", updatedAtRevision: nextRevision };
        assertCoachLockChangeOnly(before, after);
        draft.actions[index] = after;
        return { actionId: after.id, locked: after.locked };
      },
      );
    },
    selectAction: (actionId) => {
      store.getState().updateSession((session) => ({ ...session, selectedActionId: actionId }));
    },
    appendActivity: (event) => appendActivityEvent(store, dependencies, event),
    goldenActions: createGoldenActionBatch,
  };
}

export const playCommands = createPlayCommands(playStore);

export const actionPatchInputSchema = z.object({ actionId: z.string().min(1), patch: z.unknown() }).strict();
