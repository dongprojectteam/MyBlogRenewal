import {
  applyLinkRule,
  PHASE_DUAL_DIRECTIONS,
  PHASE_DUAL_COLORS,
  type PhaseDualPieceColor,
  type PhaseDualDirection,
  type PhaseDualPuzzle,
} from "./engine";

type StateKey = string;
type SolverState = { a: number[]; b: number[] };

function toIndex(row: number, col: number, size: number) {
  return row * size + col;
}

function encodeState(state: SolverState): StateKey {
  return `${state.a.join(",")}~${state.b.join(",")}`;
}

function containsCell(cells: number[], cell: number) {
  for (const value of cells) {
    if (value === cell) return true;
  }
  return false;
}

function slideIndex(
  pos: number,
  dir: PhaseDualDirection,
  occupied: number[],
  walls: boolean[],
  size: number,
) {
  let row = Math.floor(pos / size);
  let col = pos % size;

  while (true) {
    const nextRow = dir === "up" ? row - 1 : dir === "down" ? row + 1 : row;
    const nextCol = dir === "left" ? col - 1 : dir === "right" ? col + 1 : col;
    if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) break;
    const next = toIndex(nextRow, nextCol, size);
    if (walls[next] || containsCell(occupied, next)) break;
    row = nextRow;
    col = nextCol;
  }

  return toIndex(row, col, size);
}

function makeWalls(puzzle: PhaseDualPuzzle, grid: "gridA" | "gridB") {
  const walls = Array.from({ length: puzzle.gridSize * puzzle.gridSize }, () => false);
  for (const wall of puzzle[grid].walls ?? []) {
    walls[toIndex(wall.row, wall.col, puzzle.gridSize)] = true;
  }
  return walls;
}

function makeSolverModel(puzzle: PhaseDualPuzzle) {
  const colorSet = new Set<PhaseDualPieceColor>();
  for (const piece of puzzle.gridA.pieces) colorSet.add(piece.color);
  for (const piece of puzzle.gridB.pieces) colorSet.add(piece.color);
  const colors = PHASE_DUAL_COLORS.filter((color) => colorSet.has(color));

  const start: SolverState = { a: [], b: [] };
  const target: SolverState = { a: [], b: [] };
  for (const color of colors) {
    const pieceA = puzzle.gridA.pieces.find((piece) => piece.color === color);
    const pieceB = puzzle.gridB.pieces.find((piece) => piece.color === color);
    start.a.push(pieceA ? toIndex(pieceA.startRow, pieceA.startCol, puzzle.gridSize) : -1);
    start.b.push(pieceB ? toIndex(pieceB.startRow, pieceB.startCol, puzzle.gridSize) : -1);
    target.a.push(pieceA ? toIndex(pieceA.targetRow, pieceA.targetCol, puzzle.gridSize) : -1);
    target.b.push(pieceB ? toIndex(pieceB.targetRow, pieceB.targetCol, puzzle.gridSize) : -1);
  }

  return {
    colors,
    start,
    targetKey: encodeState(target),
    wallsA: makeWalls(puzzle, "gridA"),
    wallsB: makeWalls(puzzle, "gridB"),
  };
}

function trySimulate(
  state: SolverState,
  colorIndex: number,
  dir: PhaseDualDirection,
  puzzle: PhaseDualPuzzle,
  wallsA: boolean[],
  wallsB: boolean[],
): SolverState | null {
  const startA = state.a[colorIndex];
  if (startA < 0) return null;
  const destA = slideIndex(startA, dir, state.a, wallsA, puzzle.gridSize);
  if (destA === startA) return null;

  const linkedDir = applyLinkRule(dir, puzzle.linkRule);
  const startB = state.b[colorIndex];
  const destB = startB >= 0 ? slideIndex(startB, linkedDir, state.b, wallsB, puzzle.gridSize) : -1;
  const next = { a: [...state.a], b: [...state.b] };
  next.a[colorIndex] = destA;
  next.b[colorIndex] = destB;
  return next;
}

export type PhaseDualSolverResult = {
  solvable: boolean;
  minMoves: number;
  exploredStates: number;
  solution?: Array<{ color: PhaseDualPieceColor; dir: PhaseDualDirection }>;
};

export function solvePuzzle(
  puzzle: PhaseDualPuzzle,
  options: { maxStates?: number; maxDepth?: number; recordSolution?: boolean } = {},
): PhaseDualSolverResult {
  const maxStates = options.maxStates ?? 200_000;
  const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY;
  const recordSolution = options.recordSolution ?? false;
  const { colors, start, targetKey, wallsA, wallsB } = makeSolverModel(puzzle);
  const initKey = encodeState(start);

  if (initKey === targetKey) {
    return { solvable: true, minMoves: 0, exploredStates: 1, solution: [] };
  }

  const queue: SolverState[] = [start];
  const depth: number[] = [0];
  const visited = new Map<StateKey, number>();
  visited.set(initKey, -1); // -1 = root
  const parents = recordSolution
    ? new Map<StateKey, { parent: StateKey; color: PhaseDualPieceColor; dir: PhaseDualDirection }>()
    : null;

  let head = 0;
  while (head < queue.length && visited.size < maxStates) {
    const state = queue[head];
    const d = depth[head];
    head++;
    const currentKey = encodeState(state);

    if (currentKey === targetKey) {
      let solution: Array<{ color: PhaseDualPieceColor; dir: PhaseDualDirection }> | undefined;
      if (recordSolution && parents) {
        solution = [];
        let k = currentKey;
        while (k !== initKey) {
          const p = parents.get(k);
          if (!p) break;
          solution.unshift({ color: p.color, dir: p.dir });
          k = p.parent;
        }
      }
      return { solvable: true, minMoves: d, exploredStates: visited.size, solution };
    }

    if (d >= maxDepth) continue;

    for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
      for (const dir of PHASE_DUAL_DIRECTIONS) {
        const next = trySimulate(state, colorIndex, dir, puzzle, wallsA, wallsB);
        if (!next) continue;
        const nextKey = encodeState(next);
        if (visited.has(nextKey)) continue;
        visited.set(nextKey, d + 1);
        if (parents) parents.set(nextKey, { parent: currentKey, color: colors[colorIndex], dir });
        queue.push(next);
        depth.push(d + 1);
        if (nextKey === targetKey) {
          let solution: Array<{ color: PhaseDualPieceColor; dir: PhaseDualDirection }> | undefined;
          if (recordSolution && parents) {
            solution = [];
            let k = nextKey;
            while (k !== initKey) {
              const p = parents.get(k);
              if (!p) break;
              solution.unshift({ color: p.color, dir: p.dir });
              k = p.parent;
            }
          }
          return { solvable: true, minMoves: d + 1, exploredStates: visited.size, solution };
        }
        if (visited.size >= maxStates) break;
      }
      if (visited.size >= maxStates) break;
    }
  }

  return { solvable: false, minMoves: -1, exploredStates: visited.size };
}
