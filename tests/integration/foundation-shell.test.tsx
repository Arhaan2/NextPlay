import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "../../src/App";

describe("NextPlay Phase 0 shell", () => {
  it("renders the complete initial SLOB workspace with named landmarks", () => {
    render(<App />);

    const scenarioSummary = screen.getByRole("region", {
      name: "Demo scenario summary",
    });
    expect(scenarioSummary).toHaveTextContent("Sideline out of bounds");
    expect(scenarioSummary).toHaveTextContent("4.2 seconds");
    expect(scenarioSummary).toHaveTextContent("Man-to-man");

    const workspace = screen.getByRole("region", { name: "Play workspace" });
    expect(
      within(workspace).getByRole("img", {
        name: "Basketball court workspace",
      }),
    ).toBeVisible();

    const statusRail = within(workspace).getByRole("complementary", {
      name: "Agent and validation status",
    });
    expect(
      within(statusRail).getByRole("heading", { name: "Agent activity" }),
    ).toBeVisible();
    expect(
      within(statusRail).getByRole("heading", { name: "Play checks" }),
    ).toBeVisible();

    expect(screen.getByRole("region", { name: "No actions yet" })).toBeVisible();
    for (const playerId of ["O1", "O2", "O3", "O4", "O5"]) {
      expect(screen.getByTestId(`timeline-row-${playerId}`)).toBeVisible();
    }
    expect(screen.getByText("Demo prompts")).toBeVisible();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "NextPlay" })).toBeVisible();
    expect(scenarioSummary).toHaveTextContent("SLOB · Man · 4.2 seconds · r0");
  });
});
