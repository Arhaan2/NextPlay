import { describe, expect, it } from "vitest";

import { AnimationController, type AnimationFrameScheduler } from "../../src/engine/animation/animationController";
import { createPlayCommands } from "../../src/application/commands";
import { createGoldenActionBatch } from "../../src/domain/presets";
import { createPlayStore } from "../../src/state/playStore";

class FrameScheduler implements AnimationFrameScheduler {
  private nowValue = 0;
  private nextId = 1;
  private callbacks = new Map<number, FrameRequestCallback>();
  readonly cancelled: number[] = [];
  now = () => this.nowValue;
  requestFrame = (callback: FrameRequestCallback) => {
    const id = this.nextId;
    this.nextId += 1;
    this.callbacks.set(id, callback);
    return id;
  };
  cancelFrame = (id: number) => {
    this.cancelled.push(id);
    this.callbacks.delete(id);
  };
  flush(timestamp: number): void {
    this.nowValue = timestamp;
    const pending = [...this.callbacks.entries()];
    this.callbacks.clear();
    pending.forEach(([, callback]) => callback(timestamp));
  }
  get pendingCount(): number { return this.callbacks.size; }
}

function loadedContext() {
  const store = createPlayStore();
  const scheduler = new FrameScheduler();
  const controller = new AnimationController(store, scheduler);
  const commands = createPlayCommands(store, {
    now: () => 1_700_000_000_000,
    createActivityId: (sequence) => `phase4-activity-${sequence}`,
    animationController: controller,
  });
  const add = commands.addActions({ actions: createGoldenActionBatch(), expectedRevision: 0 });
  if (!add.ok) throw new Error("Could not load the canonical fixture.");
  return { commands, scheduler, store };
}

describe("Phase 4 validation and playback session commands", () => {
  it("stores a complete validation report without a revision, then refreshes it after a content edit without fake activity", () => {
    const { commands, store } = loadedContext();
    const validation = commands.runValidation();
    expect(validation).toMatchObject({ ok: true, revision: 1, data: { valid: true, validatedRevision: 1, checksPassed: 7, checksTotal: 7 } });
    expect(store.getState().document.playRevision).toBe(1);
    expect(store.getState().session.activity.at(-1)).toMatchObject({ operation: "validate_play", revisionBefore: 1, revisionAfter: 1 });
    const activityCount = store.getState().session.activity.length;

    expect(commands.setClock({ clockSeconds: 2, expectedRevision: 1 })).toMatchObject({ ok: true, revision: 2 });
    expect(store.getState().session.validation).toMatchObject({ status: "complete", validatedRevision: 2, valid: false });
    expect(store.getState().session.validation.errors).toContainEqual(expect.objectContaining({ code: "CLOCK_OVERFLOW", actionId: "A6", overBySeconds: 0.15 }));
    expect(store.getState().session.activity).toHaveLength(activityCount + 1);
    expect(store.getState().session.activity.at(-1)).toMatchObject({ operation: "set_clock" });
  });

  it("blocks invalid animation without revision changes and reset restores not-run/idle state", () => {
    const { commands, store } = loadedContext();
    commands.runValidation();
    commands.setClock({ clockSeconds: 2 });
    expect(commands.startAnimation()).toMatchObject({ ok: false, revision: 2, code: "PLAY_INVALID" });
    expect(store.getState().document.playRevision).toBe(2);
    expect(store.getState().session.animation).toMatchObject({ status: "idle", currentSecond: 0 });
    expect(commands.resetDemo()).toMatchObject({ ok: true, revision: 3 });
    expect(store.getState().session.validation).toEqual({ status: "not_run", checks: [], checksPassed: 0, checksTotal: 0, errors: [], warnings: [] });
    expect(store.getState().session.animation).toEqual({ status: "idle", currentSecond: 0, speed: 1, loop: false });
  });

  it("advances exactly one injectable frame loop, scales speed, wraps loops, cancels, and emits no frame activity", () => {
    const { commands, scheduler, store } = loadedContext();
    expect(commands.startAnimation({ speed: 2, loop: false })).toMatchObject({ ok: true, revision: 1, data: { durationSeconds: 2.15, speed: 2, loop: false } });
    expect(scheduler.pendingCount).toBe(1);
    expect(commands.restartAnimation({ speed: 1, loop: false }).ok).toBe(true);
    expect(scheduler.pendingCount).toBe(1);
    const activityCount = store.getState().session.activity.length;
    scheduler.flush(500);
    expect(store.getState().session.animation.currentSecond).toBe(0.5);
    expect(scheduler.pendingCount).toBe(1);
    expect(store.getState().session.activity).toHaveLength(activityCount);
    expect(store.getState().document.playRevision).toBe(1);

    commands.pauseAnimation();
    expect(scheduler.pendingCount).toBe(0);
    expect(scheduler.cancelled).toHaveLength(1);
    expect(commands.restartAnimation({ speed: 1, loop: true })).toMatchObject({ ok: true });
    scheduler.flush(3_000);
    expect(store.getState().session.animation).toMatchObject({ status: "playing", loop: true });
    expect(store.getState().session.animation.currentSecond).toBeCloseTo(0.35, 12);
    expect(scheduler.pendingCount).toBe(1);
    commands.stopAnimation();
    expect(scheduler.pendingCount).toBe(0);
    expect(store.getState().session.animation).toMatchObject({ status: "idle", currentSecond: 0 });
  });
});
