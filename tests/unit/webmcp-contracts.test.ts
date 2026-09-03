import { describe, expect, it } from "vitest";

import { createPlayCommands } from "../../src/application/commands";
import { createGoldenActionBatch } from "../../src/domain/presets";
import { createPlayStore } from "../../src/state/playStore";
import {
  createWebMcpToolDefinitions,
  registerWebMcpTools,
} from "../../src/webmcp/registerTools";
import {
  ADD_PLAY_ACTIONS_INPUT_JSON_SCHEMA,
  GET_PLAY_STATE_INPUT_JSON_SCHEMA,
  UPDATE_PLAY_ACTION_INPUT_JSON_SCHEMA,
} from "../../src/webmcp/toolSchemas";
import { P0_WEBMCP_TOOL_NAMES } from "../../src/webmcp/toolNames";
import { createPlayTestContext } from "../helpers/playTestContext";
import {
  createFakeModelContext,
  toolByName,
  type FakeModelContext,
} from "../helpers/webMcpTestContext";

interface ReadResult {
  ok: true;
  revision: number;
  play: {
    revision: number;
    scenario: string;
    clockSeconds: number;
    defenseScheme: string;
    ballOwnerId: string;
    targetOutcome?: string;
    players: Array<{
      id: string;
      team: string;
      role: string;
      startingZone: string;
      lastModifiedBy: string;
    }>;
    actions: Array<Record<string, unknown>>;
    lockedActionIds: string[];
    lockedActionCount: number;
    validationStatus: string;
  };
}

interface ToolFailureResult {
  ok: false;
  revision: number;
  code: string;
  message: string;
  details?: Array<{ path: string; message: string }>;
}

interface AddResult {
  ok: true;
  revision: number;
  added: Array<{ id: string }>;
  actionCount: number;
  lockedActionsPreserved: number;
}

function createDocumentWith(context?: FakeModelContext): Document {
  return context === undefined
    ? document.implementation.createHTMLDocument("manual")
    : Object.assign(document.implementation.createHTMLDocument("tools"), { modelContext: context });
}

function execute<T>(
  context: FakeModelContext,
  name: string,
  input: unknown,
): T {
  return toolByName(context, name).execute(input) as T;
}

describe("Phase 5 WebMCP contracts", () => {
  it("declares exactly the five closed site tools with the correct ordering, schema, and read annotations", () => {
    const context = createPlayTestContext();
    const definitions = createWebMcpToolDefinitions(context);

    expect(P0_WEBMCP_TOOL_NAMES).toEqual(["get_play_state", "add_play_actions", "validate_play", "animate_play", "update_play_action"]);
    expect(definitions.map((definition) => definition.name)).toEqual(P0_WEBMCP_TOOL_NAMES);
    expect(definitions).toHaveLength(5);
    expect(definitions[0]?.annotations).toEqual({ readOnlyHint: true });
    expect(definitions[1]?.annotations).toBeUndefined();
    expect(GET_PLAY_STATE_INPUT_JSON_SCHEMA).toMatchObject({
      type: "object",
      additionalProperties: false,
      properties: { includeActionDetails: { type: "boolean" } },
    });
    expect(ADD_PLAY_ACTIONS_INPUT_JSON_SCHEMA).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["actions"],
    });
    const actionItems = ADD_PLAY_ACTIONS_INPUT_JSON_SCHEMA.properties?.actions?.items;
    expect(actionItems).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["type", "actorId", "startSecond", "durationSecond"],
    });
    expect(actionItems?.properties).not.toHaveProperty("id");
    expect(actionItems?.properties).not.toHaveProperty("locked");
    expect(UPDATE_PLAY_ACTION_INPUT_JSON_SCHEMA).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["actionId", "patch"],
      properties: {
        actionId: { type: "string" },
        expectedRevision: { type: "integer", minimum: 0 },
        patch: { type: "object", additionalProperties: false },
      },
    });
    const patchProperties = UPDATE_PLAY_ACTION_INPUT_JSON_SCHEMA.properties?.patch?.properties;
    expect(patchProperties).toMatchObject({
      startSecond: { type: "number", minimum: 0 },
      durationSecond: { type: "number", exclusiveMinimum: 0 },
      destinationZone: { type: "string" },
      label: { type: "string", maxLength: 60 },
    });
    for (const protectedField of ["id", "type", "actorId", "locked", "lockOwner", "createdBy", "lastModifiedBy", "createdAtRevision", "updatedAtRevision"]) {
      expect(patchProperties).not.toHaveProperty(protectedField);
    }
  });

  it("keeps manual mode when the browser has no model context", async () => {
    const context = createPlayTestContext();
    const registration = registerWebMcpTools({
      store: context.store,
      commands: context.commands,
      documentRef: createDocumentWith(),
    });

    await registration.registration;
    expect(registration.supported).toBe(false);
    expect(context.store.getState().session.webmcp).toEqual({
      available: false,
      registeredToolNames: [],
    });
  });

  it("registers all five tools with one signal, then becomes available only after all complete", async () => {
    const context = createPlayTestContext();
    const browser = createFakeModelContext();
    const registration = registerWebMcpTools({
      store: context.store,
      commands: context.commands,
      documentRef: createDocumentWith(browser),
    });

    expect(context.store.getState().session.webmcp.available).toBe(false);
    await registration.registration;

    expect(browser.registrations.map((registrationItem) => registrationItem.definition.name))
      .toEqual(P0_WEBMCP_TOOL_NAMES);
    expect(browser.registrations[0]?.options.signal).toBe(browser.registrations[1]?.options.signal);
    expect(browser.registrations[0]?.options.signal.aborted).toBe(false);
    expect(context.store.getState().session.webmcp).toEqual({
      available: true,
      registeredToolNames: ["get_play_state", "add_play_actions", "validate_play", "animate_play", "update_play_action"],
    });

    registration.cleanup();
    expect(browser.registrations[0]?.options.signal.aborted).toBe(true);
    expect(context.store.getState().session.webmcp).toEqual({
      available: false,
      registeredToolNames: [],
    });
  });

  it("aborts a fifth-tool registration failure and never accepts a partial tool set", async () => {
    const context = createPlayTestContext();
    const browser = createFakeModelContext((tool) => tool.name === "update_play_action"
      ? Promise.reject(new Error("fifth registration failed"))
      : Promise.resolve());
    const registration = registerWebMcpTools({
      store: context.store,
      commands: context.commands,
      documentRef: createDocumentWith(browser),
    });

    await registration.registration;

    expect(browser.registrations.map((registrationItem) => registrationItem.definition.name))
      .toEqual(P0_WEBMCP_TOOL_NAMES);
    expect(browser.registrations[0]?.options.signal.aborted).toBe(true);
    expect(context.store.getState().session.webmcp).toEqual({
      available: false,
      registeredToolNames: [],
      registrationError: "fifth registration failed",
    });
  });

  it("survives cleanup and remount without stale completion overwriting the current status", async () => {
    const context = createPlayTestContext();
    let resolveFirst: (() => void) | undefined;
    const firstPending = new Promise<void>((resolve) => { resolveFirst = resolve; });
    let calls = 0;
    const browser = createFakeModelContext(() => {
      calls += 1;
      return calls === 1 ? firstPending : Promise.resolve();
    });
    const documentRef = createDocumentWith(browser);
    const first = registerWebMcpTools({ store: context.store, commands: context.commands, documentRef });
    first.cleanup();
    const second = registerWebMcpTools({ store: context.store, commands: context.commands, documentRef });

    await second.registration;
    resolveFirst?.();
    await first.registration;

    expect(browser.registrations.map((registrationItem) => registrationItem.definition.name))
      .toEqual(["get_play_state", "get_play_state", "add_play_actions", "validate_play", "animate_play", "update_play_action"]);
    expect(browser.registrations[0]?.options.signal.aborted).toBe(true);
    expect(context.store.getState().session.webmcp).toEqual({
      available: true,
      registeredToolNames: ["get_play_state", "add_play_actions", "validate_play", "animate_play", "update_play_action"],
    });
    second.cleanup();
  });

  it("reads a fresh current snapshot without changing content revision and logs the equal-revision read", async () => {
    const context = createPlayTestContext();
    const browser = createFakeModelContext();
    const registration = registerWebMcpTools({
      store: context.store,
      commands: context.commands,
      documentRef: createDocumentWith(browser),
    });
    await registration.registration;

    const result = execute<ReadResult>(browser, "get_play_state", {});

    expect(result).toMatchObject({
      ok: true,
      revision: 0,
      play: {
        revision: 0,
        scenario: "sideline_out_of_bounds",
        clockSeconds: 4.2,
        defenseScheme: "man",
        ballOwnerId: "O1",
        targetOutcome: "Right-corner three for O2",
        actions: [],
        lockedActionIds: [],
        lockedActionCount: 0,
        validationStatus: "not_run",
      },
    });
    expect(result.play.players).toHaveLength(10);
    expect(result.play.players.find((player) => player.id === "O2")).toMatchObject({
      team: "offense",
      role: "shooter",
      startingZone: "right_block",
      lastModifiedBy: "system",
    });
    expect(context.store.getState().document.playRevision).toBe(0);
    expect(context.store.getState().session.activity).toHaveLength(1);
    expect(context.store.getState().session.activity[0]).toMatchObject({
      actor: "agent",
      channel: "webmcp",
      operation: "get_play_state",
      toolName: "get_play_state",
      status: "completed",
      revisionBefore: 0,
      revisionAfter: 0,
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    registration.cleanup();
  });

  it("reads current detailed and compact actions without exposing session-only state", async () => {
    const context = createPlayTestContext();
    const browser = createFakeModelContext();
    const registration = registerWebMcpTools({ store: context.store, commands: context.commands, documentRef: createDocumentWith(browser) });
    await registration.registration;
    expect(context.commands.addActions({ actions: createGoldenActionBatch(), expectedRevision: 0 }).ok).toBe(true);
    expect(context.commands.setActionLocked({ actionId: "A3", locked: true, expectedRevision: 1 }).ok).toBe(true);

    const detailed = execute<ReadResult>(browser, "get_play_state", { includeActionDetails: true });
    const compact = execute<ReadResult>(browser, "get_play_state", { includeActionDetails: false });

    expect(detailed.revision).toBe(2);
    expect(detailed.play.actions).toHaveLength(6);
    expect(detailed.play.actions.find((action) => action.id === "A3")).toMatchObject({
      targetPlayerId: "O2",
      destinationZone: "right_block",
      screenType: "pin_down",
      durationSecond: 0.8,
      endSecond: 0.95,
      locked: true,
      lockOwner: "coach",
      lastModifiedBy: "coach",
      updatedAtRevision: 2,
    });
    expect(detailed.play.lockedActionIds).toEqual(["A3"]);
    expect(compact.play.actions[0]).toEqual({
      id: "A1",
      type: "move",
      actorId: "O3",
      startSecond: 0,
      endSecond: 0.75,
      locked: false,
    });
    expect(compact.play).not.toHaveProperty("selectedActionId");
    expect(compact.play).not.toHaveProperty("activity");
    expect(compact.play).not.toHaveProperty("commitDocument");
    registration.cleanup();
  });

  it("returns a concise invalid read result without changing the revision", async () => {
    const context = createPlayTestContext();
    const browser = createFakeModelContext();
    const registration = registerWebMcpTools({ store: context.store, commands: context.commands, documentRef: createDocumentWith(browser) });
    await registration.registration;

    const result = execute<ToolFailureResult>(browser, "get_play_state", { unsupported: true });

    expect(result).toMatchObject({ ok: false, revision: 0, code: "INVALID_INPUT", message: "Tool input is invalid." });
    expect(result.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "input" }),
    ]));
    expect(context.store.getState().document).toMatchObject({ playRevision: 0, actions: [] });
    expect(context.store.getState().session.activity.at(-1)).toMatchObject({ status: "failed", revisionBefore: 0, revisionAfter: 0 });
    registration.cleanup();
  });

  it("delegates the canonical batch with WebMCP identity, commits once, and returns the committed actions", async () => {
    const context = createPlayTestContext();
    const browser = createFakeModelContext();
    const registration = registerWebMcpTools({ store: context.store, commands: context.commands, documentRef: createDocumentWith(browser) });
    await registration.registration;

    const result = execute<AddResult>(browser, "add_play_actions", {
      expectedRevision: 0,
      actions: createGoldenActionBatch(),
    });

    expect(result).toMatchObject({ ok: true, revision: 1, actionCount: 6, lockedActionsPreserved: 0 });
    expect(result.added.map((action) => action.id)).toEqual(["A1", "A2", "A3", "A4", "A5", "A6"]);
    expect(context.store.getState().document).toMatchObject({ playRevision: 1 });
    expect(context.store.getState().document.actions.map((action) => action.id)).toEqual(["A1", "A2", "A3", "A4", "A5", "A6"]);
    expect(context.store.getState().session.activity).toEqual([
      expect.objectContaining({
        actor: "agent",
        channel: "webmcp",
        operation: "add_actions",
        toolName: "add_play_actions",
        status: "completed",
        revisionBefore: 0,
        revisionAfter: 1,
      }),
    ]);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    registration.cleanup();
  });

  it("rejects malformed and stale writes atomically, then retains deterministic IDs for the next valid batch", async () => {
    const context = createPlayTestContext();
    const browser = createFakeModelContext();
    const registration = registerWebMcpTools({ store: context.store, commands: context.commands, documentRef: createDocumentWith(browser) });
    await registration.registration;
    const before = structuredClone(context.store.getState().document);

    const malformed = execute<ToolFailureResult>(browser, "add_play_actions", {
      actions: [{ type: "move", actorId: "O3", startSecond: 0, durationSecond: 0.75, unexpected: "field" }],
    });
    const stale = execute<ToolFailureResult>(browser, "add_play_actions", {
      expectedRevision: 9,
      actions: createGoldenActionBatch(),
    });

    expect(malformed).toMatchObject({ ok: false, code: "INVALID_INPUT", revision: 0 });
    expect(malformed.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "actions.0" }),
    ]));
    expect(stale).toMatchObject({ ok: false, code: "STALE_PLAY_STATE", revision: 0 });
    expect(context.store.getState().document).toEqual(before);

    const valid = execute<AddResult>(browser, "add_play_actions", {
      expectedRevision: 0,
      actions: createGoldenActionBatch(),
    });
    expect(valid.added.map((action) => action.id)).toEqual(["A1", "A2", "A3", "A4", "A5", "A6"]);
    expect(context.store.getState().document.playRevision).toBe(1);
    registration.cleanup();
  });

  it("does not mutate before an already-aborted write executes", async () => {
    const store = createPlayStore();
    const commands = createPlayCommands(store);
    const browser = createFakeModelContext();
    const registration = registerWebMcpTools({ store, commands, documentRef: createDocumentWith(browser) });
    await registration.registration;
    const controller = new AbortController();
    controller.abort();

    expect(() => toolByName(browser, "add_play_actions").execute(
      { actions: createGoldenActionBatch() },
      { signal: controller.signal },
    )).toThrow(/cancelled/i);
    expect(store.getState().document).toMatchObject({ playRevision: 0, actions: [] });
    registration.cleanup();
  });
});
