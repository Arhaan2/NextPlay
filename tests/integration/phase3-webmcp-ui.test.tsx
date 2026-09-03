import { StrictMode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { playCommands } from "../../src/application/commands";
import { createGoldenActionBatch } from "../../src/domain/presets";
import { playStore } from "../../src/state/playStore";
import { App } from "../../src/App";
import { createFakeModelContext, toolByName } from "../helpers/webMcpTestContext";

const ACTION_IDS = ["A1", "A2", "A3", "A4", "A5", "A6"];

interface AddResult {
  ok: true;
  revision: number;
  actionCount: number;
}

function renderedActionIds(prefix: "court-action" | "timeline-action"): string[] {
  return Array.from(document.querySelectorAll(`[data-testid^="${prefix}-"]`))
    .map((element) => element.getAttribute("data-action-id"))
    .filter((actionId): actionId is string => actionId !== null)
    .sort();
}

describe("Phase 3 WebMCP rendered integration", () => {
  beforeEach(() => {
    document.modelContext = undefined;
    expect(playCommands.resetDemo().ok).toBe(true);
    playStore.getState().updateSession((session) => ({
      ...session,
      activity: [],
      nextActivitySequence: 1,
    }));
  });

  afterEach(() => {
    document.modelContext = undefined;
  });

  it("keeps the status pill honestly manual when support is unavailable", () => {
    render(<App />);

    expect(screen.getByTestId("webmcp-status")).toHaveTextContent("○ Manual mode");
    expect(playStore.getState().session.webmcp).toEqual({
      available: false,
      registeredToolNames: [],
    });
  });

  it("shows availability only after both site tools are registered, then preserves it across reset", async () => {
    const browser = createFakeModelContext();
    document.modelContext = browser;
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("webmcp-status")).toHaveTextContent("● Agent tools available · 2 site tools");
    });
    expect(screen.getByText("No WebMCP activity yet.")).toBeVisible();
    expect(screen.queryByText("WebMCP tools are not registered yet.")).not.toBeInTheDocument();
    expect(browser.registrations.map((registration) => registration.definition.name))
      .toEqual(["get_play_state", "add_play_actions"]);
    const revisionBeforeReset = playStore.getState().document.playRevision;

    act(() => {
      expect(playCommands.resetDemo({ expectedRevision: revisionBeforeReset }).ok).toBe(true);
    });

    expect(playStore.getState().document).toMatchObject({
      playRevision: revisionBeforeReset + 1,
      clockSeconds: 4.2,
      actions: [],
    });
    expect(playStore.getState().session.webmcp).toEqual({
      available: true,
      registeredToolNames: ["get_play_state", "add_play_actions"],
    });
    expect(screen.getByTestId("webmcp-status")).toHaveTextContent("Agent tools available");
  });

  it("cleans up the first React Strict Mode registration before accepting the remounted pair", async () => {
    const browser = createFakeModelContext();
    document.modelContext = browser;
    render(<StrictMode><App /></StrictMode>);

    await waitFor(() => {
      expect(screen.getByTestId("webmcp-status")).toHaveTextContent("Agent tools available · 2 site tools");
    });
    expect(browser.registrations.map((registration) => registration.definition.name))
      .toEqual(["get_play_state", "get_play_state", "add_play_actions"]);
    expect(browser.registrations[0]?.options.signal.aborted).toBe(true);
    expect(playStore.getState().session.webmcp.registeredToolNames)
      .toEqual(["get_play_state", "add_play_actions"]);
  });

  it("renders the command-committed tool batch on matching court and timeline sets before success returns", async () => {
    const browser = createFakeModelContext();
    document.modelContext = browser;
    render(<App />);
    await waitFor(() => expect(browser.registrations).toHaveLength(2));
    const revision = playStore.getState().document.playRevision;

    let result: AddResult | undefined;
    act(() => {
      result = toolByName(browser, "add_play_actions").execute({
        expectedRevision: revision,
        actions: createGoldenActionBatch(),
      }) as AddResult;
    });

    expect(result).toMatchObject({ ok: true, revision: revision + 1, actionCount: 6 });
    expect(playStore.getState().document.actions.map((action) => action.id)).toEqual(ACTION_IDS);
    expect(renderedActionIds("court-action")).toEqual(ACTION_IDS);
    expect(renderedActionIds("timeline-action")).toEqual(ACTION_IDS);
    expect(renderedActionIds("court-action")).toEqual(renderedActionIds("timeline-action"));
    expect(playStore.getState().session.validation.status).toBe("not_run");
    expect(playStore.getState().session.animation).toMatchObject({ status: "idle", currentSecond: 0 });
    expect(screen.getByText("AGENT")).toBeVisible();
    expect(screen.getByText("add actions")).toBeVisible();
  });
});
