import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { playCommands } from "../../src/application/commands";
import { getStaticActionGeometry } from "../../src/engine/geometry/actionGeometry";
import { getCourtPlayerDisplayPoint, toCourtDisplayPoint } from "../../src/engine/geometry/displayCoordinates";
import { playStore } from "../../src/state/playStore";
import { App } from "../../src/App";
import stylesheet from "../../src/styles.css?raw";

const goldenIds = ["A1", "A2", "A3", "A4", "A5", "A6"];

function expectSuccess<T>(result: { ok: boolean; revision: number; data?: T }): asserts result is { ok: true; revision: number; data: T } {
  expect(result.ok).toBe(true);
}

function loadGoldenActions(): void {
  expectSuccess(playCommands.addActions(playCommands.goldenActions()));
}

function action(actionId: string) {
  const found = playStore.getState().document.actions.find((candidate) => candidate.id === actionId);
  if (found === undefined) {
    throw new Error(`Expected ${actionId} to be loaded.`);
  }
  return found;
}

function renderedActionIds(prefix: "court-action" | "timeline-action"): string[] {
  return Array.from(document.querySelectorAll(`[data-testid^="${prefix}-"]`))
    .map((element) => element.getAttribute("data-action-id"))
    .filter((actionId): actionId is string => actionId !== null)
    .sort();
}

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function boundsAround(point: { x: number; y: number }, halfWidth: number, halfHeight: number): Bounds {
  return {
    left: point.x - halfWidth,
    right: point.x + halfWidth,
    top: point.y - halfHeight,
    bottom: point.y + halfHeight,
  };
}

function boundsIntersect(first: Bounds, second: Bounds): boolean {
  return first.left < second.right
    && first.right > second.left
    && first.top < second.bottom
    && first.bottom > second.top;
}

function renderedPlayerCenter(playerId: string): { x: number; y: number } {
  const marker = screen.getByTestId(`court-player-${playerId}`).querySelector("circle");
  if (marker === null) {
    throw new Error(`The ${playerId} marker is missing its circle.`);
  }
  return {
    x: Number(marker.getAttribute("cx")),
    y: Number(marker.getAttribute("cy")),
  };
}

describe("Phase 2 coach workspace", () => {
  beforeEach(() => {
    // The app consumes the production singleton, so reset through its public command
    // boundary before each interaction test instead of directly committing document state.
    expectSuccess(playCommands.resetDemo());
  });

  it("starts with the complete SLOB formation, O1 ball ownership, and no rendered actions", () => {
    render(<App />);

    for (const playerId of ["O1", "O2", "O3", "O4", "O5"]) {
      expect(screen.getByTestId(`court-player-${playerId}`)).toHaveAccessibleName(new RegExp(`Offense ${playerId}`));
    }
    for (const playerId of ["X1", "X2", "X3", "X4", "X5"]) {
      expect(screen.getByTestId(`court-player-${playerId}`)).toHaveAccessibleName(new RegExp(`Defense ${playerId}`));
    }
    expect(screen.getByTestId("ball-owner-indicator")).toHaveAccessibleName("Ball with O1");
    expect(playStore.getState().document.actions).toEqual([]);
    expect(renderedActionIds("court-action")).toEqual([]);
    expect(renderedActionIds("timeline-action")).toEqual([]);
  });

  it("keeps O5 at its semantic point, fans out only the overlapping X5 marker, and anchors O1's ball to O1", () => {
    render(<App />);
    const documentState = playStore.getState().document;
    const o5 = documentState.players.find((player) => player.id === "O5");
    const x5 = documentState.players.find((player) => player.id === "X5");
    const o1 = documentState.players.find((player) => player.id === "O1");
    if (o5 === undefined || x5 === undefined || o1 === undefined) {
      throw new Error("The SLOB fixture is missing a required player.");
    }

    const o5Display = toCourtDisplayPoint(o5.startingPosition);
    const x5Display = toCourtDisplayPoint(x5.startingPosition);
    const o1Display = toCourtDisplayPoint(o1.startingPosition);
    expect(renderedPlayerCenter("O5")).toEqual(o5Display);
    expect(getCourtPlayerDisplayPoint(documentState.players, "O5")).toEqual(o5Display);
    expect(renderedPlayerCenter("X5")).toEqual(getCourtPlayerDisplayPoint(documentState.players, "X5"));
    expect(renderedPlayerCenter("X5")).not.toEqual(x5Display);
    expect(renderedPlayerCenter("X5")).not.toEqual(renderedPlayerCenter("O5"));

    for (const player of documentState.players.filter((candidate) => candidate.id !== "X5")) {
      expect(renderedPlayerCenter(player.id)).toEqual(toCourtDisplayPoint(player.startingPosition));
    }
    const ball = screen.getByTestId("ball-owner-indicator").querySelector("circle");
    expect(ball).toHaveAttribute("cx", String(o1Display.x - 3.2));
    expect(ball).toHaveAttribute("cy", String(o1Display.y - 3.2));
  });

  it("places the zero-action empty-state card in bottom backcourt space instead of centering it over preset markers", () => {
    render(<App />);
    const court = screen.getByTestId("court");
    const emptyState = screen.getByRole("heading", { name: "The board is ready for the first play." }).closest("div");
    if (emptyState === null) {
      throw new Error("The zero-action court card is missing.");
    }

    expect(court).toContainElement(emptyState);
    expect(stylesheet).toMatch(/\.court-empty-state \{[^}]*position: absolute[^}]*left: 50%[^}]*bottom: 12px[^}]*transform: translateX\(-50%\)[^}]*\}/);
    expect(stylesheet).not.toMatch(/\.court-empty-state \{[^}]*top: 50%/);
    expect(stylesheet).not.toMatch(/\.court-empty-state \{[^}]*translate\(-50%, -50%\)/);
  });

  it("renders the canonical command-loaded batch exactly once on both views", () => {
    loadGoldenActions();
    render(<App />);

    expect(renderedActionIds("court-action")).toEqual(goldenIds);
    expect(renderedActionIds("timeline-action")).toEqual(goldenIds);
    expect(new Set(renderedActionIds("court-action"))).toEqual(new Set(renderedActionIds("timeline-action")));
    expect(playStore.getState().document.playRevision).toBeGreaterThan(0);
  });

  it("uses distinct visible semantics for move, dribble, screen, pass, and shot", () => {
    loadGoldenActions();
    expectSuccess(playCommands.addActions({
      actions: [{ type: "dribble", actorId: "O1", destinationZone: "top", startSecond: 0.1, durationSecond: 0.5, label: "Advance" }],
      expectedRevision: playStore.getState().document.playRevision,
    }));
    render(<App />);

    const move = screen.getByTestId("court-action-A1");
    const dribble = screen.getByTestId("court-action-A7");
    const screenAction = screen.getByTestId("court-action-A3");
    const pass = screen.getByTestId("court-action-A5");
    const shot = screen.getByTestId("court-action-A6");

    expect(move).toHaveClass("court-action--move");
    expect(dribble).toHaveClass("court-action--dribble");
    expect(screenAction).toHaveClass("court-action--screen");
    expect(screenAction.querySelector(".court-action__screen-bar")).not.toBeNull();
    expect(pass).toHaveClass("court-action--pass");
    expect(shot).toHaveClass("court-action--shot");
    expect(new Set([move, dribble, screenAction, pass, shot].map((element) => element.getAttribute("class"))).size).toBe(5);
  });

  it("keeps court and timeline click and keyboard selection synchronized with the inspector", async () => {
    const user = userEvent.setup();
    loadGoldenActions();
    render(<App />);

    await user.click(screen.getByTestId("court-action-A3"));
    expect(playStore.getState().session.selectedActionId).toBe("A3");
    expect(screen.getByTestId("court-action-A3")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("timeline-action-A3")).toHaveAttribute("aria-pressed", "true");
    const inspector = screen.getByRole("heading", { name: "Action inspector" }).closest("section");
    if (inspector === null) {
      throw new Error("The action inspector panel is missing.");
    }
    expect(inspector).toHaveTextContent("A3");
    expect(within(inspector).getByText("O5")).toBeVisible();
    expect(within(inspector).getByText("O2")).toBeVisible();
    expect(within(inspector).getByText("pin down")).toBeVisible();
    expect(within(inspector).getByLabelText("Destination")).toHaveValue("right_block");
    expect(within(inspector).getByLabelText("Start second")).toHaveValue(0.15);
    expect(within(inspector).getByLabelText("Duration second")).toHaveValue(0.8);

    await user.click(screen.getByTestId("timeline-action-A4"));
    expect(playStore.getState().session.selectedActionId).toBe("A4");
    fireEvent.keyDown(screen.getByTestId("court-action-A3"), { key: "Enter" });
    expect(playStore.getState().session.selectedActionId).toBe("A3");
    fireEvent.keyDown(screen.getByTestId("timeline-action-A4"), { key: " " });
    expect(playStore.getState().session.selectedActionId).toBe("A4");
  });

  it("commits destination and timing edits through one revision each, updates geometry, and records coach activity", async () => {
    const user = userEvent.setup();
    loadGoldenActions();
    render(<App />);
    await user.click(screen.getByTestId("court-action-A3"));

    const beforeDestinationRevision = playStore.getState().document.playRevision;
    const beforeGeometry = getStaticActionGeometry(playStore.getState().document, action("A3")).path;
    await user.selectOptions(screen.getByLabelText("Destination"), "right_elbow");
    await user.click(screen.getByRole("button", { name: "Apply action" }));

    expect(playStore.getState().document.playRevision).toBe(beforeDestinationRevision + 1);
    expect(action("A3")).toMatchObject({ destinationZone: "right_elbow", lastModifiedBy: "coach" });
    expect(screen.getByLabelText("Destination")).toHaveValue("right_elbow");
    expect(getStaticActionGeometry(playStore.getState().document, action("A3")).path).not.toBe(beforeGeometry);
    expect(screen.getByTestId("court-action-A3").querySelector(".court-action__line")).toHaveAttribute(
      "d",
      getStaticActionGeometry(playStore.getState().document, action("A3")).path,
    );
    const editedA3Geometry = getStaticActionGeometry(playStore.getState().document, action("A3"));
    if (editedA3Geometry.screenBar === undefined) {
      throw new Error("A3 must retain a screen bar after its stationary destination edit.");
    }
    expect(Math.hypot(
      editedA3Geometry.screenBar.to.x - editedA3Geometry.screenBar.from.x,
      editedA3Geometry.screenBar.to.y - editedA3Geometry.screenBar.from.y,
    )).toBeGreaterThan(0);
    const editedScreenBar = screen.getByTestId("court-action-A3").querySelector(".court-action__screen-bar");
    expect(editedScreenBar).toBeVisible();
    expect(editedScreenBar).toHaveAttribute(
      "d",
      `M ${editedA3Geometry.screenBar.from.x} ${editedA3Geometry.screenBar.from.y} L ${editedA3Geometry.screenBar.to.x} ${editedA3Geometry.screenBar.to.y}`,
    );
    expect(screen.getAllByText("COACH").length).toBeGreaterThan(0);
    expect(screen.getByText("update action")).toBeVisible();

    const beforeTimingRevision = playStore.getState().document.playRevision;
    await user.clear(screen.getByLabelText("Start second"));
    await user.type(screen.getByLabelText("Start second"), "0.20");
    await user.click(screen.getByRole("button", { name: "Apply action" }));
    expect(playStore.getState().document.playRevision).toBe(beforeTimingRevision + 1);
    expect(action("A3").startSecond).toBe(0.2);
  });

  it("keeps persistent content and the revision unchanged for invalid inspector input", async () => {
    const user = userEvent.setup();
    loadGoldenActions();
    render(<App />);
    await user.click(screen.getByTestId("timeline-action-A3"));
    const before = structuredClone(playStore.getState().document);

    await user.clear(screen.getByLabelText("Duration second"));
    await user.type(screen.getByLabelText("Duration second"), "0");
    await user.click(screen.getByRole("button", { name: "Apply action" }));

    expect(playStore.getState().document).toEqual(before);
    expect(screen.getByText("INVALID_INPUT: Start must be nonnegative and duration must be greater than zero.")).toBeVisible();
  });

  it("locks and unlocks A3 with one revision per toggle and exposes the lock across the workspace", async () => {
    const user = userEvent.setup();
    loadGoldenActions();
    render(<App />);
    await user.click(screen.getByTestId("court-action-A3"));

    const beforeLockRevision = playStore.getState().document.playRevision;
    await user.click(screen.getByRole("button", { name: "Lock action" }));
    expect(playStore.getState().document.playRevision).toBe(beforeLockRevision + 1);
    expect(action("A3")).toMatchObject({ locked: true, lockOwner: "coach", lastModifiedBy: "coach" });
    expect(screen.getByTestId("court-action-A3")).toHaveTextContent("▣ Pin-down");
    expect(screen.getByTestId("timeline-action-A3")).toHaveAccessibleName(/locked/);
    expect(screen.getByLabelText("Start second")).toBeDisabled();
    expect(screen.getByLabelText("Duration second")).toBeDisabled();
    expect(screen.getByLabelText("Destination")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Apply action" })).toBeDisabled();

    const beforeUnlockRevision = playStore.getState().document.playRevision;
    await user.click(screen.getByRole("button", { name: "Unlock action" }));
    expect(playStore.getState().document.playRevision).toBe(beforeUnlockRevision + 1);
    expect(action("A3")).toMatchObject({ locked: false, lastModifiedBy: "coach" });
    expect(action("A3")).not.toHaveProperty("lockOwner");
    expect(screen.getByLabelText("Destination")).toBeEnabled();
  });

  it("allows the coach to select and lock A4", async () => {
    const user = userEvent.setup();
    loadGoldenActions();
    render(<App />);
    await user.click(screen.getByTestId("timeline-action-A4"));
    const beforeRevision = playStore.getState().document.playRevision;
    await user.click(screen.getByRole("button", { name: "Lock action" }));

    expect(playStore.getState().document.playRevision).toBe(beforeRevision + 1);
    expect(action("A4")).toMatchObject({ locked: true, lockOwner: "coach" });
    expect(screen.getByTestId("court-action-A4")).toHaveTextContent("▣ Corner flare");
  });

  it("keeps overflow actions visible on their 2.15-second visual range while marking the 2.0-second clock boundary", async () => {
    const user = userEvent.setup();
    loadGoldenActions();
    render(<App />);
    const beforeRevision = playStore.getState().document.playRevision;

    await user.clear(screen.getByRole("spinbutton", { name: "Clock" }));
    await user.type(screen.getByRole("spinbutton", { name: "Clock" }), "2.0");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(playStore.getState().document).toMatchObject({ clockSeconds: 2, playRevision: beforeRevision + 1 });
    expect(screen.getByText("2.0 seconds")).toBeVisible();
    const timelineScale = screen.getByLabelText("Timeline scale ending at 2 seconds");
    expect(timelineScale).toBeVisible();
    expect(timelineScale).toHaveAccessibleDescription("Overflow actions extend the visual scale to 2.15 seconds.");
    expect(within(timelineScale).getByText("2.15s")).toBeVisible();
    expect(screen.getByTestId("timeline-action-A6")).toBeVisible();
    const a6Track = screen.getByTestId("timeline-action-A6").closest(".timeline-row__track");
    if (a6Track === null) {
      throw new Error("A6 is missing its timeline track.");
    }
    const boundary = a6Track.querySelector<HTMLElement>(".timeline-row__boundary");
    if (boundary === null) {
      throw new Error("The timeline clock boundary is missing.");
    }
    expect(Number.parseFloat(boundary.style.left)).toBeCloseTo((2 / 2.15) * 100, 6);
    expect(Number.parseFloat(boundary.style.left)).not.toBeCloseTo(100, 6);
    expect(screen.getByText("set clock")).toBeVisible();
  });

  it("keeps a selected action in the fixed 340px court workspace with an internally scrolling rail and following timeline composition", async () => {
    const user = userEvent.setup();
    loadGoldenActions();
    render(<App />);
    await user.click(screen.getByTestId("court-action-A3"));

    const workspace = screen.getByRole("region", { name: "Play workspace" });
    const court = screen.getByTestId("court");
    const rail = screen.getByRole("complementary", { name: "Agent and validation status" });
    const timeline = screen.getByRole("region", { name: "Live action timing" });
    const prompt = screen.getByText("Example prompt").closest("footer");

    expect(stylesheet).toMatch(/\.workspace \{[^}]*height: 340px[^}]*min-height: 0[^}]*\}/);
    expect(stylesheet).toMatch(/\.court \{[^}]*height: 340px[^}]*\}/);
    expect(stylesheet).toMatch(/\.side-rail \{[^}]*overflow-y: auto[^}]*\}/);
    expect(workspace).toContainElement(court);
    expect(workspace).toContainElement(rail);
    expect(workspace.nextElementSibling).toBe(timeline);
    expect(timeline.nextElementSibling).toBe(prompt);
    expect(screen.getByRole("heading", { name: "Action inspector" }).parentElement).toHaveTextContent("A3");
  });

  it("uses one clamped O1 coordinate for the marker, ball, and A5 pass start while keeping A5's label clear", () => {
    loadGoldenActions();
    render(<App />);
    const documentState = playStore.getState().document;
    const o1 = documentState.players.find((player) => player.id === "O1");
    if (o1 === undefined) {
      throw new Error("The SLOB fixture is missing O1.");
    }
    const o1Display = toCourtDisplayPoint(o1.startingPosition);
    const a5Geometry = getStaticActionGeometry(documentState, action("A5"));
    const o1Marker = screen.getByTestId("court-player-O1").querySelector("circle");
    const ball = screen.getByTestId("ball-owner-indicator").querySelector("circle");
    const a5Line = screen.getByTestId("court-action-A5").querySelector(".court-action__line");

    expect(a5Geometry.start).toEqual(o1Display);
    expect(o1Marker).toHaveAttribute("cx", String(o1Display.x));
    expect(o1Marker).toHaveAttribute("cy", String(o1Display.y));
    expect(ball).toHaveAttribute("cx", String(o1Display.x - 3.2));
    expect(ball).toHaveAttribute("cy", String(o1Display.y - 3.2));
    expect(a5Line).toHaveAttribute("d", a5Geometry.path);

    const markerBounds = boundsAround(o1Display, 3.1, 3.1);
    const labelBounds = boundsAround(a5Geometry.labelAnchor, 5, 2.25);
    expect(boundsIntersect(labelBounds, markerBounds)).toBe(false);
  });

  it("resets through the command, clearing actions and selection while restoring the SLOB state and reset activity", async () => {
    const user = userEvent.setup();
    loadGoldenActions();
    render(<App />);
    await user.click(screen.getByTestId("court-action-A3"));
    const beforeRevision = playStore.getState().document.playRevision;

    await user.click(screen.getByRole("button", { name: "Reset demo" }));

    expect(playStore.getState().document).toMatchObject({ clockSeconds: 4.2, ballOwnerId: "O1", playRevision: beforeRevision + 1, actions: [] });
    expect(playStore.getState().session.selectedActionId).toBeUndefined();
    expect(renderedActionIds("court-action")).toEqual([]);
    expect(renderedActionIds("timeline-action")).toEqual([]);
    expect(screen.getByTestId("ball-owner-indicator")).toHaveAccessibleName("Ball with O1");
    expect(document.querySelectorAll('[data-testid^="court-player-"]')).toHaveLength(10);
    expect(screen.getByText("reset demo")).toBeVisible();
    expect(screen.getAllByText("COACH").length).toBeGreaterThan(0);
  });
});
