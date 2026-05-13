import type {
  PhaseDualDirection,
  PhaseDualLinkRule,
  PhaseDualPieceColor,
} from "@/types";

export type {
  PhaseDualDirection,
  PhaseDualLinkRule,
  PhaseDualPieceColor,
} from "@/types";

export const PHASE_DUAL_COLORS: PhaseDualPieceColor[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
];

export const PHASE_DUAL_DIRECTIONS: PhaseDualDirection[] = [
  "up",
  "down",
  "left",
  "right",
];

export type PhaseDualPos = { row: number; col: number };

export type PhaseDualPieceSpec = {
  color: PhaseDualPieceColor;
  startRow: number;
  startCol: number;
  targetRow: number;
  targetCol: number;
};

export type PhaseDualWallSpec = { row: number; col: number };

export type PhaseDualGridSpec = {
  pieces: PhaseDualPieceSpec[];
  walls?: PhaseDualWallSpec[];
};

export type PhaseDualPuzzle = {
  id: string;
  tier: 1 | 2 | 3 | 4 | 5;
  title: string;
  gridSize: 5 | 6 | 7;
  linkRule: PhaseDualLinkRule;
  gridA: PhaseDualGridSpec;
  gridB: PhaseDualGridSpec;
  par: number;
  generatedSolution?: Array<{ color: PhaseDualPieceColor; dir: PhaseDualDirection }>;
};

export type PhaseDualCell = {
  pieceColor: PhaseDualPieceColor | null;
  isWall: boolean;
  targetColor: PhaseDualPieceColor | null;
};

export type PhaseDualGridState = PhaseDualCell[][];

export type PhaseDualPiecePosMap = {
  [color in PhaseDualPieceColor]?: PhaseDualPos;
} & { [key: string]: PhaseDualPos | undefined };

export type PhaseDualSession = {
  puzzle: PhaseDualPuzzle;
  gridA: PhaseDualGridState;
  gridB: PhaseDualGridState;
  posA: PhaseDualPiecePosMap;
  posB: PhaseDualPiecePosMap;
  colors: PhaseDualPieceColor[];
};

const DIR_DELTA: Record<PhaseDualDirection, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

const LINK_MAP: Record<
  PhaseDualLinkRule,
  Record<PhaseDualDirection, PhaseDualDirection>
> = {
  mirror_h: { left: "right", right: "left", up: "up", down: "down" },
  mirror_v: { left: "left", right: "right", up: "down", down: "up" },
  inverse: { left: "right", right: "left", up: "down", down: "up" },
  rotate_cw: { up: "right", right: "down", down: "left", left: "up" },
  rotate_ccw: { up: "left", left: "down", down: "right", right: "up" },
  transpose: { up: "left", left: "up", down: "right", right: "down" },
};

export function applyLinkRule(
  dir: PhaseDualDirection,
  rule: PhaseDualLinkRule,
): PhaseDualDirection {
  return LINK_MAP[rule][dir];
}

export function ruleLabel(rule: PhaseDualLinkRule): string {
  switch (rule) {
    case "mirror_h":
      return "수평 거울";
    case "mirror_v":
      return "수직 거울";
    case "inverse":
      return "역방향";
    case "rotate_cw":
      return "시계 회전";
    case "rotate_ccw":
      return "반시계 회전";
    case "transpose":
      return "전치";
  }
}

export function ruleEnglishLabel(rule: PhaseDualLinkRule): string {
  switch (rule) {
    case "mirror_h":
      return "Mirror H";
    case "mirror_v":
      return "Mirror V";
    case "inverse":
      return "Inverse";
    case "rotate_cw":
      return "Rotate CW";
    case "rotate_ccw":
      return "Rotate CCW";
    case "transpose":
      return "Transpose";
  }
}

export function ruleIconPath(rule: PhaseDualLinkRule): string {
  return `/images/utilities/phase-dual/rule-${rule.replace("_", "-")}.svg`;
}

export function buildEmptyGrid(gridSize: number): PhaseDualGridState {
  const result: PhaseDualGridState = [];
  for (let r = 0; r < gridSize; r++) {
    const row: PhaseDualCell[] = [];
    for (let c = 0; c < gridSize; c++) {
      row.push({ pieceColor: null, isWall: false, targetColor: null });
    }
    result.push(row);
  }
  return result;
}

export function buildSession(puzzle: PhaseDualPuzzle): PhaseDualSession {
  const { gridSize } = puzzle;
  const gridA = buildEmptyGrid(gridSize);
  const gridB = buildEmptyGrid(gridSize);
  const posA: PhaseDualPiecePosMap = {};
  const posB: PhaseDualPiecePosMap = {};

  for (const wall of puzzle.gridA.walls ?? []) {
    gridA[wall.row][wall.col].isWall = true;
  }
  for (const wall of puzzle.gridB.walls ?? []) {
    gridB[wall.row][wall.col].isWall = true;
  }

  const colorSet = new Set<PhaseDualPieceColor>();
  for (const p of puzzle.gridA.pieces) {
    gridA[p.startRow][p.startCol].pieceColor = p.color;
    gridA[p.targetRow][p.targetCol].targetColor = p.color;
    posA[p.color] = { row: p.startRow, col: p.startCol };
    colorSet.add(p.color);
  }
  for (const p of puzzle.gridB.pieces) {
    gridB[p.startRow][p.startCol].pieceColor = p.color;
    gridB[p.targetRow][p.targetCol].targetColor = p.color;
    posB[p.color] = { row: p.startRow, col: p.startCol };
    colorSet.add(p.color);
  }

  return {
    puzzle,
    gridA,
    gridB,
    posA,
    posB,
    colors: PHASE_DUAL_COLORS.filter((c) => colorSet.has(c)),
  };
}

export function calcSlide(
  grid: PhaseDualGridState,
  pos: PhaseDualPos,
  dir: PhaseDualDirection,
  gridSize: number,
): PhaseDualPos {
  const [dr, dc] = DIR_DELTA[dir];
  let { row, col } = pos;
  while (true) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) break;
    const cell = grid[nr][nc];
    if (cell.isWall) break;
    if (cell.pieceColor !== null) break;
    row = nr;
    col = nc;
  }
  return { row, col };
}

export type PhaseDualMoveResult = {
  valid: boolean;
  color?: PhaseDualPieceColor;
  fromA?: PhaseDualPos;
  toA?: PhaseDualPos;
  fromB?: PhaseDualPos;
  toB?: PhaseDualPos;
  dirA?: PhaseDualDirection;
  dirB?: PhaseDualDirection;
};

export function executeMove(
  session: PhaseDualSession,
  color: PhaseDualPieceColor,
  dir: PhaseDualDirection,
): PhaseDualMoveResult {
  const startA = session.posA[color];
  if (!startA) return { valid: false };

  const gridSize = session.puzzle.gridSize;
  const destA = calcSlide(session.gridA, startA, dir, gridSize);
  if (destA.row === startA.row && destA.col === startA.col) {
    return { valid: false };
  }

  const linkedDir = applyLinkRule(dir, session.puzzle.linkRule);
  const startB = session.posB[color];
  const destB = startB
    ? calcSlide(session.gridB, startB, linkedDir, gridSize)
    : undefined;

  // Apply moves
  session.gridA[startA.row][startA.col].pieceColor = null;
  session.gridA[destA.row][destA.col].pieceColor = color;
  session.posA[color] = destA;

  if (startB && destB) {
    session.gridB[startB.row][startB.col].pieceColor = null;
    session.gridB[destB.row][destB.col].pieceColor = color;
    session.posB[color] = destB;
  }

  return {
    valid: true,
    color,
    fromA: startA,
    toA: destA,
    fromB: startB,
    toB: destB,
    dirA: dir,
    dirB: linkedDir,
  };
}

export function checkClear(session: PhaseDualSession): boolean {
  for (const piece of session.puzzle.gridA.pieces) {
    const pos = session.posA[piece.color];
    if (!pos) return false;
    if (pos.row !== piece.targetRow || pos.col !== piece.targetCol) {
      return false;
    }
  }
  for (const piece of session.puzzle.gridB.pieces) {
    const pos = session.posB[piece.color];
    if (!pos) return false;
    if (pos.row !== piece.targetRow || pos.col !== piece.targetCol) {
      return false;
    }
  }
  return true;
}

export function cloneSession(session: PhaseDualSession): PhaseDualSession {
  const gridA = session.gridA.map((row) => row.map((cell) => ({ ...cell })));
  const gridB = session.gridB.map((row) => row.map((cell) => ({ ...cell })));
  const posA: PhaseDualPiecePosMap = {};
  const posB: PhaseDualPiecePosMap = {};
  for (const c of session.colors) {
    const pa = session.posA[c];
    const pb = session.posB[c];
    if (pa) posA[c] = { row: pa.row, col: pa.col };
    if (pb) posB[c] = { row: pb.row, col: pb.col };
  }
  return { puzzle: session.puzzle, gridA, gridB, posA, posB, colors: session.colors };
}

export type PhaseDualScoreBreakdown = {
  base: number;
  parBonus: number;
  timeBonus: number;
  total: number;
};

export function calcPhaseDualScore(
  par: number,
  moves: number,
  elapsedMs: number,
): PhaseDualScoreBreakdown {
  const base = 1000;
  const parBonus = Math.max(0, (par - moves) * 80);
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const timeBonus = Math.max(0, 500 - Math.floor(elapsedSeconds / 3) * 10);
  return {
    base,
    parBonus,
    timeBonus,
    total: base + parBonus + timeBonus,
  };
}
