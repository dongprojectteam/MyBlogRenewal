import {
  BOARD_WIDTH,
  VISIBLE_HEIGHT,
  VISIBLE_TOP,
  getGhostCells,
  getPieceCells,
  type GameState,
  type PieceKind,
} from "tetris-toolkit";

import type { RenderCell } from "../_types";

export function getFilledRowCount(board: GameState["board"]) {
  return board.reduce((count, row) => (row.every((cell) => cell !== null) ? count + 1 : count), 0);
}

export function buildVisibleCells(state: GameState): RenderCell[] {
  const activeCells = new Map<string, PieceKind>();
  const ghostCells = new Map<string, PieceKind>();
  const clearingRows = new Set(state.phase.kind === "lineClearAnim" ? state.phase.rows : []);

  if (state.active) {
    getPieceCells(state.active.kind, state.active.rotation, state.active.x, state.active.y).forEach(([x, y]) => {
      activeCells.set(`${x}:${y}`, state.active?.kind ?? "I");
    });

    getGhostCells(state).forEach(([x, y]) => {
      ghostCells.set(`${x}:${y}`, state.active?.kind ?? "I");
    });
  }

  const cells: RenderCell[] = [];

  for (let y = VISIBLE_TOP; y < VISIBLE_TOP + VISIBLE_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const key = `${x}:${y}`;
      const boardKind = state.board[y]?.[x] ?? null;
      const ghostKind = ghostCells.get(key) ?? null;
      const activeKind = activeCells.get(key) ?? null;

      if (activeKind) {
        cells.push({ kind: activeKind, status: "active", clearing: clearingRows.has(y) });
      } else if (!boardKind && ghostKind) {
        cells.push({ kind: ghostKind, status: "ghost", clearing: false });
      } else if (boardKind) {
        cells.push({ kind: boardKind, status: "filled", clearing: clearingRows.has(y) });
      } else {
        cells.push({ kind: null, status: "empty", clearing: false });
      }
    }
  }

  return cells;
}
