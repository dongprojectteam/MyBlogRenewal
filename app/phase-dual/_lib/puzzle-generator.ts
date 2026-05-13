import type {
  PhaseDualGridSpec,
  PhaseDualLinkRule,
  PhaseDualPieceColor,
  PhaseDualPuzzle,
} from "./engine";

const COLORS: PhaseDualPieceColor[] = ["red", "blue", "green", "yellow", "purple", "orange"];
const DIRECTIONS = ["up", "down", "left", "right"] as const;

const DELTA = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
} as const;

const LINK: Record<PhaseDualLinkRule, Record<(typeof DIRECTIONS)[number], (typeof DIRECTIONS)[number]>> = {
  mirror_h: { left: "right", right: "left", up: "up", down: "down" },
  mirror_v: { left: "left", right: "right", up: "down", down: "up" },
  inverse: { left: "right", right: "left", up: "down", down: "up" },
  rotate_cw: { up: "right", right: "down", down: "left", left: "up" },
  rotate_ccw: { up: "left", left: "down", down: "right", right: "up" },
  transpose: { up: "left", left: "up", down: "right", right: "down" },
};

type GeneratedPos = { row: number; col: number };
type GeneratedPuzzle = {
  gridSize: 5 | 6 | 7;
  linkRule: PhaseDualLinkRule;
  colors: PhaseDualPieceColor[];
  startA: GeneratedPos[];
  startB: GeneratedPos[];
  targetA: GeneratedPos[];
  targetB: GeneratedPos[];
  wallsA: GeneratedPos[];
  wallsB: GeneratedPos[];
  solution: Array<{ color: PhaseDualPieceColor; dir: keyof typeof DELTA }>;
};

type CampaignConfig = {
  slot: number;
  tier: 1 | 2 | 3 | 4 | 5;
  title: string;
  rule: PhaseDualLinkRule;
  target: number;
  size: 5 | 6 | 7;
  pieces: 3 | 4 | 5;
  walls: number;
  seq: number;
  seed: number;
};

const CAMPAIGN_CONFIGS: CampaignConfig[] = [
  { slot: 1, tier: 1, title: "First Reflection", rule: "mirror_h", target: 2, size: 5, pieces: 3, walls: 0, seq: 5, seed: 4_110_207 },
  { slot: 2, tier: 1, title: "Vertical Shift", rule: "mirror_v", target: 3, size: 5, pieces: 3, walls: 0, seq: 6, seed: 4_220_002 },
  { slot: 3, tier: 1, title: "Inverted Corner", rule: "inverse", target: 3, size: 5, pieces: 3, walls: 0, seq: 6, seed: 4_330_017 },
  { slot: 4, tier: 1, title: "Clockwise Gate", rule: "rotate_cw", target: 4, size: 5, pieces: 3, walls: 1, seq: 7, seed: 4_440_006 },
  { slot: 5, tier: 1, title: "Counter Gate", rule: "rotate_ccw", target: 4, size: 5, pieces: 3, walls: 1, seq: 7, seed: 4_550_002 },
  { slot: 6, tier: 1, title: "Axis Swap", rule: "transpose", target: 5, size: 5, pieces: 3, walls: 1, seq: 8, seed: 4_660_001 },
  { slot: 7, tier: 2, title: "Left Corridor", rule: "mirror_h", target: 5, size: 6, pieces: 4, walls: 1, seq: 9, seed: 4_770_013 },
  { slot: 8, tier: 2, title: "North Corridor", rule: "mirror_v", target: 5, size: 6, pieces: 4, walls: 1, seq: 9, seed: 4_880_002 },
  { slot: 9, tier: 2, title: "Opposite Anchor", rule: "inverse", target: 6, size: 6, pieces: 4, walls: 1, seq: 10, seed: 4_990_012 },
  { slot: 10, tier: 2, title: "Clock Relay", rule: "rotate_cw", target: 6, size: 6, pieces: 4, walls: 2, seq: 10, seed: 5_100_016 },
  { slot: 11, tier: 2, title: "Counter Relay", rule: "rotate_ccw", target: 6, size: 6, pieces: 4, walls: 2, seq: 10, seed: 5_210_000 },
  { slot: 12, tier: 2, title: "Crossed Relay", rule: "transpose", target: 7, size: 6, pieces: 4, walls: 3, seq: 11, seed: 5_320_001 },
  { slot: 13, tier: 3, title: "Mirror Locks", rule: "mirror_h", target: 7, size: 6, pieces: 4, walls: 2, seq: 12, seed: 5_430_004 },
  { slot: 14, tier: 3, title: "Vertical Locks", rule: "mirror_v", target: 7, size: 6, pieces: 4, walls: 2, seq: 12, seed: 5_540_001 },
  { slot: 15, tier: 3, title: "Inversion Stack", rule: "inverse", target: 8, size: 6, pieces: 4, walls: 2, seq: 13, seed: 5_650_003 },
  { slot: 16, tier: 3, title: "Clock Stack", rule: "rotate_cw", target: 8, size: 6, pieces: 4, walls: 2, seq: 13, seed: 5_760_003 },
  { slot: 17, tier: 3, title: "Counter Stack", rule: "rotate_ccw", target: 8, size: 6, pieces: 4, walls: 2, seq: 13, seed: 5_870_020 },
  { slot: 18, tier: 3, title: "Transposed Locks", rule: "transpose", target: 8, size: 6, pieces: 4, walls: 4, seq: 13, seed: 5_980_008 },
  { slot: 19, tier: 4, title: "Narrow Mirror", rule: "mirror_h", target: 8, size: 6, pieces: 5, walls: 7, seq: 14, seed: 6_090_002 },
  { slot: 20, tier: 4, title: "Narrow Vertical", rule: "mirror_v", target: 8, size: 6, pieces: 5, walls: 7, seq: 14, seed: 6_200_007 },
  { slot: 21, tier: 4, title: "Dense Inverse", rule: "inverse", target: 9, size: 6, pieces: 5, walls: 7, seq: 15, seed: 6_310_012 },
  { slot: 22, tier: 4, title: "Dense Clock", rule: "rotate_cw", target: 9, size: 6, pieces: 5, walls: 7, seq: 15, seed: 6_420_016 },
  { slot: 23, tier: 4, title: "Dense Counter", rule: "rotate_ccw", target: 9, size: 6, pieces: 5, walls: 9, seq: 15, seed: 6_530_003 },
  { slot: 24, tier: 4, title: "Dense Transpose", rule: "transpose", target: 9, size: 6, pieces: 5, walls: 10, seq: 15, seed: 6_640_009 },
  { slot: 25, tier: 5, title: "Outer Mirror", rule: "mirror_h", target: 9, size: 7, pieces: 5, walls: 10, seq: 16, seed: 6_750_016 },
  { slot: 26, tier: 5, title: "Outer Vertical", rule: "mirror_v", target: 9, size: 7, pieces: 5, walls: 12, seq: 16, seed: 6_860_000 },
  { slot: 27, tier: 5, title: "Outer Inverse", rule: "inverse", target: 10, size: 7, pieces: 5, walls: 12, seq: 17, seed: 6_970_063 },
  { slot: 28, tier: 5, title: "Outer Clock", rule: "rotate_cw", target: 10, size: 7, pieces: 5, walls: 12, seq: 17, seed: 7_080_023 },
  { slot: 29, tier: 5, title: "Outer Counter", rule: "rotate_ccw", target: 10, size: 7, pieces: 5, walls: 13, seq: 17, seed: 7_190_032 },
  { slot: 30, tier: 5, title: "Final Transpose", rule: "transpose", target: 11, size: 7, pieces: 5, walls: 13, seq: 18, seed: 7_300_027 },
];

const DAILY_RULES: PhaseDualLinkRule[] = ["mirror_h", "mirror_v", "inverse", "rotate_cw", "rotate_ccw", "transpose"];
const DAILY_TEMPLATE_CONFIGS = CAMPAIGN_CONFIGS.filter((config) => config.target >= 10);
const DAILY_TRANSFORMS = ["identity", "rotate_cw", "rotate_180", "rotate_ccw", "mirror_h", "mirror_v", "transpose", "anti_transpose"] as const;
const dailyPuzzleCache = new Map<string, PhaseDualPuzzle>();

type DailyTransform = (typeof DAILY_TRANSFORMS)[number];

function createRandom(seed: number) {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(1664525, x) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

function randInt(random: () => number, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function shuffled<T>(random: () => number, values: readonly T[]) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index--) {
    const swap = randInt(random, 0, index);
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

function toIndex(row: number, col: number, size: number) {
  return row * size + col;
}

function fromIndex(index: number, size: number): GeneratedPos {
  return { row: Math.floor(index / size), col: index % size };
}

function stateKey(posA: number[], posB: number[]) {
  return `${posA.join(",")}~${posB.join(",")}`;
}

function slide(pos: number, direction: keyof typeof DELTA, occupied: Set<number>, walls: Set<number>, size: number) {
  const [dr, dc] = DELTA[direction];
  let row = Math.floor(pos / size);
  let col = pos % size;

  while (true) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
    const next = toIndex(nr, nc, size);
    if (walls.has(next) || occupied.has(next)) break;
    row = nr;
    col = nc;
  }

  return toIndex(row, col, size);
}

function moveState(
  state: { a: number[]; b: number[] },
  colorIndex: number,
  direction: keyof typeof DELTA,
  puzzle: Pick<GeneratedPuzzle, "gridSize" | "linkRule">,
  wallsA: Set<number>,
  wallsB: Set<number>,
) {
  const startA = state.a[colorIndex];
  const destA = slide(startA, direction, new Set(state.a), wallsA, puzzle.gridSize);
  if (destA === startA) return null;

  const linked = LINK[puzzle.linkRule][direction];
  const startB = state.b[colorIndex];
  const destB = slide(startB, linked, new Set(state.b), wallsB, puzzle.gridSize);
  const next = { a: [...state.a], b: [...state.b] };
  next.a[colorIndex] = destA;
  next.b[colorIndex] = destB;
  return next;
}

function randomCells(
  random: () => number,
  size: number,
  count: number,
  blocked = new Set<number>(),
  edgeBias = false,
) {
  const cells: number[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const edge = row === 0 || col === 0 || row === size - 1 || col === size - 1;
      if (edgeBias && !edge && random() < 0.35) continue;
      const index = toIndex(row, col, size);
      if (!blocked.has(index)) cells.push(index);
    }
  }
  return shuffled(random, cells).slice(0, count).map((index) => fromIndex(index, size));
}

function makeCandidate(config: CampaignConfig): GeneratedPuzzle {
  const random = createRandom(config.seed);
  const colors = COLORS.slice(0, config.pieces);
  const startA = randomCells(random, config.size, config.pieces, new Set(), true);
  const blockedA = new Set(startA.map((pos) => toIndex(pos.row, pos.col, config.size)));
  const wallsA = randomCells(random, config.size, config.walls, blockedA);
  const startB = randomCells(random, config.size, config.pieces, new Set(), true);
  const blockedB = new Set(startB.map((pos) => toIndex(pos.row, pos.col, config.size)));
  const wallsB = randomCells(random, config.size, config.walls, blockedB);
  const puzzle = { gridSize: config.size, linkRule: config.rule, colors, startA, startB, wallsA, wallsB };
  const wallSetA = new Set(wallsA.map((pos) => toIndex(pos.row, pos.col, config.size)));
  const wallSetB = new Set(wallsB.map((pos) => toIndex(pos.row, pos.col, config.size)));
  let state = {
    a: startA.map((pos) => toIndex(pos.row, pos.col, config.size)),
    b: startB.map((pos) => toIndex(pos.row, pos.col, config.size)),
  };
  let previous = "";
  const solution: GeneratedPuzzle["solution"] = [];

  for (let step = 0; step < config.seq; step++) {
    const moves = [];
    for (let colorIndex = 0; colorIndex < config.pieces; colorIndex++) {
      for (const direction of DIRECTIONS) {
        const next = moveState(state, colorIndex, direction, puzzle, wallSetA, wallSetB);
        if (!next) continue;
        const key = stateKey(next.a, next.b);
        if (key !== previous) moves.push({ next, colorIndex, direction });
      }
    }
    if (moves.length === 0) break;
    const picked = moves[randInt(random, 0, moves.length - 1)];
    previous = stateKey(state.a, state.b);
    state = picked.next;
    solution.push({ color: colors[picked.colorIndex], dir: picked.direction });
  }

  return {
    ...puzzle,
    targetA: state.a.map((index) => fromIndex(index, config.size)),
    targetB: state.b.map((index) => fromIndex(index, config.size)),
    solution,
  };
}

function buildGridSpec(colors: PhaseDualPieceColor[], starts: GeneratedPos[], targets: GeneratedPos[], walls: GeneratedPos[]): PhaseDualGridSpec {
  return {
    pieces: colors.map((color, index) => ({
      color,
      startRow: starts[index].row,
      startCol: starts[index].col,
      targetRow: targets[index].row,
      targetCol: targets[index].col,
    })),
    walls,
  };
}

function buildPuzzleFromGenerated(
  generated: GeneratedPuzzle,
  meta: { id: string; tier: 1 | 2 | 3 | 4 | 5; title: string; par: number },
): PhaseDualPuzzle {
  return {
    id: meta.id,
    tier: meta.tier,
    title: meta.title,
    gridSize: generated.gridSize,
    linkRule: generated.linkRule,
    par: meta.par,
    gridA: buildGridSpec(generated.colors, generated.startA, generated.targetA, generated.wallsA),
    gridB: buildGridSpec(generated.colors, generated.startB, generated.targetB, generated.wallsB),
    generatedSolution: generated.solution,
  };
}

const TRANSFORM_DIRECTIONS: Record<DailyTransform, Record<keyof typeof DELTA, keyof typeof DELTA>> = {
  identity: { up: "up", down: "down", left: "left", right: "right" },
  rotate_cw: { up: "right", right: "down", down: "left", left: "up" },
  rotate_180: { up: "down", down: "up", left: "right", right: "left" },
  rotate_ccw: { up: "left", left: "down", down: "right", right: "up" },
  mirror_h: { left: "right", right: "left", up: "up", down: "down" },
  mirror_v: { left: "left", right: "right", up: "down", down: "up" },
  transpose: { up: "left", left: "up", down: "right", right: "down" },
  anti_transpose: { up: "right", right: "up", down: "left", left: "down" },
};

function invertDirectionMap(map: Record<keyof typeof DELTA, keyof typeof DELTA>) {
  const inverted = {} as Record<keyof typeof DELTA, keyof typeof DELTA>;
  for (const direction of DIRECTIONS) {
    inverted[map[direction]] = direction;
  }
  return inverted;
}

function findMatchingLinkRule(map: Record<keyof typeof DELTA, keyof typeof DELTA>) {
  return DAILY_RULES.find((rule) => DIRECTIONS.every((direction) => LINK[rule][direction] === map[direction]));
}

function transformLinkRule(rule: PhaseDualLinkRule, transform: DailyTransform) {
  const map = TRANSFORM_DIRECTIONS[transform];
  const inverse = invertDirectionMap(map);
  const transformed = {} as Record<keyof typeof DELTA, keyof typeof DELTA>;
  for (const direction of DIRECTIONS) {
    transformed[direction] = map[LINK[rule][inverse[direction]]];
  }
  return findMatchingLinkRule(transformed);
}

function transformPos(pos: GeneratedPos, size: number, transform: DailyTransform): GeneratedPos {
  switch (transform) {
    case "rotate_cw":
      return { row: pos.col, col: size - 1 - pos.row };
    case "rotate_180":
      return { row: size - 1 - pos.row, col: size - 1 - pos.col };
    case "rotate_ccw":
      return { row: size - 1 - pos.col, col: pos.row };
    case "mirror_h":
      return { row: pos.row, col: size - 1 - pos.col };
    case "mirror_v":
      return { row: size - 1 - pos.row, col: pos.col };
    case "transpose":
      return { row: pos.col, col: pos.row };
    case "anti_transpose":
      return { row: size - 1 - pos.col, col: size - 1 - pos.row };
    case "identity":
      return pos;
  }
}

function renameColor(color: PhaseDualPieceColor, colorMap: Map<PhaseDualPieceColor, PhaseDualPieceColor>) {
  return colorMap.get(color) ?? color;
}

function transformDailyTemplate(
  puzzle: PhaseDualPuzzle,
  dailyKey: string,
  transform: DailyTransform,
  colorMap: Map<PhaseDualPieceColor, PhaseDualPieceColor>,
  linkRule: PhaseDualLinkRule,
): PhaseDualPuzzle {
  const transformPieces = (grid: PhaseDualGridSpec): PhaseDualGridSpec => ({
    pieces: grid.pieces.map((piece) => {
      const start = transformPos({ row: piece.startRow, col: piece.startCol }, puzzle.gridSize, transform);
      const target = transformPos({ row: piece.targetRow, col: piece.targetCol }, puzzle.gridSize, transform);
      return {
        color: renameColor(piece.color, colorMap),
        startRow: start.row,
        startCol: start.col,
        targetRow: target.row,
        targetCol: target.col,
      };
    }),
    walls: grid.walls?.map((wall) => transformPos(wall, puzzle.gridSize, transform)),
  });

  return {
    ...puzzle,
    id: `daily-${dailyKey}`,
    title: `Daily ${dailyKey}`,
    linkRule,
    gridA: transformPieces(puzzle.gridA),
    gridB: transformPieces(puzzle.gridB),
    generatedSolution: puzzle.generatedSolution?.map((move) => ({
      color: renameColor(move.color, colorMap),
      dir: TRANSFORM_DIRECTIONS[transform][move.dir],
    })),
  };
}

function hashDailyKey(dailyKey: string) {
  let hash = 2166136261;
  for (let index = 0; index < dailyKey.length; index++) {
    hash ^= dailyKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

export function generatePhaseDualCampaignPuzzles(): PhaseDualPuzzle[] {
  return CAMPAIGN_CONFIGS.map((config) => {
    const generated = makeCandidate(config);
    return buildPuzzleFromGenerated(generated, {
      id: `campaign-${String(config.slot).padStart(2, "0")}`,
      tier: config.tier,
      title: config.title,
      par: config.target,
    });
  });
}

export function generatePhaseDualDailyPuzzle(dailyKey: string): PhaseDualPuzzle {
  const cached = dailyPuzzleCache.get(dailyKey);
  if (cached) return cached;

  const random = createRandom(hashDailyKey(dailyKey));
  const config = DAILY_TEMPLATE_CONFIGS[randInt(random, 0, DAILY_TEMPLATE_CONFIGS.length - 1)];
  const generated = makeCandidate(config);
  const template = buildPuzzleFromGenerated(generated, {
    id: `campaign-${String(config.slot).padStart(2, "0")}`,
    tier: config.tier,
    title: config.title,
    par: config.target,
  });
  const transform = shuffled(random, DAILY_TRANSFORMS).find((item) => transformLinkRule(config.rule, item)) ?? "identity";
  const linkRule = transformLinkRule(config.rule, transform) ?? config.rule;
  const shuffledColors = shuffled(random, COLORS.slice(0, config.pieces));
  const colorMap = new Map<PhaseDualPieceColor, PhaseDualPieceColor>();
  for (let index = 0; index < config.pieces; index++) {
    colorMap.set(COLORS[index], shuffledColors[index]);
  }
  const puzzle = transformDailyTemplate(template, dailyKey, transform, colorMap, linkRule);
  dailyPuzzleCache.set(dailyKey, puzzle);
  return puzzle;
}
