import { describe, expect, it } from "vitest";

import { CAMPAIGN_PUZZLES, getDailyPuzzleByDate, getPuzzle } from "./puzzles";
import { phaseDualPuzzleSignature, validatePhaseDualPuzzleSet } from "./puzzle-quality";
import { buildSession, checkClear, executeMove, type PhaseDualPuzzle } from "./engine";
import { solvePuzzle } from "./solver";

function replayGeneratedSolution(puzzle: PhaseDualPuzzle) {
  const session = buildSession(puzzle);
  for (const move of puzzle.generatedSolution ?? []) {
    executeMove(session, move.color, move.dir);
  }
  return checkClear(session);
}

describe("phase dual puzzle data", () => {
  it("contains the generated campaign pool", () => {
    expect(CAMPAIGN_PUZZLES).toHaveLength(30);
  });

  it("builds a unique campaign with nondecreasing generated difficulty", () => {
    expect(CAMPAIGN_PUZZLES.map((puzzle) => puzzle.par)).toEqual([
      2, 3, 3, 4, 4, 5,
      5, 5, 6, 6, 6, 7,
      7, 7, 8, 8, 8, 8,
      8, 8, 9, 9, 9, 9,
      9, 9, 10, 10, 10, 11,
    ]);

    const signatures = CAMPAIGN_PUZZLES.map(phaseDualPuzzleSignature);
    expect(new Set(signatures).size).toBe(CAMPAIGN_PUZZLES.length);
    expect(validatePhaseDualPuzzleSet(CAMPAIGN_PUZZLES)).toEqual({ valid: true, issues: [] });
  });

  it("generates deterministic high-difficulty daily puzzles from the UTC date", () => {
    const first = getDailyPuzzleByDate(new Date(Date.UTC(2026, 4, 12)));
    const same = getDailyPuzzleByDate(new Date(Date.UTC(2026, 4, 12, 23, 59)));
    const next = getDailyPuzzleByDate(new Date(Date.UTC(2026, 4, 13)));

    expect(first.id).toBe("daily-2026-05-12");
    expect(first.gridSize).toBe(7);
    expect(first.tier).toBe(5);
    expect(first.gridA.pieces).toHaveLength(5);
    expect(first.par).toBeGreaterThanOrEqual(10);
    expect(replayGeneratedSolution(first)).toBe(true);
    expect(replayGeneratedSolution(next)).toBe(true);
    expect(phaseDualPuzzleSignature(same)).toBe(phaseDualPuzzleSignature(first));
    expect(phaseDualPuzzleSignature(next)).not.toBe(phaseDualPuzzleSignature(first));
    expect(getPuzzle(first.id)?.id).toBe(first.id);
  });

  it("keeps sampled daily puzzles solvable at their declared par", () => {
    const dates = [
      new Date(Date.UTC(2026, 4, 13)),
      new Date(Date.UTC(2026, 4, 14)),
      new Date(Date.UTC(2026, 4, 18)),
      new Date(Date.UTC(2026, 4, 20)),
    ];

    for (const date of dates) {
      const puzzle = getDailyPuzzleByDate(date);
      const result = solvePuzzle(puzzle, { maxStates: 500_000 });
      expect(puzzle.par, puzzle.id).toBeGreaterThanOrEqual(10);
      expect(result, puzzle.id).toMatchObject({ solvable: true, minMoves: puzzle.par });
    }
  }, 60_000);

  it("keeps every campaign puzzle solvable at its declared par", () => {
    for (const puzzle of CAMPAIGN_PUZZLES) {
      const result = solvePuzzle(puzzle, { maxStates: 400_000 });
      expect(result, puzzle.id).toMatchObject({ solvable: true, minMoves: puzzle.par });
    }
  }, 60_000);
});
