import { z } from "zod";

import { createAgentPlaySnapshot } from "../application/agentSnapshot";
import { playCommands, type PlayCommands } from "../application/commands";
import type { PlayAction } from "../domain/types";
import { playStore, type PlayStore } from "../state/playStore";
import type { ModelContext, ModelContextToolDefinition } from "./modelContext";
import { ADD_PLAY_ACTIONS_INPUT_JSON_SCHEMA, GET_PLAY_STATE_INPUT_JSON_SCHEMA, addPlayActionsInputSchema, getPlayStateInputSchema } from "./toolSchemas";
import { P0_WEBMCP_TOOL_NAMES } from "./toolNames";
import { commandFailureResult, invalidInputResult, type AddPlayActionsSuccess, type GetPlayStateSuccess } from "./toolResults";
import { appendWebMcpActivity } from "./tracing";

const GET_PLAY_STATE_DESCRIPTION = "Read the current NextPlay basketball play, including its revision, clock, starting positions, actions, and coach locks. Call this before adding or adapting actions.";
const ADD_PLAY_ACTIONS_DESCRIPTION = "Atomically add 1–12 timed move, dribble, screen, pass, or shot actions to the live play. Use the revision returned by get_play_state. Successful actions appear on the court and timeline.";

export interface WebMcpToolDependencies {
  store: PlayStore;
  commands: PlayCommands;
}

export interface WebMcpRegistrationDependencies extends Partial<WebMcpToolDependencies> {
  documentRef?: Document;
}

export interface WebMcpRegistration {
  supported: boolean;
  registration: Promise<void>;
  cleanup: () => void;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new DOMException("WebMCP tool execution was cancelled.", "AbortError");
  }
}

function actionSummary(action: PlayAction): string {
  const subject = `${action.actorId} ${action.type}`;
  const targetPlayerId = "targetPlayerId" in action ? action.targetPlayerId : undefined;
  const destinationZone = "destinationZone" in action ? action.destinationZone : undefined;
  if (targetPlayerId !== undefined) {
    return `${subject} to ${targetPlayerId}`;
  }
  if (destinationZone !== undefined) {
    return `${subject} to ${destinationZone}`;
  }
  return subject;
}

function currentRevision(store: PlayStore): number {
  return store.getState().document.playRevision;
}

function setManualStatus(store: PlayStore, registrationError?: string): void {
  store.getState().updateSession((session) => ({
    ...session,
    webmcp: {
      available: false,
      registeredToolNames: [],
      ...(registrationError === undefined ? {} : { registrationError }),
    },
  }));
}

function setAvailableStatus(store: PlayStore): void {
  store.getState().updateSession((session) => ({
    ...session,
    webmcp: {
      available: true,
      registeredToolNames: [...P0_WEBMCP_TOOL_NAMES],
    },
  }));
}

function registrationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message.slice(0, 160);
  }
  return "Site-tool registration did not complete.";
}

export function createWebMcpToolDefinitions(
  dependencies: WebMcpToolDependencies,
): ModelContextToolDefinition[] {
  const { store, commands } = dependencies;

  const getPlayState: ModelContextToolDefinition = {
    name: "get_play_state",
    description: GET_PLAY_STATE_DESCRIPTION,
    inputSchema: GET_PLAY_STATE_INPUT_JSON_SCHEMA,
    annotations: { readOnlyHint: true },
    execute: (rawInput, options) => {
      throwIfAborted(options?.signal);
      const parsed = getPlayStateInputSchema.safeParse(rawInput);
      const revision = currentRevision(store);
      if (!parsed.success) {
        const result = invalidInputResult(revision, parsed.error);
        appendWebMcpActivity(commands, {
          operation: "get_play_state",
          toolName: "get_play_state",
          summary: "Could not read the play because the tool input was invalid.",
          revision,
          status: "failed",
          details: result.details,
        });
        return result;
      }

      try {
        const state = store.getState();
        const result: GetPlayStateSuccess = {
          ok: true,
          revision: state.document.playRevision,
          play: createAgentPlaySnapshot(state, parsed.data.includeActionDetails),
        };
        appendWebMcpActivity(commands, {
          operation: "get_play_state",
          toolName: "get_play_state",
          summary: `Read the current play at revision ${result.revision}.`,
          revision: result.revision,
          status: "completed",
        });
        return result;
      } catch (error: unknown) {
        if (error instanceof z.ZodError) {
          return invalidInputResult(revision, error);
        }
        appendWebMcpActivity(commands, {
          operation: "get_play_state",
          toolName: "get_play_state",
          summary: "Could not read the current play.",
          revision,
          status: "failed",
        });
        throw error;
      }
    },
  };

  const addPlayActions: ModelContextToolDefinition = {
    name: "add_play_actions",
    description: ADD_PLAY_ACTIONS_DESCRIPTION,
    inputSchema: ADD_PLAY_ACTIONS_INPUT_JSON_SCHEMA,
    execute: (rawInput, options) => {
      throwIfAborted(options?.signal);
      const parsed = addPlayActionsInputSchema.safeParse(rawInput);
      const revision = currentRevision(store);
      if (!parsed.success) {
        const result = invalidInputResult(revision, parsed.error);
        appendWebMcpActivity(commands, {
          operation: "add_actions",
          toolName: "add_play_actions",
          summary: "Could not add actions because the tool input was invalid.",
          revision,
          status: "failed",
          details: result.details,
        });
        return result;
      }

      const commandResult = commands.addActions(
        {
          actions: parsed.data.actions,
          ...(parsed.data.expectedRevision === undefined
            ? {}
            : { expectedRevision: parsed.data.expectedRevision }),
        },
        { actor: "agent", channel: "webmcp", toolName: "add_play_actions" },
      );
      if (!commandResult.ok) {
        return commandFailureResult(commandResult);
      }

      const committedDocument = store.getState().document;
      const added = commandResult.data.actionIds.map((id) => {
        const action = committedDocument.actions.find((candidate) => candidate.id === id);
        if (action === undefined) {
          throw new Error(`Committed action ${id} is missing from the live play.`);
        }
        return { id: action.id, type: action.type, actorId: action.actorId, summary: actionSummary(action) };
      });
      const result: AddPlayActionsSuccess = {
        ok: true,
        revision: commandResult.revision,
        added,
        actionCount: committedDocument.actions.length,
        lockedActionsPreserved: committedDocument.actions.filter((action) => action.locked).length,
      };
      return result;
    },
  };

  return [getPlayState, addPlayActions];
}

export function getModelContext(documentRef: Document): ModelContext | undefined {
  const candidate = documentRef.modelContext;
  return typeof candidate?.registerTool === "function" ? candidate : undefined;
}

/**
 * Starts one complete, abortable registration attempt. Persistent play content is
 * never touched here; only the session's honest support status changes.
 */
export function registerWebMcpTools(
  dependencies: WebMcpRegistrationDependencies = {},
): WebMcpRegistration {
  const store = dependencies.store ?? playStore;
  const commands = dependencies.commands ?? playCommands;
  const documentRef = dependencies.documentRef ?? document;
  const context = getModelContext(documentRef);
  const controller = new AbortController();
  let active = true;

  const cleanup = (): void => {
    active = false;
    controller.abort();
    setManualStatus(store);
  };

  if (context === undefined) {
    setManualStatus(store);
    return { supported: false, registration: Promise.resolve(), cleanup };
  }

  setManualStatus(store);
  const definitions = createWebMcpToolDefinitions({ store, commands });
  const registration = (async (): Promise<void> => {
    try {
      for (const definition of definitions) {
        if (controller.signal.aborted) {
          return;
        }
        await context.registerTool(definition, { signal: controller.signal });
      }
      if (active && !controller.signal.aborted) {
        setAvailableStatus(store);
      }
    } catch (error: unknown) {
      controller.abort();
      if (active) {
        setManualStatus(store, registrationErrorMessage(error));
      }
    }
  })();

  return { supported: true, registration, cleanup };
}
