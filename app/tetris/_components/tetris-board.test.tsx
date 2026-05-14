import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { BOARD_WIDTH, VISIBLE_HEIGHT } from "tetris-toolkit";
import { describe, expect, it, vi } from "vitest";

import { INITIAL_STATE } from "../_lib/engine";
import { Board } from "./tetris-board";

describe("Board", () => {
  it("renders the visible board and wires the ready start action", () => {
    const onStart = vi.fn();
    const { container } = render(
      createElement(Board, {
        state: INITIAL_STATE,
        mode: "marathon",
        hasStarted: false,
        displayedTimeMs: 0,
        playerName: "Player",
        personalBest: null,
        saveStatus: "",
        isSaving: false,
        hasSubmitted: false,
        onStart,
        onPlayAgain: vi.fn(),
        onPlayerNameChange: vi.fn(),
        onSubmitScore: vi.fn(),
      }),
    );

    expect(screen.getByLabelText("Tetris board")).toBeInTheDocument();
    expect(container.querySelectorAll(".tetris-cell")).toHaveLength(BOARD_WIDTH * VISIBLE_HEIGHT);

    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    expect(onStart).toHaveBeenCalledOnce();
  });
});
