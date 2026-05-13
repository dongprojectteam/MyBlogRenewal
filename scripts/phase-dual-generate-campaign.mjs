const COLORS = ["red", "blue", "green", "yellow", "purple", "orange"];
const DIRECTIONS = ["up", "down", "left", "right"];

const DELTA = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

const LINK = {
  mirror_h: { left: "right", right: "left", up: "up", down: "down" },
  mirror_v: { left: "left", right: "right", up: "down", down: "up" },
  inverse: { left: "right", right: "left", up: "down", down: "up" },
  rotate_cw: { up: "right", right: "down", down: "left", left: "up" },
  rotate_ccw: { up: "left", left: "down", down: "right", right: "up" },
  transpose: { up: "left", left: "up", down: "right", right: "down" },
};

const CONFIGS = [
  { slot: 1, tier: 1, rule: "mirror_h", target: 2, size: 5, pieces: 3, walls: 0, seq: 5, cap: 2_000 },
  { slot: 2, tier: 1, rule: "mirror_v", target: 3, size: 5, pieces: 3, walls: 0, seq: 6, cap: 2_000 },
  { slot: 3, tier: 1, rule: "inverse", target: 3, size: 5, pieces: 3, walls: 0, seq: 6, cap: 2_000 },
  { slot: 4, tier: 1, rule: "rotate_cw", target: 4, size: 5, pieces: 3, walls: 1, seq: 7, cap: 4_000 },
  { slot: 5, tier: 1, rule: "rotate_ccw", target: 4, size: 5, pieces: 3, walls: 1, seq: 7, cap: 4_000 },
  { slot: 6, tier: 1, rule: "transpose", target: 5, size: 5, pieces: 3, walls: 1, seq: 8, cap: 5_000 },
  { slot: 7, tier: 2, rule: "mirror_h", target: 5, size: 6, pieces: 4, walls: 1, seq: 9, cap: 40_000 },
  { slot: 8, tier: 2, rule: "mirror_v", target: 5, size: 6, pieces: 4, walls: 1, seq: 9, cap: 40_000 },
  { slot: 9, tier: 2, rule: "inverse", target: 6, size: 6, pieces: 4, walls: 1, seq: 10, cap: 50_000 },
  { slot: 10, tier: 2, rule: "rotate_cw", target: 6, size: 6, pieces: 4, walls: 2, seq: 10, cap: 60_000 },
  { slot: 11, tier: 2, rule: "rotate_ccw", target: 6, size: 6, pieces: 4, walls: 2, seq: 10, cap: 60_000 },
  { slot: 12, tier: 2, rule: "transpose", target: 7, size: 6, pieces: 4, walls: 3, seq: 11, cap: 120_000 },
  { slot: 13, tier: 3, rule: "mirror_h", target: 7, size: 6, pieces: 4, walls: 2, seq: 12, cap: 160_000 },
  { slot: 14, tier: 3, rule: "mirror_v", target: 7, size: 6, pieces: 4, walls: 2, seq: 12, cap: 160_000 },
  { slot: 15, tier: 3, rule: "inverse", target: 8, size: 6, pieces: 4, walls: 2, seq: 13, cap: 180_000 },
  { slot: 16, tier: 3, rule: "rotate_cw", target: 8, size: 6, pieces: 4, walls: 2, seq: 13, cap: 180_000 },
  { slot: 17, tier: 3, rule: "rotate_ccw", target: 8, size: 6, pieces: 4, walls: 2, seq: 13, cap: 180_000 },
  { slot: 18, tier: 3, rule: "transpose", target: 8, size: 6, pieces: 4, walls: 4, seq: 13, cap: 180_000 },
  { slot: 19, tier: 4, rule: "mirror_h", target: 8, size: 6, pieces: 5, walls: 7, seq: 14, cap: 220_000 },
  { slot: 20, tier: 4, rule: "mirror_v", target: 8, size: 6, pieces: 5, walls: 7, seq: 14, cap: 220_000 },
  { slot: 21, tier: 4, rule: "inverse", target: 9, size: 6, pieces: 5, walls: 7, seq: 15, cap: 240_000 },
  { slot: 22, tier: 4, rule: "rotate_cw", target: 9, size: 6, pieces: 5, walls: 7, seq: 15, cap: 240_000 },
  { slot: 23, tier: 4, rule: "rotate_ccw", target: 9, size: 6, pieces: 5, walls: 9, seq: 15, cap: 240_000 },
  { slot: 24, tier: 4, rule: "transpose", target: 9, size: 6, pieces: 5, walls: 10, seq: 15, cap: 260_000 },
  { slot: 25, tier: 5, rule: "mirror_h", target: 9, size: 7, pieces: 5, walls: 10, seq: 16, cap: 280_000 },
  { slot: 26, tier: 5, rule: "mirror_v", target: 9, size: 7, pieces: 5, walls: 12, seq: 16, cap: 280_000 },
  { slot: 27, tier: 5, rule: "inverse", target: 10, size: 7, pieces: 5, walls: 12, seq: 17, cap: 300_000 },
  { slot: 28, tier: 5, rule: "rotate_cw", target: 10, size: 7, pieces: 5, walls: 12, seq: 17, cap: 320_000 },
  { slot: 29, tier: 5, rule: "rotate_ccw", target: 10, size: 7, pieces: 5, walls: 13, seq: 17, cap: 320_000 },
  { slot: 30, tier: 5, rule: "transpose", target: 11, size: 7, pieces: 5, walls: 13, seq: 18, cap: 360_000 },
];

function createRandom(seed) {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(1664525, x) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

function randInt(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function shuffled(random, values) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index--) {
    const swap = randInt(random, 0, index);
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

function toIndex(row, col, size) {
  return row * size + col;
}

function fromIndex(index, size) {
  return { row: Math.floor(index / size), col: index % size };
}

function posKey(pos) {
  return `${pos.row},${pos.col}`;
}

function stateKey(posA, posB) {
  return `${posA.join(",")}~${posB.join(",")}`;
}

function slide(pos, direction, occupied, walls, size) {
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

function moveState(state, colorIndex, direction, puzzle, wallsA, wallsB) {
  const startA = state.a[colorIndex];
  const destA = slide(startA, direction, new Set(state.a), wallsA, puzzle.gridSize);
  if (destA === startA) return null;

  const startB = state.b[colorIndex];
  const destB = slide(startB, LINK[puzzle.linkRule][direction], new Set(state.b), wallsB, puzzle.gridSize);
  const next = { a: [...state.a], b: [...state.b] };
  next.a[colorIndex] = destA;
  next.b[colorIndex] = destB;
  return next;
}

function solveDepth(puzzle, maxDepth, maxStates = Number.POSITIVE_INFINITY) {
  const size = puzzle.gridSize;
  const wallsA = new Set((puzzle.wallsA ?? []).map((wall) => toIndex(wall.row, wall.col, size)));
  const wallsB = new Set((puzzle.wallsB ?? []).map((wall) => toIndex(wall.row, wall.col, size)));
  const initial = {
    a: puzzle.startA.map((pos) => toIndex(pos.row, pos.col, size)),
    b: puzzle.startB.map((pos) => toIndex(pos.row, pos.col, size)),
  };
  const target = stateKey(
    puzzle.targetA.map((pos) => toIndex(pos.row, pos.col, size)),
    puzzle.targetB.map((pos) => toIndex(pos.row, pos.col, size)),
  );

  const queue = [initial];
  const depth = [0];
  const seen = new Set([stateKey(initial.a, initial.b)]);
  let head = 0;

  while (head < queue.length) {
    const current = queue[head];
    const currentDepth = depth[head];
    head++;
    if (currentDepth >= maxDepth) continue;

    for (let colorIndex = 0; colorIndex < puzzle.colors.length; colorIndex++) {
      for (const direction of DIRECTIONS) {
        const next = moveState(current, colorIndex, direction, puzzle, wallsA, wallsB);
        if (!next) continue;
        const key = stateKey(next.a, next.b);
        if (seen.has(key)) continue;
        seen.add(key);
        if (seen.size > maxStates) {
          return { solvable: false, minMoves: -1, exploredStates: seen.size };
        }
        if (key === target) {
          return { solvable: true, minMoves: currentDepth + 1, exploredStates: seen.size };
        }
        queue.push(next);
        depth.push(currentDepth + 1);
      }
    }
  }

  return { solvable: false, minMoves: -1, exploredStates: seen.size };
}

function randomCells(random, size, count, blocked = new Set(), edgeBias = false) {
  const cells = [];
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

function makeCandidate(seed, config) {
  const random = createRandom(seed);
  const colors = COLORS.slice(0, config.pieces);
  const startA = randomCells(random, config.size, config.pieces, new Set(), true);
  const blockedA = new Set(startA.map((pos) => toIndex(pos.row, pos.col, config.size)));
  const wallsA = randomCells(random, config.size, config.walls, blockedA);
  const startB = randomCells(random, config.size, config.pieces, new Set(), true);
  const blockedB = new Set(startB.map((pos) => toIndex(pos.row, pos.col, config.size)));
  const wallsB = randomCells(random, config.size, config.walls, blockedB);
  const puzzle = { gridSize: config.size, linkRule: config.rule, colors, startA, startB, wallsA, wallsB };

  const wallsASet = new Set(wallsA.map((pos) => toIndex(pos.row, pos.col, config.size)));
  const wallsBSet = new Set(wallsB.map((pos) => toIndex(pos.row, pos.col, config.size)));
  let state = {
    a: startA.map((pos) => toIndex(pos.row, pos.col, config.size)),
    b: startB.map((pos) => toIndex(pos.row, pos.col, config.size)),
  };
  let previous = "";

  for (let step = 0; step < config.seq; step++) {
    const moves = [];
    for (let colorIndex = 0; colorIndex < config.pieces; colorIndex++) {
      for (const direction of DIRECTIONS) {
        const next = moveState(state, colorIndex, direction, puzzle, wallsASet, wallsBSet);
        if (!next) continue;
        const key = stateKey(next.a, next.b);
        if (key !== previous) moves.push(next);
      }
    }
    if (moves.length === 0) break;
    previous = stateKey(state.a, state.b);
    state = moves[randInt(random, 0, moves.length - 1)];
  }

  return {
    ...puzzle,
    targetA: state.a.map((index) => fromIndex(index, config.size)),
    targetB: state.b.map((index) => fromIndex(index, config.size)),
  };
}

function unsolvedPieces(puzzle) {
  let count = 0;
  for (let index = 0; index < puzzle.colors.length; index++) {
    if (posKey(puzzle.startA[index]) !== posKey(puzzle.targetA[index])) count++;
    else if (posKey(puzzle.startB[index]) !== posKey(puzzle.targetB[index])) count++;
  }
  return count;
}

function findPuzzle(config, attempts = 10_000) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const seed = 4_000_000 + config.slot * 110_000 + attempt;
    const puzzle = makeCandidate(seed, config);
    if (unsolvedPieces(puzzle) < Math.max(2, Math.floor(config.pieces * 0.7))) continue;
    const result = solveDepth(puzzle, config.target, config.cap);
    if (result.solvable && result.minMoves === config.target && result.exploredStates <= config.cap) {
      return { config, puzzle, result, seed };
    }
  }
  throw new Error(`No candidate for campaign-${String(config.slot).padStart(2, "0")}`);
}

const slotArg = process.argv[2];
const configs = slotArg
  ? CONFIGS.filter((config) => String(config.slot) === slotArg)
  : CONFIGS;

const generated = configs.map((config) => {
  const found = findPuzzle(config);
  const id = `campaign-${String(config.slot).padStart(2, "0")}`;
  console.error(`${id}: ${config.rule}, par ${config.target}, states ${found.result.exploredStates}, seed ${found.seed}`);
  return {
    id,
    tier: config.tier,
    title: `Campaign ${String(config.slot).padStart(2, "0")}`,
    gridSize: config.size,
    linkRule: config.rule,
    par: config.target,
    exploredStates: found.result.exploredStates,
    seed: found.seed,
    startA: found.puzzle.startA,
    targetA: found.puzzle.targetA,
    wallsA: found.puzzle.wallsA,
    startB: found.puzzle.startB,
    targetB: found.puzzle.targetB,
    wallsB: found.puzzle.wallsB,
  };
});

console.log(JSON.stringify(generated, null, 2));
