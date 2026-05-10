export type Grid9 = number[][];

export function emptyGrid(): Grid9 {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 0));
}

export function cloneGrid(grid: Grid9): Grid9 {
  return grid.map((row) => row.slice());
}

export function gridToString(grid: Grid9): string {
  return grid.map((row) => row.map((c) => String(c)).join("")).join("");
}

export function gridFromString(flat: string): Grid9 {
  if (flat.length !== 81) throw new Error("퍼즐 문자열은 81자여야 합니다.");
  const g = emptyGrid();
  for (let i = 0; i < 81; i += 1) {
    const ch = flat[i];
    if (!/[0-9]/.test(ch)) throw new Error("퍼즐은 0-9만 허용됩니다.");
    g[Math.floor(i / 9)][i % 9] = Number(ch);
  }
  return g;
}

export function maskFromString(flat: string): boolean[][] {
  if (flat.length !== 81) throw new Error("마스크 문자열은 81자여야 합니다.");
  return Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => flat[r * 9 + c] === "1"),
  );
}

export function maskToString(mask: boolean[][]): string {
  return mask.map((row) => row.map((v) => (v ? "1" : "0")).join("")).join("");
}

/** Initial givens: cells that were non-zero in the published puzzle. */
export function buildGivenMask(puzzle: Grid9): boolean[][] {
  return puzzle.map((row) => row.map((v) => v !== 0));
}

/** Force given cells to match puzzle. */
export function applyGivens(player: Grid9, puzzle: Grid9, givenMask: boolean[][]): void {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (givenMask[r][c]) player[r][c] = puzzle[r][c];
    }
  }
}

/**
 * Cells that participate in any row/col/box conflict (same digit appears twice).
 * Only non-zero cells are considered for duplicates.
 */
export function computeConflictCells(grid: Grid9): Set<string> {
  const bad = new Set<string>();

  const markDuplicates = (cells: [number, number][]) => {
    const map = new Map<number, [number, number][]>();
    for (const [r, c] of cells) {
      const v = grid[r][c];
      if (v === 0) continue;
      const list = map.get(v) ?? [];
      list.push([r, c]);
      map.set(v, list);
    }
    for (const list of map.values()) {
      if (list.length > 1) {
        for (const [r, c] of list) bad.add(`${r}:${c}`);
      }
    }
  };

  for (let r = 0; r < 9; r += 1) {
    markDuplicates(Array.from({ length: 9 }, (_, c) => [r, c] as [number, number]));
  }
  for (let c = 0; c < 9; c += 1) {
    markDuplicates(Array.from({ length: 9 }, (_, r) => [r, c] as [number, number]));
  }
  for (let br = 0; br < 3; br += 1) {
    for (let bc = 0; bc < 3; bc += 1) {
      const cells: [number, number][] = [];
      for (let r = br * 3; r < br * 3 + 3; r += 1) {
        for (let c = bc * 3; c < bc * 3 + 3; c += 1) {
          cells.push([r, c]);
        }
      }
      markDuplicates(cells);
    }
  }

  return bad;
}

export function countClues(grid: Grid9): number {
  let n = 0;
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (grid[r][c] !== 0) n += 1;
    }
  }
  return n;
}

export function isComplete(grid: Grid9): boolean {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (grid[r][c] === 0) return false;
    }
  }
  return true;
}
