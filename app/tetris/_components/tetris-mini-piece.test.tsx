import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { MiniPiece } from "./tetris-mini-piece";

function getActiveIndexes(container: HTMLElement) {
  const allCells = Array.from(container.querySelectorAll(".tetris-mini-piece-board .tetris-cell"));
  return allCells
    .map((cell, index) => (cell.classList.contains("is-active") ? index : null))
    .filter((index): index is number => index !== null);
}

describe("MiniPiece", () => {
  it("renders the piece with the same active cell classes used by the board", () => {
    const { container } = render(createElement(MiniPiece, { kind: "T", label: "Next piece" }));

    expect(screen.getByLabelText("Next piece")).toBeInTheDocument();
    expect(container.querySelectorAll(".tetris-mini-piece-board .tetris-cell")).toHaveLength(16);
    expect(container.querySelectorAll(".tetris-mini-piece-board .tetris-cell.is-active")).toHaveLength(4);
    expect(getActiveIndexes(container)).toEqual([5, 8, 9, 10]);

    const activeCells = Array.from(container.querySelectorAll(".tetris-mini-piece-board .tetris-cell.is-active"));
    expect(activeCells.map((cell) => cell.getAttribute("data-kind"))).toEqual(["t", "t", "t", "t"]);
    expect(activeCells.map((cell) => cell.getAttribute("style"))).toEqual([
      "--piece-color: #c084fc;",
      "--piece-color: #c084fc;",
      "--piece-color: #c084fc;",
      "--piece-color: #c084fc;",
    ]);
  });

  it("centers square pieces in the 4 by 4 preview grid", () => {
    const { container } = render(createElement(MiniPiece, { kind: "O", label: "Held piece" }));

    expect(getActiveIndexes(container)).toEqual([5, 6, 9, 10]);
  });

  it("keeps the four-wide I piece centered vertically", () => {
    const { container } = render(createElement(MiniPiece, { kind: "I", label: "Next piece" }));

    expect(getActiveIndexes(container)).toEqual([4, 5, 6, 7]);
  });
});
