import { applyGivens, cloneGrid, computeConflictCells, gridFromString, isComplete, maskFromString, type Grid9 } from "@/lib/sudoku/grid";
import { isSudokuLevelId } from "@/lib/sudoku/level-profiles";

const MAX_TIME_MS = 3_600_000;

/** Full grid: every row/col/box has 1–9 exactly once. */
export function isValidSolvedSudoku(grid: Grid9): boolean {
  if (!isComplete(grid)) return false;
  return computeConflictCells(grid).size === 0;
}

export type SudokuSubmitPayload = {
  playerName: string;
  levelId: number;
  timeMs: number;
  seed: number;
  puzzle: string;
  playerGrid: string;
  givenMask: string;
};

export function parseSudokuSubmission(payload: SudokuSubmitPayload) {
  const levelId = Number(payload.levelId);
  if (!isSudokuLevelId(levelId)) {
    throw new Error("레벨은 1에서 10 사이여야 합니다.");
  }

  const timeMs = Math.trunc(Number(payload.timeMs));
  if (!Number.isFinite(timeMs) || timeMs < 0 || timeMs > MAX_TIME_MS) {
    throw new Error("클리어 시간이 올바르지 않습니다.");
  }

  const seed = Math.trunc(Number(payload.seed));
  if (!Number.isFinite(seed) || seed < 0 || seed > 2_147_483_647) {
    throw new Error("시드 값이 올바르지 않습니다.");
  }

  const puzzle = gridFromString(String(payload.puzzle));
  const playerGrid = gridFromString(String(payload.playerGrid));
  const givenMask = maskFromString(String(payload.givenMask));

  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (givenMask[r][c] && puzzle[r][c] === 0) {
        throw new Error("고정 칸 마스크와 퍼즐이 일치하지 않습니다.");
      }
    }
  }

  const merged = cloneGrid(playerGrid);
  applyGivens(merged, puzzle, givenMask);
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (merged[r][c] !== playerGrid[r][c]) {
        throw new Error("고정 칸이 변경되었습니다.");
      }
    }
  }

  if (!isValidSolvedSudoku(merged)) {
    throw new Error("완성된 유효한 스도쿠 판이 아닙니다.");
  }

  return { levelId, timeMs, seed, puzzle, playerGrid: merged };
}
