import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "../../src/App";

describe("App foundation", () => {
  it("presents the NextPlay identity and court workspace", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "NextPlay" }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "Basketball court workspace placeholder",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "The board is ready for the first play.",
      }),
    ).toBeVisible();
  });

  it("keeps unavailable Phase 0 controls honest and accessible", () => {
    render(<App />);

    expect(screen.getByTestId("webmcp-status")).toHaveTextContent(
      "Manual mode",
    );
    expect(
      screen.getByText("WebMCP tools are not registered yet."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Reset demo" })).toBeDisabled();
  });
});
