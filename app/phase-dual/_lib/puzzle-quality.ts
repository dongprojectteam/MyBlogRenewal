import type { PhaseDualPuzzle } from "./engine";
import { solvePuzzle, type PhaseDualSolverResult } from "./solver";

export type PhaseDualDifficultyBand = "intro" | "easy" | "medium" | "hard" | "expert";

export type PhaseDualPuzzleAnalysis = {
  puzzleId: string;
  solvable: boolean;
  minMoves: number;
  exploredStates: number;
  difficultyScore: number;
  difficultyBand: PhaseDualDifficultyBand;
  issues: string[];
  solution?: PhaseDualSolverResult["solution"];
};

function coord(row: number, col: number) {
  return `${row},${col}`;
}

export function phaseDualPuzzleSignature(puzzle: PhaseDualPuzzle): string {
  const parts = [
    puzzle.gridSize,
    puzzle.linkRule,
    `a:${puzzle.gridA.pieces
      .map((piece) => `${piece.color}:${coord(piece.startRow, piece.startCol)}>${coord(piece.targetRow, piece.targetCol)}`)
      .join("|")}`,
    `b:${puzzle.gridB.pieces
      .map((piece) => `${piece.color}:${coord(piece.startRow, piece.startCol)}>${coord(piece.targetRow, piece.targetCol)}`)
      .join("|")}`,
    `wa:${(puzzle.gridA.walls ?? []).map((wall) => coord(wall.row, wall.col)).sort().join("|")}`,
    `wb:${(puzzle.gridB.walls ?? []).map((wall) => coord(wall.row, wall.col)).sort().join("|")}`,
  ];
  return parts.join(";");
}

export function ratePhaseDualDifficulty(puzzle: PhaseDualPuzzle, minMoves: number, exploredStates: number): PhaseDualPuzzleAnalysis["difficultyBand"] {
  const wallCount = (puzzle.gridA.walls?.length ?? 0) + (puzzle.gridB.walls?.length ?? 0);
  const score = minMoves * 10 + puzzle.gridA.pieces.length * 3 + wallCount + Math.log10(Math.max(1, exploredStates)) * 6;
  if (score < 45) return "intro";
  if (score < 70) return "easy";
  if (score < 95) return "medium";
  if (score < 120) return "hard";
  return "expert";
}

export function analyzePhaseDualPuzzle(
  puzzle: PhaseDualPuzzle,
  options: { maxStates?: number; recordSolution?: boolean } = {},
): PhaseDualPuzzleAnalysis {
  const result = solvePuzzle(puzzle, {
    maxStates: options.maxStates ?? 400_000,
    recordSolution: options.recordSolution,
  });
  const issues: string[] = [];

  if (!result.solvable) {
    issues.push("Puzzle is not solvable within the configured state limit.");
  } else if (result.minMoves !== puzzle.par) {
    issues.push(`Declared par ${puzzle.par} does not match BFS minimum ${result.minMoves}.`);
  }

  const wallCount = (puzzle.gridA.walls?.length ?? 0) + (puzzle.gridB.walls?.length ?? 0);
  const difficultyScore = result.solvable
    ? result.minMoves * 10 + puzzle.gridA.pieces.length * 3 + wallCount + Math.log10(Math.max(1, result.exploredStates)) * 6
    : Number.POSITIVE_INFINITY;

  return {
    puzzleId: puzzle.id,
    solvable: result.solvable,
    minMoves: result.minMoves,
    exploredStates: result.exploredStates,
    difficultyScore,
    difficultyBand: result.solvable ? ratePhaseDualDifficulty(puzzle, result.minMoves, result.exploredStates) : "expert",
    issues,
    solution: result.solution,
  };
}

export function validatePhaseDualPuzzleSet(puzzles: PhaseDualPuzzle[]) {
  const signatures = new Set<string>();
  const issues: string[] = [];

  for (const puzzle of puzzles) {
    const signature = phaseDualPuzzleSignature(puzzle);
    if (signatures.has(signature)) {
      issues.push(`${puzzle.id} duplicates another puzzle layout.`);
    }
    signatures.add(signature);
  }

  for (let index = 1; index < puzzles.length; index++) {
    if (puzzles[index].par < puzzles[index - 1].par) {
      issues.push(`${puzzles[index].id} drops par below the previous campaign puzzle.`);
    }
  }

  return { valid: issues.length === 0, issues };
}
