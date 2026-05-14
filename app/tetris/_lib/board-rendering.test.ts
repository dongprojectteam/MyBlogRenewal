import { describe, expect, it } from "vitest";
import { createEngine, type GameState } from "tetris-toolkit";

import { buildVisibleCells, getFilledRowCount } from "./board-rendering";

describe("tetris board rendering helpers", () => {
  it("counts filled rows for drop versus break sound selection", () => {
    const board = [
      Array.from({ length: 10 }, () => "I"),
      ["I", null, "I", null, "I", null, "I", null, "I", null],
      Array.from({ length: 10 }, () => "O"),
    ] as GameState["board"];

    expect(getFilledRowCount(board)).toBe(2);
  });

  it("builds the fixed 10x20 visible cell list", () => {
    const state = createEngine({ seed: 1 }).getSnapshot();
    const cells = buildVisibleCells(state);

    expect(cells).toHaveLength(200);
    expect(cells.every((cell) => cell.status === "empty")).toBe(true);
  });
});
