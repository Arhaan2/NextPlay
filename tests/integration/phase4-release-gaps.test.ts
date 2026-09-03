import { describe, expect, it } from "vitest";

import { createPlayCommands } from "../../src/application/commands";
import { createGoldenActionBatch, createDemoPreset } from "../../src/domain/presets";
import type { PlayAction, PlayDocument } from "../../src/domain/types";
import { AnimationController, type AnimationFrameScheduler } from "../../src/engine/animation/animationController";
import { validatePlay } from "../../src/engine/validation";
import { createPlayStore } from "../../src/state/playStore";
import { createWebMcpToolDefinitions, registerWebMcpTools } from "../../src/webmcp/registerTools";
import { ANIMATE_PLAY_INPUT_JSON_SCHEMA, VALIDATE_PLAY_INPUT_JSON_SCHEMA } from "../../src/webmcp/toolSchemas";
import { createFakeModelContext, toolByName } from "../helpers/webMcpTestContext";

class Scheduler implements AnimationFrameScheduler {
  private nowValue = 0;
  private nextId = 1;
  private readonly callbacks = new Map<number, FrameRequestCallback>();
  readonly cancelled: number[] = [];
  now = () => this.nowValue;
  requestFrame = (callback: FrameRequestCallback) => {
    const id = this.nextId;
    this.nextId += 1;
    this.callbacks.set(id, callback);
    return id;
  };
  cancelFrame = (id: number) => { this.cancelled.push(id); this.callbacks.delete(id); };
  flush = (timestamp: number) => {
    this.nowValue = timestamp;
    const callbacks = [...this.callbacks.values()];
    this.callbacks.clear();
    callbacks.forEach((callback) => callback(timestamp));
  };
  get pendingCount(): number { return this.callbacks.size; }
}

function canonicalDocument(): PlayDocument {
  const document = createDemoPreset();
  document.actions = createGoldenActionBatch().map((action, index) => ({ ...action, id: `A${index + 1}`, locked: false, createdBy: "agent", lastModifiedBy: "agent", createdAtRevision: 1, updatedAtRevision: 1 }));
  document.playRevision = 1;
  return document;
}

function commandContext() {
  const store = createPlayStore();
  const scheduler = new Scheduler();
  const commands = createPlayCommands(store, {
    now: () => 1_700_000_000_000,
    createActivityId: (sequence) => `release-gap-${sequence}`,
    animationController: new AnimationController(store, scheduler),
  });
  expect(commands.addActions({ actions: createGoldenActionBatch(), expectedRevision: 0 }).ok).toBe(true);
  return { commands, scheduler, store };
}

function documentWith(context: ReturnType<typeof createFakeModelContext>): Document {
  return Object.assign(document.implementation.createHTMLDocument("phase4-tools"), { modelContext: context });
}

describe("Phase 4 release-gap validation coverage", () => {
  it("reports corrupt screen fields and unsupported types as serializable reference errors without mutation", () => {
    const document = canonicalDocument();
    document.actions[2] = { ...document.actions[2], screenType: undefined } as unknown as PlayAction;
    document.actions.push({ ...document.actions[0], id: "A7", type: "teleport" } as unknown as PlayAction);
    const before = structuredClone(document);
    const first = validatePlay(document);
    const second = validatePlay(document);

    expect(first.errors.filter((issue) => issue.code === "INVALID_ACTION_REFERENCE").map((issue) => issue.actionId)).toEqual(["A3", "A7"]);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(second).toEqual(first);
    expect(document).toEqual(before);
  });

  it("reports missing shot and an independently wrong-owner shot", () => {
    const missingShot = canonicalDocument();
    missingShot.actions = missingShot.actions.filter((action) => action.type !== "shot");
    expect(validatePlay(missingShot).errors).toContainEqual(expect.objectContaining({ code: "MISSING_SHOT" }));

    const wrongOwner = canonicalDocument();
    wrongOwner.actions[5] = { ...wrongOwner.actions[5], actorId: "O3" };
    expect(validatePlay(wrongOwner).errors).toContainEqual(expect.objectContaining({ code: "INVALID_SHOT_POSSESSION", actionId: "A6", expectedOwnerId: "O3", actualOwnerId: "O2" }));
  });
});

describe("Phase 4 release-gap controller and site-tool coverage", () => {
  it("clamps non-looping completion, permits only one active frame, and cancels on content mutation", () => {
    const { commands, scheduler, store } = commandContext();
    expect(commands.startAnimation({ loop: false }).ok).toBe(true);
    expect(commands.startAnimation({ loop: false }).ok).toBe(true);
    expect(scheduler.pendingCount).toBe(1);
    scheduler.flush(2_150);
    expect(store.getState().session.animation).toMatchObject({ status: "paused", currentSecond: 2.15 });
    expect(scheduler.pendingCount).toBe(0);

    expect(commands.restartAnimation().ok).toBe(true);
    expect(scheduler.pendingCount).toBe(1);
    expect(commands.setClock({ clockSeconds: 4, expectedRevision: 1 }).ok).toBe(true);
    expect(scheduler.pendingCount).toBe(0);
    expect(scheduler.cancelled).toHaveLength(1);
    expect(store.getState().session.animation).toMatchObject({ status: "idle", currentSecond: 0 });
  });

  it("declares exact closed schemas/annotations and schedules valid site-tool animation before returning", async () => {
    const { commands, scheduler, store } = commandContext();
    const definitions = createWebMcpToolDefinitions({ commands, store });
    expect(definitions.find((tool) => tool.name === "validate_play")?.annotations).toEqual({ readOnlyHint: true });
    expect(definitions.find((tool) => tool.name === "animate_play")?.annotations).toBeUndefined();
    expect(VALIDATE_PLAY_INPUT_JSON_SCHEMA).toEqual({ type: "object", properties: {}, additionalProperties: false });
    expect(ANIMATE_PLAY_INPUT_JSON_SCHEMA).toEqual({ type: "object", additionalProperties: false, properties: { speed: { type: "number", enum: [0.5, 1, 1.5, 2], description: "Playback speed." }, loop: { type: "boolean", description: "Repeat the animation until paused." } } });

    const browser = createFakeModelContext();
    const registration = registerWebMcpTools({ store, commands, documentRef: documentWith(browser) });
    await registration.registration;
    const started = toolByName(browser, "animate_play").execute({ speed: 1.5, loop: true }) as { ok: boolean };
    expect(started).toMatchObject({ ok: true });
    expect(scheduler.pendingCount).toBe(1);
    commands.stopAnimation();
    commands.setClock({ clockSeconds: 2, expectedRevision: 1 });
    const blocked = toolByName(browser, "animate_play").execute({}) as { ok: boolean; code: string };
    expect(blocked).toMatchObject({ ok: false, code: "PLAY_INVALID" });
    expect(scheduler.pendingCount).toBe(0);
    registration.cleanup();
  });
});
