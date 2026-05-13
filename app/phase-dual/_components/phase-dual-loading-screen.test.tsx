import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { PhaseDualLoadingScreen } from "./phase-dual-loading-screen";

describe("PhaseDualLoadingScreen", () => {
  it("renders the loading state", () => {
    render(createElement(PhaseDualLoadingScreen, { status: "loading", error: "" }));

    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(screen.getByText("Phase Dual")).toBeInTheDocument();
  });

  it("renders the error state", () => {
    render(createElement(PhaseDualLoadingScreen, { status: "error", error: "audio failed" }));

    expect(screen.getByText("Asset Error")).toBeInTheDocument();
    expect(screen.getByText("audio failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
