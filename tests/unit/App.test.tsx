import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "../../src/App";

describe("App shell", () => {
  it("presents the NextPlay identity, accessible court, and honest manual state", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "NextPlay" }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "Basketball court workspace",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "The board is ready for the first play.",
      }),
    ).toBeVisible();
  });

  it("keeps Phase 2 manual controls and status honest and accessible", () => {
    render(<App />);

    expect(screen.getByTestId("webmcp-status")).toHaveTextContent(
      "Manual mode",
    );
    expect(
      screen.getByText("WebMCP tools are not registered yet."),
    ).toBeVisible();
    expect(screen.getByText("Validation has not been run yet.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reset demo" })).toBeEnabled();
  });
});
