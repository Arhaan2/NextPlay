import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { playCommands } from "../../src/application/commands";
import { App } from "../../src/App";
import { playStore } from "../../src/state/playStore";

function loadGoldenPlay(): void {
  const result = playCommands.addActions(playCommands.goldenActions());
  if (!result.ok) throw new Error("Could not load the canonical fixture.");
}

function point(id: string): { x: string | null; y: string | null } {
  const circle = screen.getByTestId(`court-player-${id}`).querySelector("circle");
  if (circle === null) throw new Error(`Missing ${id} marker.`);
  return { x: circle.getAttribute("cx"), y: circle.getAttribute("cy") };
}

function ball(): { x: string | null; y: string | null } {
  const circle = screen.getByTestId("ball-owner-indicator").querySelector("circle");
  if (circle === null) throw new Error("Missing ball marker.");
  return { x: circle.getAttribute("cx"), y: circle.getAttribute("cy") };
}

function frame(second: number, status: "playing" | "paused" = "playing"): void {
  act(() => {
    playStore.getState().updateSession((session) => ({ ...session, animation: { ...session.animation, status, currentSecond: second } }));
  });
}

describe("Phase 4 rendered motion and cleanup", () => {
  beforeEach(() => {
    expect(playCommands.resetDemo().ok).toBe(true);
  });

  it("renders offensive movement, static defense, pass/shot ball motion, and an advancing playhead", () => {
    loadGoldenPlay();
    render(<App />);
    const o3AtStart = point("O3");
    const o5AtStart = point("O5");
    const x5AtStart = point("X5");
    expect(o5AtStart).not.toEqual(x5AtStart);
    const x1AtStart = point("X1");
    const ballAtStart = ball();
    const playheadAtStart = screen.getAllByTestId("timeline-playhead")[0]?.style.left;

    frame(0.5);
    expect(point("O3")).not.toEqual(o3AtStart);
    expect(point("X1")).toEqual(x1AtStart);
    expect(screen.getAllByTestId("timeline-playhead")[0]).toHaveAccessibleName("Animation time 0.50s");
    expect(screen.getAllByTestId("timeline-playhead")[0]?.style.left).not.toBe(playheadAtStart);

    expect(point("X5")).toEqual(x5AtStart);
    expect(screen.getByTestId("court")).toHaveAttribute("data-animation-status", "playing");
    expect(screen.getByTestId("court")).toHaveAttribute("data-animation-current-second", "0.5");
    frame(1.55);
    expect(ball()).not.toEqual(ballAtStart);
    expect(screen.getByTestId("ball-owner-indicator")).toHaveAccessibleName("Ball passing");
    const ballDuringPass = ball();
    frame(1.9);
    expect(ball()).not.toEqual(ballDuringPass);
    expect(screen.getByTestId("ball-owner-indicator")).toHaveAccessibleName("Ball shooting");
  });

  it("pauses without moving time, replay starts at zero, reset clears transient state, and unmount stops playback", () => {
    loadGoldenPlay();
    const view = render(<App />);
    frame(1, "playing");
    const beforePause = playStore.getState().session.animation.currentSecond;
    act(() => { playCommands.pauseAnimation(); });
    expect(playStore.getState().session.animation).toMatchObject({ status: "paused", currentSecond: beforePause });
    act(() => { expect(playCommands.restartAnimation().ok).toBe(true); });
    expect(playStore.getState().session.animation).toMatchObject({ status: "playing", currentSecond: 0 });
    act(() => { playCommands.runValidation(); });
    act(() => { expect(playCommands.resetDemo().ok).toBe(true); });
    expect(playStore.getState().session.validation.status).toBe("not_run");
    expect(playStore.getState().session.animation).toMatchObject({ status: "idle", currentSecond: 0 });

    loadGoldenPlay();
    frame(1, "playing");
    view.unmount();
    expect(playStore.getState().session.animation).toMatchObject({ status: "idle", currentSecond: 0 });
  });
});
