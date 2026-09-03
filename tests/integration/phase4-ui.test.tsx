import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { playCommands } from "../../src/application/commands";
import { App } from "../../src/App";
import { playStore } from "../../src/state/playStore";

function loadGoldenPlay(): void {
  const result = playCommands.addActions(playCommands.goldenActions());
  if (!result.ok) throw new Error("Could not load the canonical fixture.");
}

describe("Phase 4 validation and playback UI", () => {
  beforeEach(() => {
    expect(playCommands.resetDemo().ok).toBe(true);
  });

  it("keeps not-run validation honest, renders the 7/7 report through the coach control, and exposes its revision", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText("Validation has not been run yet.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Run checks" })).toBeEnabled();
    loadGoldenPlay();
    const revision = playStore.getState().document.playRevision;
    await user.click(screen.getByRole("button", { name: "Run checks" }));
    expect(screen.getByText("7/7 execution checks passed")).toBeVisible();
    expect(screen.getByText(new RegExp("^Validated at revision " + revision + "$"))).toBeVisible();
    expect(screen.getByText("0 errors")).toBeVisible();
    expect(playStore.getState().document.playRevision).toBe(revision);
  });

  it("renders refreshed A6 overflow, blocked playback feedback, and a transient timeline playhead", async () => {
    const user = userEvent.setup();
    loadGoldenPlay();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Run checks" }));
    const revision = playStore.getState().document.playRevision;
    act(() => { expect(playCommands.setClock({ clockSeconds: 2, expectedRevision: revision }).ok).toBe(true); });
    expect(screen.getByText(/A6 \(O2 shot\) ends at 2.15s, after the 2.00s clock by 0.15s/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Play from start" }));
    expect(screen.getByText(/PLAY_INVALID: The play has blocking validation errors/)).toBeVisible();
    expect(playStore.getState().document.playRevision).toBe(revision + 1);
    act(() => {
      playStore.getState().updateSession((session) => ({ ...session, animation: { ...session.animation, status: "paused", currentSecond: 1 } }));
    });
    const playhead = screen.getAllByTestId("timeline-playhead")[0];
    expect(playhead).toHaveAccessibleName("Animation time 1.00s");
    expect(playhead).toHaveStyle({ left: `${(1 / 2.15) * 100}%` });
  });
});
