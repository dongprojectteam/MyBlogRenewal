import { cloneGrid, emptyGrid, type Grid9 } from "@/lib/sudoku/grid";
import type { SudokuGeneratorProfile } from "@/lib/sudoku/level-profiles";

type Rng = () => number;

export type SudokuGenerationResult = {
  puzzle: Grid9;
  solution: Grid9;
  seed: number;
  metadata: {
    givenCount: number;
    removalsDone: number;
  };
};

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function findEmpty(board: Grid9): { r: number; c: number } | null {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (board[r][c] === 0) return { r, c };
    }
  }
  return null;
}

function isSafe(board: Grid9, row: number, col: number, num: number): boolean {
  for (let x = 0; x < 9; x += 1) {
    if (board[row][x] === num || board[x][col] === num) return false;
  }

  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r += 1) {
    for (let c = bc; c < bc + 3; c += 1) {
      if (board[r][c] === num) return false;
    }
  }

  return true;
}

function fillBoard(board: Grid9, rng: Rng): boolean {
  const cell = findEmpty(board);
  if (!cell) return true;

  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
  for (const n of nums) {
    if (isSafe(board, cell.r, cell.c, n)) {
      board[cell.r][cell.c] = n;
      if (fillBoard(board, rng)) return true;
      board[cell.r][cell.c] = 0;
    }
  }

  return false;
}

function generateFullBoard(rng: Rng): Grid9 {
  const board = emptyGrid();
  fillBoard(board, rng);
  return board;
}

function countSolutions(board: Grid9): number {
  let count = 0;

  const dfs = () => {
    if (count >= 2) return;
    const cell = findEmpty(board);
    if (!cell) {
      count += 1;
      return;
    }

    for (let n = 1; n <= 9; n += 1) {
      if (isSafe(board, cell.r, cell.c, n)) {
        board[cell.r][cell.c] = n;
        dfs();
        board[cell.r][cell.c] = 0;
        if (count >= 2) return;
      }
    }
  };

  dfs();
  return count;
}

function countSolutionsClone(original: Grid9): number {
  return countSolutions(cloneGrid(original));
}

function countFilled(board: Grid9): number {
  let n = 0;
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (board[r][c] !== 0) n += 1;
    }
  }
  return n;
}

function randomFilledCell(board: Grid9, rng: Rng): [number, number] | null {
  const cells: [number, number][] = [];
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (board[r][c] !== 0) cells.push([r, c]);
    }
  }

  if (cells.length === 0) return null;
  return cells[Math.floor(rng() * cells.length)];
}

function carvePuzzle(solution: Grid9, profile: SudokuGeneratorProfile, rng: Rng) {
  const puzzle = cloneGrid(solution);
  let removalsDone = 0;
  let attemptsLeft = profile.removalAttempts;

  while (removalsDone < profile.maxRemovals && attemptsLeft > 0) {
    const cell = randomFilledCell(puzzle, rng);
    if (!cell) break;

    const [r, c] = cell;
    const saved = puzzle[r][c];
    puzzle[r][c] = 0;

    if (countSolutionsClone(puzzle) !== 1) {
      puzzle[r][c] = saved;
      attemptsLeft -= 1;
    } else {
      removalsDone += 1;
    }
  }

  return { puzzle, givenCount: countFilled(puzzle), removalsDone };
}

export function generateSudokuPuzzle(seed: number, profile: SudokuGeneratorProfile): SudokuGenerationResult {
  const rngBase = seed >>> 0;
  let lastPuzzle: Grid9 | null = null;
  let lastSolution: Grid9 | null = null;
  let lastMetadata: SudokuGenerationResult["metadata"] | null = null;

  for (let round = 0; round < profile.fullRegenerateRounds; round += 1) {
    const rng = mulberry32((rngBase + round * 977) >>> 0);
    const solution = generateFullBoard(rng);
    const carved = carvePuzzle(solution, profile, rng);

    lastPuzzle = carved.puzzle;
    lastSolution = solution;
    lastMetadata = {
      givenCount: carved.givenCount,
      removalsDone: carved.removalsDone,
    };

    if (carved.removalsDone >= profile.maxRemovals || round === profile.fullRegenerateRounds - 1) {
      break;
    }
  }

  if (!lastPuzzle || !lastSolution || !lastMetadata) {
    throw new Error("퍼즐을 만들지 못했습니다.");
  }

  return {
    puzzle: lastPuzzle,
    solution: lastSolution,
    seed: rngBase,
    metadata: lastMetadata,
  };
}
