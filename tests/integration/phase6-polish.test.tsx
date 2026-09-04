import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../src/App";
import { playCommands } from "../../src/application/commands";
import { createDemoPreset, createGoldenActionBatch } from "../../src/domain/presets";
import type { ActivityEvent, PlayAction, PlayDocument } from "../../src/domain/types";
import { validatePlay } from "../../src/engine/validation";
import { ActivityRail } from "../../src/ui/ActivityRail";
import { DemoPrompts } from "../../src/ui/DemoPrompts";
import { ValidationPanel } from "../../src/ui/ValidationPanel";
import { Court } from "../../src/ui/court/Court";
import { ActionInspector } from "../../src/ui/inspector/ActionInspector";
import { Timeline } from "../../src/ui/timeline/Timeline";
import { playStore } from "../../src/state/playStore";
import stylesheet from "../../src/styles.css?raw";
import { createWebMcpToolDefinitions } from "../../src/webmcp/registerTools";
import { createPlayTestContext } from "../helpers/playTestContext";
import { createFakeModelContext } from "../helpers/webMcpTestContext";

const EXPECTED_FIRST_DEMO_PROMPT = "Use this page’s tools to create a sideline out-of-bounds play that produces a right-corner three for O2. O5 should screen for O2, O4 should cut as a decoy, and the entire play must finish within 4.2 seconds. Read the current play first, add the actions, validate the result, and animate it.";
const EXPECTED_SECOND_DEMO_PROMPT = "I moved the screen, locked the screen and O2’s route, and shortened the clock to 2.0 seconds. Re-read the live play and retime only the unlocked actions so the play finishes within the new clock. Preserve every locked action, validate it, and animate it again.";

function loadGoldenPlay(): void {
  const result = playCommands.addActions(playCommands.goldenActions());
  if (!result.ok) throw new Error("Could not load the canonical fixture.");
}

function activityEvent(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: "activity-1",
    timestamp: 1,
    actor: "coach",
    channel: "ui",
    operation: "lock_action",
    summary: "Locked A3 for the coach.",
    revisionBefore: 2,
    revisionAfter: 3,
    status: "completed",
    ...overrides,
  };
}

function lockedActionDocument(): { document: PlayDocument; action: PlayAction } {
  const document = createDemoPreset();
  const action: PlayAction = {
    ...createGoldenActionBatch()[0],
    id: "LOCK-77",
    locked: true,
    lockOwner: "coach",
    createdBy: "agent",
    lastModifiedBy: "coach",
    createdAtRevision: 4,
    updatedAtRevision: 5,
  };
  document.actions = [action];
  document.playRevision = 5;
  return { document, action };
}

describe("Phase 6 presentation contracts", () => {
  beforeEach(() => {
    document.modelContext = undefined;
    expect(playCommands.resetDemo().ok).toBe(true);
    playCommands.stopAnimation();
    playStore.getState().updateSession((session) => ({
      ...session,
      activity: [],
      nextActivitySequence: 1,
      webmcp: { available: false, registeredToolNames: [] },
    }));
  });

  afterEach(() => {
    document.modelContext = undefined;
  });

  it("keeps the pristine SLOB intentionally empty and describes manual mode honestly", () => {
    render(<App />);

    expect(playStore.getState().document.actions).toEqual([]);
    expect(screen.getByRole("heading", { name: "SLOB formation loaded" })).toBeVisible();
    expect(screen.getByText("Ask your agent to design the play, or use the coach controls manually.")).toBeVisible();
    expect(screen.getByText("Site tools are unavailable in this browser; coach controls remain available.")).toBeVisible();
    expect(screen.getByTestId("webmcp-status")).toHaveTextContent("○ Manual mode");
    expect(screen.getByTestId("webmcp-status")).toHaveTextContent("Site tools are unavailable in this browser.");
    expect(screen.getByText("Actions will appear here after the coach or agent adds them.")).toBeVisible();
    expect(screen.getByText(new RegExp(`r${playStore.getState().document.playRevision}`))).toBeVisible();
  });

  it("shows the exact static five-tool surface only after all registrations finish", async () => {
    const browser = createFakeModelContext();
    document.modelContext = browser;
    render(<App />);

    await waitFor(() => expect(screen.getByTestId("webmcp-status")).toHaveTextContent("● Agent tools available · 5 site tools"));
    const names = browser.registrations.map((registration) => registration.definition.name);
    expect(names).toEqual(["get_play_state", "add_play_actions", "validate_play", "animate_play", "update_play_action"]);
    expect(names).not.toContain("lock_action");
    expect(names).not.toContain("unlock_action");
    expect(createWebMcpToolDefinitions(createPlayTestContext()).map((tool) => tool.name)).toEqual(names);
  });

  it("derives selected coach-lock cues from an arbitrary action ID across court, timeline, and inspector", () => {
    const { document: lockedDocument, action } = lockedActionDocument();
    render(<>
      <Court document={lockedDocument} animation={{ status: "idle", currentSecond: 0, speed: 1, loop: false }} selectedActionId={action.id} onSelectAction={vi.fn()} />
      <Timeline actions={lockedDocument.actions} clockSeconds={lockedDocument.clockSeconds} currentSecond={0} selectedActionId={action.id} onSelectAction={vi.fn()} />
      <ActionInspector action={action} revision={lockedDocument.playRevision} onResult={vi.fn()} />
    </>);

    expect(screen.getByTestId("court-action-LOCK-77")).toHaveClass("is-locked", "is-selected");
    expect(screen.getByTestId("court-action-LOCK-77")).toHaveAccessibleName(/LOCK-77: Clear\. Coach locked\./);
    expect(screen.getByTestId("timeline-action-LOCK-77")).toHaveClass("is-locked", "is-selected");
    expect(screen.getByTestId("timeline-action-LOCK-77")).toHaveAccessibleName(/LOCK-77.*coach locked/);
    const inspector = screen.getByRole("heading", { name: "Action inspector" }).closest("section");
    if (inspector === null) throw new Error("The action inspector is missing.");
    expect(inspector).toHaveTextContent("🔒 Coach locked");
    expect(within(inspector).getByRole("status")).toHaveTextContent("Coach locked — tactical fields are protected from agent edits.");
    expect(within(inspector).getByLabelText("Start second")).toBeDisabled();
    expect(within(inspector).getByLabelText("Duration second")).toBeDisabled();
    expect(within(inspector).getByLabelText("Destination")).toBeDisabled();
    expect(within(inspector).getByLabelText("Label")).toBeDisabled();
    expect(within(inspector).getByRole("button", { name: "Apply action" })).toBeDisabled();
    expect(within(inspector).getByRole("button", { name: "Unlock action" })).toBeEnabled();
  });

  it("shows actor, status, revisions, and safe expand/collapse details without mutating activity or the play", async () => {
    const user = userEvent.setup();
    const details = { tool: "update_play_action", changedFields: ["startSecond"], veryLong: "x".repeat(2_000) };
    const activity = [
      activityEvent({ id: "coach", actor: "coach", summary: "Locked A3.", revisionBefore: 2, revisionAfter: 3 }),
      activityEvent({ id: "agent", actor: "agent", channel: "webmcp", operation: "update_action", summary: "Retimed A5.", revisionBefore: 5, revisionAfter: 6, details }),
      activityEvent({ id: "system", actor: "system", channel: "webmcp", operation: "preserve_locked_actions", summary: "A3 remained unchanged.", revisionBefore: 6, revisionAfter: 6, status: "failed", details: { actionIds: ["A3"] } }),
      activityEvent({ id: "without-details", actor: "system", operation: "validate_play", summary: "Validated.", revisionBefore: 6, revisionAfter: 6, details: undefined }),
    ];
    const beforeRevision = playStore.getState().document.playRevision;
    const beforeActivity = structuredClone(activity);
    render(<ActivityRail activity={activity} webMcpAvailable />);

    expect(screen.getAllByText("COACH")).not.toHaveLength(0);
    expect(screen.getByText("AGENT")).toBeVisible();
    expect(screen.getAllByText("SYSTEM")).not.toHaveLength(0);
    expect(screen.getByText("WEBMCP · r5 → r6")).toBeVisible();
    expect(screen.getByText("failed")).toBeVisible();
    expect(screen.getByText("failed").closest("li")).toHaveClass("activity-event--failed");
    expect(screen.getAllByRole("button", { name: "Expand details" })).toHaveLength(2);
    expect(screen.queryByText("Validated.")?.parentElement).not.toHaveTextContent("Expand details");

    await user.click(screen.getAllByRole("button", { name: "Expand details" })[0]);
    expect(screen.getByRole("button", { name: "Collapse details" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/update_play_action/)).toBeVisible();
    const expandedDetails = document.querySelector(".activity-event__details");
    expect(expandedDetails).toHaveTextContent("x".repeat(2_000));
    await user.click(screen.getByRole("button", { name: "Collapse details" }));
    expect(document.querySelector(".activity-event__details")).toBeNull();
    expect(playStore.getState().document.playRevision).toBe(beforeRevision);
    expect(activity).toEqual(beforeActivity);
  });

  it("renders concise honest validation states without mutating the document", () => {
    const validDocument = createDemoPreset();
    validDocument.actions = createGoldenActionBatch().map((input, index) => ({ ...input, id: `A${index + 1}`, locked: false, createdBy: "agent", lastModifiedBy: "agent", createdAtRevision: 7, updatedAtRevision: 7 }));
    validDocument.playRevision = 7;
    const validReport = validatePlay(validDocument);
    const overflowReport = validatePlay({ ...structuredClone(validDocument), clockSeconds: 2 });
    const mixedDocument = structuredClone(validDocument);
    mixedDocument.clockSeconds = 2;
    mixedDocument.actions[4] = { ...mixedDocument.actions[4], actorId: "O3" };
    const mixedReport = validatePlay(mixedDocument);
    const onMessage = vi.fn();
    const before = structuredClone(playStore.getState().document);
    const view = render(<ValidationPanel report={{ status: "not_run", checks: [], checksPassed: 0, checksTotal: 0, errors: [], warnings: [] }} onMessage={onMessage} />);

    expect(screen.getByText("Validation has not been run yet.")).toBeVisible();
    view.rerender(<ValidationPanel report={validReport} onMessage={onMessage} />);
    expect(screen.getByText("7/7 execution checks passed")).toBeVisible();
    expect(screen.getByText("Validated at revision 7")).toBeVisible();
    view.rerender(<ValidationPanel report={overflowReport} onMessage={onMessage} />);
    expect(screen.getByText("6/7 execution checks passed · 1 timing conflict")).toBeVisible();
    expect(screen.getByText("A6 · CLOCK OVERFLOW")).toBeVisible();
    expect(screen.getByText("2.15s")).toBeVisible();
    expect(screen.getByText("2.00s")).toBeVisible();
    expect(screen.getByText("0.15s")).toBeVisible();
    view.rerender(<ValidationPanel report={mixedReport} onMessage={onMessage} />);
    expect(screen.getByText(/blocking errors/)).toBeVisible();
    expect(screen.queryByText(/quality|optimal|guaranteed|%/i)).not.toBeInTheDocument();
    expect(playStore.getState().document).toEqual(before);
  });

  it("copies each exact smart-apostrophe prompt independently, announces success and failure, and leaves play state alone", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn<Navigator["clipboard"]["writeText"]>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const beforeDocument = structuredClone(playStore.getState().document);
    const beforeActivity = structuredClone(playStore.getState().session.activity);
    render(<DemoPrompts />);

    await user.click(screen.getByText("Demo prompts"));
    expect(screen.getByText(EXPECTED_FIRST_DEMO_PROMPT)).toBeVisible();
    expect(screen.getByText(EXPECTED_SECOND_DEMO_PROMPT)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Copy first play demo prompt" }));
    const replanCopy = screen.getByRole("button", { name: "Copy replan demo prompt" });
    replanCopy.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(writeText).toHaveBeenNthCalledWith(1, EXPECTED_FIRST_DEMO_PROMPT));
    expect(writeText).toHaveBeenNthCalledWith(2, EXPECTED_SECOND_DEMO_PROMPT);
    expect(screen.getByText("First play prompt copied.")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Replan prompt copied.")).toHaveAttribute("aria-live", "polite");
    expect(playStore.getState().document).toEqual(beforeDocument);
    expect(playStore.getState().session.activity).toEqual(beforeActivity);

    writeText.mockRejectedValueOnce(new Error("denied"));
    await user.click(screen.getByRole("button", { name: "Copy first play demo prompt" }));
    expect(await screen.findByText("Could not copy the prompt — select and copy it manually.")).toHaveAttribute("aria-live", "polite");
  });

  it("keeps playback state readable and transient, including the zero-action guard", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText("Idle · 0.00s / 0.00s")).toBeVisible();
    expect(screen.getByRole("button", { name: "Play from start" })).toBeDisabled();
    expect(screen.getByText("Add timed actions before playback.")).toBeVisible();

    act(() => { loadGoldenPlay(); });
    const revision = playStore.getState().document.playRevision;
    const controls = screen.getByRole("region", { name: "Animation controls" });
    expect(within(controls).getByRole("status")).toHaveTextContent("Idle · 0.00s / 2.15s");
    await user.click(screen.getByRole("button", { name: "Play from start" }));
    expect(within(controls).getByRole("status")).toHaveTextContent("Playing · 0.00s / 2.15s");
    expect(screen.getByRole("button", { name: "Pause" })).toBeEnabled();
    expect(playStore.getState().document.playRevision).toBe(revision);
  });

  it("keeps desktop containment, visible focus, non-color state words, and reduced-motion rules in the stylesheet", () => {
    expect(stylesheet).toMatch(/button:focus-visible[^}]*outline: 2px solid/);
    expect(stylesheet).toMatch(/\.court-action:focus-visible/);
    expect(stylesheet).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*transition-duration: 0\.01ms/);
    expect(stylesheet).toMatch(/\.app-shell \{[^}]*width: min\(1480px, 100%\)/);
    expect(stylesheet).toMatch(/\.side-rail \{[^}]*overflow-y: auto[^}]*overscroll-behavior: contain/);
    expect(stylesheet).toMatch(/\.activity-event__details \{[^}]*max-width: 100%[^}]*overflow: auto[^}]*overflow-wrap: anywhere/);
    expect(stylesheet).toMatch(/\.activity-event__heading b/);
    expect(stylesheet).toMatch(/\.timeline-action\.is-locked[^}]*border: 2px dashed/);
  });

  it("keeps pristine timeline guidance in the heading without competing with the timing scale grid cell", () => {
    const view = render(<Timeline actions={[]} clockSeconds={4.2} currentSecond={0} selectedActionId={undefined} onSelectAction={vi.fn()} />);
    const timeline = view.container.querySelector(".timeline-shell");
    const heading = timeline?.querySelector(".timeline-heading");
    const scale = timeline?.querySelector(".timeline-scale");
    const guidance = screen.getByText("Actions will appear here after the coach or agent adds them.");

    expect(timeline).not.toBeNull();
    expect(heading).toContainElement(guidance);
    expect(scale).not.toContainElement(guidance);
  });
});
