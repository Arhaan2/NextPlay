import { describe, expect, it } from "vitest";

import { createWebMcpToolDefinitions, registerWebMcpTools } from "../../src/webmcp/registerTools";
import { createPlayTestContext } from "../helpers/playTestContext";
import { prepareCanonicalPhase5Repair } from "../helpers/phase5RepairFixture";
import { createFakeModelContext, toolByName } from "../helpers/webMcpTestContext";

function toolDocument(context: ReturnType<typeof createFakeModelContext>): Document {
  return Object.assign(document.implementation.createHTMLDocument("phase5-tools"), { modelContext: context });
}

function execute(context: ReturnType<typeof createFakeModelContext>, name: string, input: unknown, signal?: AbortSignal): unknown {
  return toolByName(context, name).execute(input, signal === undefined ? undefined : { signal });
}

function action(store: ReturnType<typeof createPlayTestContext>["store"], id: string) {
  const found = store.getState().document.actions.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`Missing action ${id}.`);
  return found;
}

function registered() {
  const context = createPlayTestContext();
  const browser = createFakeModelContext();
  const registration = registerWebMcpTools({ store: context.store, commands: context.commands, documentRef: toolDocument(browser) });
  return { ...context, browser, registration };
}

describe("Phase 5 lock and replan WebMCP integration", () => {
  it("rejects a closed, empty, protected, non-finite, or out-of-range update patch before mutation and honors cancellation", async () => {
    const { browser, registration, store } = registered();
    await registration.registration;
    const before = structuredClone(store.getState().document);

    for (const raw of [
      { actionId: "A5", patch: { startSecond: 1 }, unexpected: true },
      { actionId: "A5", patch: {} },
      { actionId: "A5", patch: { locked: true } },
      { actionId: "A5", patch: { unsupported: true } },
      { actionId: "A5", patch: { startSecond: -0.01 } },
      { actionId: "A5", patch: { durationSecond: 0 } },
      { actionId: "A5", patch: { startSecond: Number.NaN } },
      { actionId: "A5", expectedRevision: -1, patch: { startSecond: 1 } },
    ]) {
      expect(execute(browser, "update_play_action", raw)).toMatchObject({ ok: false, revision: 0, code: "INVALID_INPUT" });
    }
    expect(store.getState().document).toEqual(before);

    const controller = new AbortController();
    controller.abort();
    expect(() => execute(browser, "update_play_action", { actionId: "A5", patch: { startSecond: 1 } }, controller.signal)).toThrow(/cancelled/i);
    expect(store.getState().document).toEqual(before);
    registration.cleanup();
  });

  it("repairs the r5 live coach intervention through r6 and r7 without changing locked actions, then validates and animates", async () => {
    const { browser, commands, registration, store } = registered();
    await registration.registration;
    const fixture = prepareCanonicalPhase5Repair(commands, store);
    expect(fixture.revision).toBe(5);

    const read = execute(browser, "get_play_state", {}) as {
      ok: boolean;
      revision: number;
      play: { clockSeconds: number; lockedActionIds: string[]; validation: { errors: Array<{ code: string; actionId?: string }> }; actions: Array<Record<string, unknown>> };
    };
    expect(read).toMatchObject({ ok: true, revision: 5, play: { clockSeconds: 2, lockedActionIds: ["A3", "A4"] } });
    expect(read.play.validation.errors).toContainEqual(expect.objectContaining({ code: "CLOCK_OVERFLOW", actionId: "A6" }));
    expect(read.play.actions.find((candidate) => candidate.id === "A3")).toMatchObject({
      destinationZone: "right_elbow", locked: true, lockOwner: "coach", lastModifiedBy: "coach", updatedAtRevision: 3,
    });

    const beforeLockedFailure = structuredClone(store.getState().document);
    expect(execute(browser, "update_play_action", { actionId: "A3", expectedRevision: 5, patch: { startSecond: 0.2 } }))
      .toEqual({ ok: false, revision: 5, code: "ACTION_LOCKED", message: "A3 is locked by the coach and cannot be changed. Update an unlocked action instead.", details: { actionId: "A3" } });
    expect(store.getState().document).toEqual(beforeLockedFailure);

    const first = execute(browser, "update_play_action", { actionId: "A5", expectedRevision: 5, patch: fixture.repairPatches.A5 }) as { ok: boolean; revision: number; changedFields: string[]; lockedActionsPreserved: string[]; updated: Record<string, unknown> };
    expect(first).toMatchObject({ ok: true, revision: 6, changedFields: ["startSecond", "durationSecond"], lockedActionsPreserved: ["A3", "A4"], updated: { id: "A5", startSecond: 1.35, durationSecond: 0.25, endSecond: 1.6, lastModifiedBy: "agent", updatedAtRevision: 6 } });
    expect(action(store, "A3")).toEqual(fixture.locked.A3);
    expect(action(store, "A4")).toEqual(fixture.locked.A4);

    const beforeStale = structuredClone(store.getState().document);
    expect(execute(browser, "update_play_action", { actionId: "A6", expectedRevision: 5, patch: fixture.repairPatches.A6 }))
      .toMatchObject({ ok: false, revision: 6, code: "STALE_PLAY_STATE", message: "The play changed after revision 5. Read the current play again or use revision 6 before editing." });
    expect(store.getState().document).toEqual(beforeStale);

    const second = execute(browser, "update_play_action", { actionId: "A6", expectedRevision: 6, patch: fixture.repairPatches.A6 }) as { ok: boolean; revision: number; lockedActionsPreserved: string[]; updated: Record<string, unknown>; validation: { status: string; valid?: boolean } };
    expect(second).toMatchObject({ ok: true, revision: 7, lockedActionsPreserved: ["A3", "A4"], updated: { id: "A6", startSecond: 1.6, durationSecond: 0.35, endSecond: 1.95, lastModifiedBy: "agent", updatedAtRevision: 7 }, validation: { status: "complete", valid: true } });
    expect(action(store, "A3")).toEqual(fixture.locked.A3);
    expect(action(store, "A4")).toEqual(fixture.locked.A4);

    expect(execute(browser, "validate_play", {})).toMatchObject({ ok: true, revision: 7, valid: true, errors: [] });
    expect(execute(browser, "animate_play", {})).toMatchObject({ ok: true, revision: 7, status: "playing", durationSeconds: 1.95 });
    expect(store.getState().session.animation).toMatchObject({ status: "playing", currentSecond: 0 });

    const activity = store.getState().session.activity;
    expect(activity.filter((event) => event.actor === "agent" && event.operation === "update_action" && event.status === "completed"))
      .toEqual([expect.objectContaining({ channel: "webmcp", toolName: "update_play_action", revisionBefore: 5, revisionAfter: 6 }), expect.objectContaining({ channel: "webmcp", toolName: "update_play_action", revisionBefore: 6, revisionAfter: 7 })]);
    expect(activity.filter((event) => event.actor === "system" && event.operation === "preserve_locked_actions"))
      .toEqual([expect.objectContaining({ channel: "webmcp", toolName: "update_play_action", revisionBefore: 6, revisionAfter: 6, details: { actionIds: ["A3", "A4"] } }), expect.objectContaining({ revisionBefore: 7, revisionAfter: 7, details: { actionIds: ["A3", "A4"] } })]);
    expect(activity.filter((event) => event.actor === "agent" && event.operation === "update_action" && event.status === "completed")).toHaveLength(2);
    expect(activity).toContainEqual(expect.objectContaining({ actor: "coach", channel: "ui", operation: "set_clock", revisionAfter: 5 }));
    expect(JSON.parse(JSON.stringify(second))).toEqual(second);
    registration.cleanup();
  });

  it("keeps the fifth registration all-or-nothing and exposes no lock or unlock tool", async () => {
    const definitions = createWebMcpToolDefinitions(createPlayTestContext());
    expect(definitions.map((tool) => tool.name)).toEqual(["get_play_state", "add_play_actions", "validate_play", "animate_play", "update_play_action"]);
    expect(definitions.map((tool) => tool.name)).not.toContain("lock_action");
    expect(definitions.map((tool) => tool.name)).not.toContain("unlock_action");

    const context = createPlayTestContext();
    const browser = createFakeModelContext((tool) => tool.name === "update_play_action" ? Promise.reject(new Error("fifth failed")) : Promise.resolve());
    const registration = registerWebMcpTools({ store: context.store, commands: context.commands, documentRef: toolDocument(browser) });
    await registration.registration;
    expect(browser.registrations.map((item) => item.definition.name)).toEqual(["get_play_state", "add_play_actions", "validate_play", "animate_play", "update_play_action"]);
    expect(browser.registrations.every((item) => item.options.signal.aborted)).toBe(true);
    expect(context.store.getState().session.webmcp).toEqual({ available: false, registeredToolNames: [], registrationError: "fifth failed" });
  });
});
