/* eslint-disable no-restricted-globals */
/**
 * Sudoku generator Web Worker. Kept in plain JS for reliable loading from /public.
 * Profile shape: { maxRemovals, removalAttempts, fullRegenerateRounds }
 */
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyBoard() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 0));
}

function cloneBoard(b) {
  return b.map((row) => row.slice());
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function findEmpty(board) {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (board[r][c] === 0) return { r, c };
    }
  }
  return null;
}

function isSafe(board, row, col, num) {
  for (let x = 0; x < 9; x += 1) {
    if (board[row][x] === num) return false;
  }
  for (let x = 0; x < 9; x += 1) {
    if (board[x][col] === num) return false;
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

function fillBoard(board, rng) {
  const cell = findEmpty(board);
  if (!cell) return true;
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
  for (let i = 0; i < nums.length; i += 1) {
    const n = nums[i];
    if (isSafe(board, cell.r, cell.c, n)) {
      board[cell.r][cell.c] = n;
      if (fillBoard(board, rng)) return true;
      board[cell.r][cell.c] = 0;
    }
  }
  return false;
}

function generateFullBoard(rng) {
  const board = emptyBoard();
  fillBoard(board, rng);
  return board;
}

function countSolutions(board) {
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

function countSolutionsClone(original) {
  const b = cloneBoard(original);
  return countSolutions(b);
}

function countFilled(board) {
  let n = 0;
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (board[r][c] !== 0) n += 1;
    }
  }
  return n;
}

function randomFilledCell(board, rng) {
  const cells = [];
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (board[r][c] !== 0) cells.push([r, c]);
    }
  }
  if (cells.length === 0) return null;
  return cells[Math.floor(rng() * cells.length)];
}

function carvePuzzle(solution, profile, rng, id, reportProgress) {
  const puzzle = cloneBoard(solution);
  let removalsDone = 0;
  let attemptsLeft = profile.removalAttempts;
  const totalSteps = profile.maxRemovals + Math.min(profile.removalAttempts, 200);
  let step = 0;

  while (removalsDone < profile.maxRemovals && attemptsLeft > 0) {
    const cell = randomFilledCell(puzzle, rng);
    if (!cell) break;
    const [r, c] = cell;
    const saved = puzzle[r][c];
    puzzle[r][c] = 0;
    const sols = countSolutionsClone(puzzle);
    if (sols !== 1) {
      puzzle[r][c] = saved;
      attemptsLeft -= 1;
    } else {
      removalsDone += 1;
    }
    step += 1;
    const local = 0.35 + 0.6 * Math.min(1, step / Math.max(1, totalSteps));
    reportProgress(local);
  }

  return { puzzle, givenCount: countFilled(puzzle), removalsDone };
}

function boardToMessage(grid) {
  return grid.map((row) => row.slice());
}

self.onmessage = (e) => {
  const msg = e.data;
  if (!msg || msg.kind !== "generate") return;

  const { id, seed, profile } = msg;
  const started = Date.now();

  const reportProgress = (ratio, label) => {
    self.postMessage({
      kind: "progress",
      id,
      ratio: Math.max(0, Math.min(1, ratio)),
      label: label ?? "",
    });
  };

  try {
    if (!profile || typeof profile.maxRemovals !== "number") {
      throw new Error("Invalid generator profile");
    }

    const rngBase = typeof seed === "number" && seed >= 0 ? seed : Math.floor(Date.now() % 2147483647);
    let lastPuzzle = null;
    let lastSolution = null;

    for (let round = 0; round < profile.fullRegenerateRounds; round += 1) {
      const rng = mulberry32((rngBase + round * 977) >>> 0);
      reportProgress(0.05 + round * 0.02, "정답 판 생성 중");
      const solution = generateFullBoard(rng);
      reportProgress(0.3, "퍼즐 다듬는 중");

      const carved = carvePuzzle(solution, profile, rng, id, reportProgress);
      lastPuzzle = carved.puzzle;
      lastSolution = solution;

      if (carved.removalsDone >= Math.min(profile.maxRemovals, 1) || round === profile.fullRegenerateRounds - 1) {
        break;
      }
    }

    if (!lastPuzzle || !lastSolution) {
      throw new Error("퍼즐을 만들지 못했습니다.");
    }

    reportProgress(1, "완료");

    self.postMessage({
      kind: "success",
      id,
      puzzle: boardToMessage(lastPuzzle),
      solution: boardToMessage(lastSolution),
      seed: rngBase,
      metadata: {
        givenCount: countFilled(lastPuzzle),
        durationMs: Date.now() - started,
      },
    });
  } catch (err) {
    self.postMessage({
      kind: "error",
      id,
      message: err instanceof Error ? err.message : "알 수 없는 오류",
    });
  }
};
