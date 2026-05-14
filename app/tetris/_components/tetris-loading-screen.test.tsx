import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { TetrisLoadingScreen } from "./tetris-loading-screen";

describe("TetrisLoadingScreen", () => {
  it("renders the loading state", () => {
    render(createElement(TetrisLoadingScreen, { status: "loading", error: "" }));

    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(screen.getByText("Tetris Arena")).toBeInTheDocument();
    expect(screen.getByText("게임 리소스를 준비하고 있습니다.")).toBeInTheDocument();
  });

  it("renders the error state", () => {
    render(createElement(TetrisLoadingScreen, { status: "error", error: "audio failed" }));

    expect(screen.getByText("Asset Error")).toBeInTheDocument();
    expect(screen.getByText("audio failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
