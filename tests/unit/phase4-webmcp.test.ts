import { describe, expect, it } from "vitest";

import { createGoldenActionBatch } from "../../src/domain/presets";
import { registerWebMcpTools } from "../../src/webmcp/registerTools";
import { createPlayTestContext } from "../helpers/playTestContext";
import { createFakeModelContext, toolByName } from "../helpers/webMcpTestContext";

function toolDocument(context: ReturnType<typeof createFakeModelContext>): Document {
  return Object.assign(document.implementation.createHTMLDocument("tools"), { modelContext: context });
}

function loadedRegistration() {
  const context = createPlayTestContext();
  const browser = createFakeModelContext();
  const registration = registerWebMcpTools({ store: context.store, commands: context.commands, documentRef: toolDocument(browser) });
  return { ...context, browser, registration };
}

describe("Phase 4 WebMCP validation and animation adapters", () => {
  it("delegates strict validate_play to the shared command, updates state first, and serializes a concise result", async () => {
    const { browser, commands, registration, store } = loadedRegistration();
    await registration.registration;
    expect(commands.addActions({ actions: createGoldenActionBatch(), expectedRevision: 0 }).ok).toBe(true);
    const result = toolByName(browser, "validate_play").execute({}) as { ok: boolean; revision: number; valid: boolean; checksPassed: number; checksTotal: number; errors: unknown[]; warnings: unknown[] };

    expect(result).toEqual({ ok: true, revision: 1, valid: true, checksPassed: 7, checksTotal: 7, errors: [], warnings: [] });
    expect(store.getState().session.validation).toMatchObject({ status: "complete", validatedRevision: 1, valid: true });
    expect(store.getState().document.playRevision).toBe(1);
    expect(store.getState().session.activity.filter((event) => event.operation === "validate_play")).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    registration.cleanup();
  });

  it("rejects closed schemas and starts valid animation with defaults while returning PLAY_INVALID for overflow", async () => {
    const { browser, commands, registration, store } = loadedRegistration();
    await registration.registration;
    const invalidValidate = toolByName(browser, "validate_play").execute({ unexpected: true }) as { ok: boolean; code: string };
    const invalidAnimate = toolByName(browser, "animate_play").execute({ speed: 3 }) as { ok: boolean; code: string };
    expect(invalidValidate).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(invalidAnimate).toMatchObject({ ok: false, code: "INVALID_INPUT" });

    expect(commands.addActions({ actions: createGoldenActionBatch(), expectedRevision: 0 }).ok).toBe(true);
    const valid = toolByName(browser, "animate_play").execute({}) as { ok: boolean; revision: number; speed: number; loop: boolean; durationSeconds: number };
    expect(valid).toMatchObject({ ok: true, revision: 1, speed: 1, loop: false, durationSeconds: 2.15 });
    expect(store.getState().session.animation).toMatchObject({ status: "playing", currentSecond: 0, speed: 1, loop: false });
    expect(store.getState().document.playRevision).toBe(1);
    expect(JSON.parse(JSON.stringify(valid))).toEqual(valid);

    commands.stopAnimation();
    commands.setClock({ clockSeconds: 2, expectedRevision: 1 });
    const blocked = toolByName(browser, "animate_play").execute({ speed: 2, loop: true }) as { ok: boolean; revision: number; code: string; validationErrorCount?: number; errors?: Array<{ code: string; actionId?: string; message: string }> };
    expect(blocked).toMatchObject({ ok: false, revision: 2, code: "PLAY_INVALID" });
    expect(blocked.validationErrorCount).toBe(1);
    expect(blocked.errors).toEqual([{ code: "CLOCK_OVERFLOW", actionId: "A6", message: "A6 (O2 shot) ends at 2.15s, after the 2.00s clock by 0.15s." }]);
    expect(JSON.parse(JSON.stringify(blocked))).toEqual(blocked);
    expect(store.getState().session.animation).toMatchObject({ status: "idle", currentSecond: 0 });
    expect(store.getState().document.playRevision).toBe(2);
    registration.cleanup();
  });

  it("aborts complete registration attempts on either new tool failure and records no active set", async () => {
    for (const failingName of ["validate_play", "animate_play"]) {
      const context = createPlayTestContext();
      const browser = createFakeModelContext((tool) => tool.name === failingName ? Promise.reject(new Error(`${failingName} failed`)) : Promise.resolve());
      const registration = registerWebMcpTools({ store: context.store, commands: context.commands, documentRef: toolDocument(browser) });
      await registration.registration;
      expect(browser.registrations.at(-1)?.definition.name).toBe(failingName);
      expect(browser.registrations[0]?.options.signal.aborted).toBe(true);
      expect(context.store.getState().session.webmcp).toEqual({ available: false, registeredToolNames: [], registrationError: `${failingName} failed` });
    }
  });
});
