import { describe, expect, it } from "vitest";

import {
  applyLinkRule,
  buildSession,
  calcPhaseDualScore,
  calcSlide,
  checkClear,
  executeMove,
  type PhaseDualLinkRule,
  type PhaseDualPuzzle,
} from "./engine";

const simplePuzzle: PhaseDualPuzzle = {
  id: "test-simple",
  tier: 1,
  title: "Simple",
  gridSize: 5,
  linkRule: "mirror_h",
  par: 3,
  gridA: {
    pieces: [
      { color: "red", startRow: 0, startCol: 0, targetRow: 0, targetCol: 4 },
      { color: "green", startRow: 2, startCol: 0, targetRow: 2, targetCol: 4 },
      { color: "blue", startRow: 4, startCol: 0, targetRow: 4, targetCol: 4 },
    ],
  },
  gridB: {
    pieces: [
      { color: "red", startRow: 0, startCol: 4, targetRow: 0, targetCol: 0 },
      { color: "green", startRow: 2, startCol: 4, targetRow: 2, targetCol: 0 },
      { color: "blue", startRow: 4, startCol: 4, targetRow: 4, targetCol: 0 },
    ],
  },
};

const wallPuzzle: PhaseDualPuzzle = {
  ...simplePuzzle,
  id: "test-wall",
  gridA: {
    pieces: [
      { color: "red", startRow: 0, startCol: 0, targetRow: 0, targetCol: 2 },
      { color: "green", startRow: 2, startCol: 0, targetRow: 2, targetCol: 2 },
      { color: "blue", startRow: 4, startCol: 0, targetRow: 4, targetCol: 2 },
    ],
    walls: [
      { row: 0, col: 3 },
      { row: 2, col: 3 },
      { row: 4, col: 3 },
    ],
  },
};

const expectedDirections: Record<PhaseDualLinkRule, Record<string, string>> = {
  mirror_h: { left: "right", right: "left", up: "up", down: "down" },
  mirror_v: { left: "left", right: "right", up: "down", down: "up" },
  inverse: { left: "right", right: "left", up: "down", down: "up" },
  rotate_cw: { up: "right", right: "down", down: "left", left: "up" },
  rotate_ccw: { up: "left", left: "down", down: "right", right: "up" },
  transpose: { up: "left", left: "up", down: "right", right: "down" },
};

describe("phase dual engine", () => {
  it("maps all six link rules across all directions", () => {
    for (const [rule, map] of Object.entries(expectedDirections) as Array<[PhaseDualLinkRule, Record<string, string>]>) {
      for (const [input, output] of Object.entries(map)) {
        expect(applyLinkRule(input as never, rule)).toBe(output);
      }
    }
  });

  it("slides until a wall, edge, or another piece blocks movement", () => {
    const session = buildSession(wallPuzzle);

    expect(calcSlide(session.gridA, { row: 0, col: 0 }, "right", 5)).toEqual({ row: 0, col: 2 });
    expect(calcSlide(session.gridA, { row: 0, col: 2 }, "right", 5)).toEqual({ row: 0, col: 2 });
    expect(calcSlide(session.gridA, { row: 0, col: 2 }, "left", 5)).toEqual({ row: 0, col: 1 });
  });

  it("treats a zero-distance Grid A slide as invalid", () => {
    const session = buildSession(simplePuzzle);
    const result = executeMove(session, "red", "left");

    expect(result.valid).toBe(false);
    expect(session.posA.red).toEqual({ row: 0, col: 0 });
    expect(session.posB.red).toEqual({ row: 0, col: 4 });
  });

  it("moves Grid A and linked Grid B pieces together", () => {
    const session = buildSession(simplePuzzle);
    const result = executeMove(session, "red", "right");

    expect(result.valid).toBe(true);
    expect(result.dirB).toBe("left");
    expect(session.posA.red).toEqual({ row: 0, col: 4 });
    expect(session.posB.red).toEqual({ row: 0, col: 0 });
  });

  it("checks clear state and scores completed puzzles", () => {
    const session = buildSession(simplePuzzle);
    executeMove(session, "red", "right");
    executeMove(session, "green", "right");
    executeMove(session, "blue", "right");

    expect(checkClear(session)).toBe(true);
    expect(calcPhaseDualScore(3, 3, 2_900)).toEqual({
      base: 1000,
      parBonus: 0,
      timeBonus: 500,
      total: 1500,
    });
  });
});
