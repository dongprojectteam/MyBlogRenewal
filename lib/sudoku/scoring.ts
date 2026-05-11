import type { SudokuLevelId } from "@/types";

export type SudokuScoreBreakdown = {
  emptyCells: number;
  elapsedSeconds: number;
  baseScore: number;
  timePenalty: number;
  mistakePenalty: number;
  finalScore: number;
};

export function countEmptyCells(givenMask: boolean[][]): number {
  return givenMask.flat().filter((v) => !v).length;
}

function timePenaltyPerSecond(levelId: SudokuLevelId): number {
  if (levelId <= 3) return 12;
  if (levelId <= 7) return 18;
  return 25;
}

export function computeSudokuScoreBreakdown(
  levelId: SudokuLevelId,
  timeMs: number,
  givenMask: boolean[][],
  mistakeCount: number,
): SudokuScoreBreakdown {
  const emptyCells = countEmptyCells(givenMask);
  const elapsedSeconds = Math.max(0, Math.ceil(timeMs / 1000));
  const safeMistakes = Math.max(0, Math.trunc(mistakeCount));
  const baseScore = 10000 + levelId * 1500 + emptyCells * 250;
  const timePenalty = elapsedSeconds * timePenaltyPerSecond(levelId);
  const mistakePenalty = safeMistakes * 300;
  const finalScore = Math.max(100, Math.round(baseScore - timePenalty - mistakePenalty));

  return {
    emptyCells,
    elapsedSeconds,
    baseScore,
    timePenalty,
    mistakePenalty,
    finalScore,
  };
}

export function computeSudokuScore(
  levelId: SudokuLevelId,
  timeMs: number,
  givenMask: boolean[][],
  mistakeCount: number,
): number {
  return computeSudokuScoreBreakdown(levelId, timeMs, givenMask, mistakeCount).finalScore;
}
