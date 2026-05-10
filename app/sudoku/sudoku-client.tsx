"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  applyGivens,
  buildGivenMask,
  cloneGrid,
  computeConflictCells,
  emptyGrid,
  gridToString,
  isComplete,
  type Grid9,
} from "@/lib/sudoku/grid";
import { getSudokuGeneratorProfile, getSudokuLevelConfig, SUDOKU_LEVEL_IDS } from "@/lib/sudoku/level-profiles";
import type { SudokuLevelId, SudokuScore } from "@/types";

type ScreenPhase = "idle" | "generating" | "ready" | "playing" | "paused" | "completed";

let sudokuInitialGenerationStarted = false;

type WorkerGenerateMessage = {
  kind: "generate";
  id: number;
  seed?: number;
  profile: ReturnType<typeof getSudokuGeneratorProfile>;
};

type LocalBest = {
  timeMs: number;
  createdAt: string;
};

const PLAYER_NAME_KEY = "dopt-sudoku-player-name";
const BEST_KEY = "dopt-sudoku-best-v1";
const DEFAULT_PLAYER_NAME = "DOPT";

function randomSeed() {
  return Math.floor(Math.random() * 2_147_483_647);
}

function formatTime(ms: number) {
  const safeMs = Math.max(0, Math.trunc(ms));
  const minutes = Math.floor(safeMs / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1000);
  const centiseconds = Math.floor((safeMs % 1000) / 10);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function isFormTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, button"));
}

function readLocalBestMap(): Record<string, LocalBest> {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LocalBest>) : {};
  } catch {
    return {};
  }
}

function writeLocalBest(levelId: SudokuLevelId, best: LocalBest) {
  const map = readLocalBestMap();
  map[String(levelId)] = best;
  window.localStorage.setItem(BEST_KEY, JSON.stringify(map));
}

type CanvasTheme = {
  bg: string;
  panel: string;
  text: string;
  muted: string;
  border: string;
  borderStrong: string;
  accent: string;
  danger: string;
  success: string;
  font: string;
};

function readTheme(el: HTMLElement): CanvasTheme {
  const s = getComputedStyle(el);
  return {
    bg: s.getPropertyValue("--bg").trim() || "#0b1120",
    panel: s.getPropertyValue("--panel").trim() || "rgba(15,23,42,0.86)",
    text: s.getPropertyValue("--text").trim() || "#e5eef8",
    muted: s.getPropertyValue("--muted").trim() || "#94a3b8",
    border: s.getPropertyValue("--border").trim() || "rgba(148,163,184,0.18)",
    borderStrong: s.getPropertyValue("--border-strong").trim() || "rgba(148,163,184,0.28)",
    accent: s.getPropertyValue("--accent").trim() || "#7dd3fc",
    danger: s.getPropertyValue("--danger").trim() || "#fca5a5",
    success: s.getPropertyValue("--success").trim() || "#86efac",
    font: s.fontFamily || "Segoe UI, sans-serif",
  };
}

type Layout = {
  dpr: number;
  cssW: number;
  cssH: number;
  boardX: number;
  boardY: number;
  boardSize: number;
  padY: number;
  padH: number;
  cellPad: number;
  keyW: number;
  keyH: number;
  keyGap: number;
};

function measureLayout(cssW: number, cssH: number, dpr: number): Layout {
  const pad = 12;
  const numpadMinH = 88;
  const maxBoard = 620;
  const boardSize = Math.max(
    220,
    Math.min(cssW - pad * 2, maxBoard, cssH - pad * 2 - numpadMinH),
  );
  const boardX = (cssW - boardSize) / 2;
  const boardY = pad;
  const padY = boardY + boardSize + 8;
  const padH = Math.max(numpadMinH, cssH - padY - pad);
  const cellPad = 6;
  const keysAreaW = cssW - pad * 2;
  const keyGap = 5;
  const keyW = (keysAreaW - keyGap * 2) / 3;
  const keyH = Math.min(34, Math.max(26, (padH - keyGap * 4) / 4));
  return { dpr, cssW, cssH, boardX, boardY, boardSize, padY, padH, cellPad, keyW, keyH, keyGap };
}

function hitTest(
  lx: number,
  ly: number,
  layout: Layout,
): { type: "cell"; row: number; col: number } | { type: "num"; n: number } | { type: "clear" } | null {
  const { boardX, boardY, boardSize, padY, padH, keyW, keyH, keyGap } = layout;
  if (lx >= boardX && ly >= boardY && lx <= boardX + boardSize && ly <= boardY + boardSize) {
    const u = (lx - boardX) / boardSize;
    const v = (ly - boardY) / boardSize;
    const col = Math.min(8, Math.max(0, Math.floor(u * 9)));
    const row = Math.min(8, Math.max(0, Math.floor(v * 9)));
    return { type: "cell", row, col };
  }
  if (ly >= padY && ly <= padY + padH) {
    const px = layout.boardX;
    const py0 = padY + keyGap;
    for (let n = 1; n <= 9; n += 1) {
      const i = n - 1;
      const r = Math.floor(i / 3);
      const c = i % 3;
      const x0 = px + c * (keyW + keyGap);
      const y0 = py0 + r * (keyH + keyGap);
      if (lx >= x0 && lx <= x0 + keyW && ly >= y0 && ly <= y0 + keyH) return { type: "num", n };
    }
    const clearY = py0 + 3 * (keyH + keyGap) + keyGap;
    if (lx >= px && lx <= px + keyW * 3 + keyGap * 2 && ly >= clearY && ly <= clearY + keyH) {
      return { type: "clear" };
    }
  }
  return null;
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  theme: CanvasTheme,
  puzzle: Grid9 | null,
  playerGrid: Grid9,
  givenMask: boolean[][] | null,
  selected: { row: number; col: number } | null,
  conflicts: Set<string>,
  phase: ScreenPhase,
) {
  const { cssW, cssH, boardX, boardY, boardSize, padY, padH, cellPad, keyW, keyH, keyGap } = layout;
  ctx.clearRect(0, 0, cssW, cssH);

  ctx.fillStyle = theme.panel.includes("rgba") ? "rgba(15,23,42,0.55)" : theme.bg;
  ctx.fillRect(0, 0, cssW, cssH);

  if (!puzzle || !givenMask) {
    ctx.fillStyle = theme.muted;
    ctx.font = `16px ${theme.font}`;
    ctx.textAlign = "center";
    ctx.fillText("레벨을 고른 뒤 퍼즐을 생성하세요.", cssW / 2, cssH / 2);
    return;
  }

  const cell = boardSize / 9;

  const roundPad = (x: number, y: number, w: number, h: number, rad: number) => {
    const rr = Math.min(rad, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  };

  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const x = boardX + c * cell;
      const y = boardY + r * cell;
      const g = givenMask[r][c];
      ctx.fillStyle = g ? "rgba(148,163,184,0.08)" : "rgba(2,6,23,0.15)";
      ctx.fillRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
    }
  }

  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const key = `${r}:${c}`;
      if (!conflicts.has(key)) continue;
      const x = boardX + c * cell;
      const y = boardY + r * cell;
      ctx.fillStyle = "rgba(252,165,165,0.2)";
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    }
  }

  if (selected) {
    const { row, col } = selected;
    const x = boardX + col * cell;
    const y = boardY + row * cell;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x + cellPad * 0.35, y + cellPad * 0.35, cell - cellPad * 0.7, cell - cellPad * 0.7);
  }

  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 9; i += 1) {
    const thick = i % 3 === 0;
    ctx.lineWidth = thick ? 2.2 : 1;
    ctx.strokeStyle = thick ? theme.borderStrong : theme.border;
    const p = boardX + i * cell;
    ctx.beginPath();
    ctx.moveTo(p, boardY);
    ctx.lineTo(p, boardY + boardSize);
    ctx.stroke();
    const q = boardY + i * cell;
    ctx.beginPath();
    ctx.moveTo(boardX, q);
    ctx.lineTo(boardX + boardSize, q);
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const v = playerGrid[r][c];
      if (v === 0) continue;
      const x = boardX + c * cell + cell / 2;
      const y = boardY + r * cell + cell / 2;
      const g = givenMask[r][c];
      ctx.fillStyle = g ? theme.muted : theme.text;
      ctx.font = `${g ? 600 : 500} ${Math.floor(cell * 0.52)}px ${theme.font}`;
      ctx.fillText(String(v), x, y);
    }
  }

  const px = layout.boardX;
  const py0 = padY + keyGap;
  ctx.font = `600 14px ${theme.font}`;
  for (let n = 1; n <= 9; n += 1) {
    const i = n - 1;
    const r = Math.floor(i / 3);
    const c = i % 3;
    const x0 = px + c * (keyW + keyGap);
    const y0 = py0 + r * (keyH + keyGap);
    ctx.fillStyle = "rgba(2,6,23,0.35)";
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1;
    roundPad(x0, y0, keyW, keyH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(n), x0 + keyW / 2, y0 + keyH / 2);
  }

  const clearY = py0 + 3 * (keyH + keyGap) + keyGap;
  ctx.fillStyle = "rgba(2,6,23,0.35)";
  ctx.strokeStyle = theme.border;
  roundPad(px, clearY, keyW * 3 + keyGap * 2, keyH, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.muted;
  ctx.fillText("지우기", px + (keyW * 3 + keyGap * 2) / 2, clearY + keyH / 2);

  if (phase === "paused" || phase === "generating") {
    ctx.fillStyle = "rgba(2,6,23,0.55)";
    ctx.fillRect(boardX, boardY, boardSize, boardSize);
    ctx.fillStyle = theme.text;
    ctx.font = `600 18px ${theme.font}`;
    ctx.textAlign = "center";
    ctx.fillText(phase === "paused" ? "일시정지" : "생성 중…", boardX + boardSize / 2, boardY + boardSize / 2);
  }
}

export function SudokuClient() {
  const [levelId, setLevelId] = useState<SudokuLevelId>(1);
  const [phase, setPhase] = useState<ScreenPhase>("idle");
  const [puzzle, setPuzzle] = useState<Grid9 | null>(null);
  const [playerGrid, setPlayerGrid] = useState<Grid9>(() => emptyGrid());
  const [givenMask, setGivenMask] = useState<boolean[][] | null>(null);
  const [seed, setSeed] = useState(0);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>({ row: 0, col: 0 });
  const genSeqRef = useRef(0);
  const bumpGenSeq = useCallback(() => {
    genSeqRef.current += 1;
    return genSeqRef.current;
  }, []);
  const [genProgress, setGenProgress] = useState(0);
  const [genLabel, setGenLabel] = useState("");
  const [genError, setGenError] = useState("");
  const [displayedMs, setDisplayedMs] = useState(0);
  const [scores, setScores] = useState<SudokuScore[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [playerName, setPlayerName] = useState(DEFAULT_PLAYER_NAME);
  const [saveStatus, setSaveStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [liveRegion, setLiveRegion] = useState("");

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  const themeRef = useRef<CanvasTheme | null>(null);
  const phaseRef = useRef<ScreenPhase>("idle");
  const playStartRef = useRef(0);
  const frozenMsRef = useRef(0);
  const selectedRef = useRef<{ row: number; col: number } | null>({ row: 0, col: 0 });

  const levelConfig = useMemo(() => getSudokuLevelConfig(levelId), [levelId]);

  const conflicts = useMemo(() => computeConflictCells(playerGrid), [playerGrid]);

  const loadScores = useCallback(async (targetLevel: SudokuLevelId) => {
    setIsLoadingScores(true);
    setLeaderboardError("");
    try {
      const response = await fetch(`/api/sudoku/scores?level=${targetLevel}`, { cache: "no-store" });
      const data = (await response.json()) as { scores?: SudokuScore[]; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "리더보드를 불러오지 못했습니다.");
      }
      setScores(data.scores ?? []);
    } catch (error) {
      setScores([]);
      setLeaderboardError(error instanceof Error ? error.message : "리더보드를 불러오지 못했습니다.");
    } finally {
      setIsLoadingScores(false);
    }
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(PLAYER_NAME_KEY);
    if (saved) setPlayerName(saved);
  }, []);

  useEffect(() => {
    loadScores(levelId);
  }, [levelId, loadScores]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") {
      setDisplayedMs(frozenMsRef.current);
      return;
    }
    let id = 0;
    const tick = () => {
      setDisplayedMs(frozenMsRef.current + (performance.now() - playStartRef.current));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [phase]);

  const resizeCanvas = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const rect = wrap.getBoundingClientRect();
    const cssW = Math.max(280, rect.width);
    const pad = 12;
    const numpadBlock = 100;
    const maxBoard = 620;
    const boardByW = Math.min(cssW - pad * 2, maxBoard);
    const cssH = Math.max(320, Math.min(680, boardByW + numpadBlock + pad * 2 + 16));
    const layout = measureLayout(cssW, cssH, dpr);
    layoutRef.current = layout;
    themeRef.current = readTheme(wrap);

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(() => resizeCanvas());
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", resizeCanvas);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [resizeCanvas]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const layout = layoutRef.current;
    const theme = themeRef.current;
    if (!canvas || !layout || !theme) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawScene(ctx, layout, theme, puzzle, playerGrid, givenMask, selected, conflicts, phase);
  }, [puzzle, playerGrid, givenMask, selected, conflicts, phase]);

  useEffect(() => {
    paint();
  }, [paint, genProgress]);

  const terminateWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => () => terminateWorker(), [terminateWorker]);

  const startGeneration = useCallback(
    (nextLevel: SudokuLevelId, nextId: number) => {
      terminateWorker();
      setGenError("");
      setGenProgress(0);
      setGenLabel("");
      setPhase("generating");
      setPuzzle(null);
      setGivenMask(null);
      setPlayerGrid(emptyGrid());
      setHasSubmitted(false);
      setSaveStatus("");

      const worker = new Worker("/workers/sudoku-generator.worker.js");
      workerRef.current = worker;

      const onMessage = (event: MessageEvent) => {
        const data = event.data as { kind: string; id: number; ratio?: number; label?: string; message?: string; puzzle?: Grid9; solution?: Grid9; seed?: number; metadata?: { givenCount?: number } };
        if (data.id !== nextId) return;

        if (data.kind === "progress") {
          setGenProgress(data.ratio ?? 0);
          setGenLabel(data.label ?? "");
          return;
        }
        if (data.kind === "error") {
          terminateWorker();
          setGenError(data.message ?? "생성 실패");
          setPhase("idle");
          return;
        }
        if (data.kind === "success" && data.puzzle && data.solution) {
          terminateWorker();
          const p = data.puzzle as Grid9;
          const gMask = buildGivenMask(p);
          const pg = cloneGrid(p);
          setPuzzle(p);
          setGivenMask(gMask);
          setPlayerGrid(pg);
          setSeed(data.seed ?? randomSeed());
          setPhase("ready");
          setGenProgress(1);
          setGenLabel("");
          setSelected({ row: 0, col: 0 });
        }
      };

      worker.addEventListener("message", onMessage);
      const msg: WorkerGenerateMessage = {
        kind: "generate",
        id: nextId,
        seed: randomSeed(),
        profile: getSudokuGeneratorProfile(nextLevel),
      };
      worker.postMessage(msg);
    },
    [terminateWorker],
  );

  const handleLevelChange = (next: SudokuLevelId) => {
    setLevelId(next);
    frozenMsRef.current = 0;
    playStartRef.current = 0;
    setDisplayedMs(0);
    startGeneration(next, bumpGenSeq());
  };

  const handleNewGame = () => {
    frozenMsRef.current = 0;
    playStartRef.current = 0;
    setDisplayedMs(0);
    startGeneration(levelId, bumpGenSeq());
  };

  const handleCancelGenerate = () => {
    terminateWorker();
    setPhase("idle");
    setGenProgress(0);
    setGenLabel("");
    setPuzzle(null);
    setPlayerGrid(emptyGrid());
    setGivenMask(null);
  };

  const startPlay = () => {
    if (phase !== "ready" || !puzzle || !givenMask) return;
    applyGivens(playerGrid, puzzle, givenMask);
    setPlayerGrid(cloneGrid(playerGrid));
    frozenMsRef.current = 0;
    playStartRef.current = performance.now();
    setDisplayedMs(0);
    setPhase("playing");
  };

  const togglePause = () => {
    if (phase === "playing") {
      frozenMsRef.current += performance.now() - playStartRef.current;
      setDisplayedMs(frozenMsRef.current);
      setPhase("paused");
      return;
    }
    if (phase === "paused") {
      playStartRef.current = performance.now();
      setPhase("playing");
    }
  };

  const tryComplete = useCallback(
    (grid: Grid9) => {
      if (!isComplete(grid) || computeConflictCells(grid).size !== 0) return;
      frozenMsRef.current += phaseRef.current === "playing" ? performance.now() - playStartRef.current : 0;
      setDisplayedMs(frozenMsRef.current);
      setPhase("completed");

      const prev = readLocalBestMap()[String(levelId)];
      const elapsed = Math.round(frozenMsRef.current);
      if (!prev || elapsed < prev.timeMs) {
        writeLocalBest(levelId, { timeMs: elapsed, createdAt: new Date().toISOString() });
      }
    },
    [levelId],
  );

  const setCellDigit = useCallback(
    (row: number, col: number, value: number) => {
      if (phaseRef.current !== "playing") return;
      if (!givenMask || !puzzle) return;
      if (givenMask[row][col]) return;

      setPlayerGrid((prev) => {
        const next = cloneGrid(prev);
        next[row][col] = value;
        applyGivens(next, puzzle, givenMask);
        if (phaseRef.current === "playing") tryComplete(next);
        return next;
      });
    },
    [givenMask, puzzle, tryComplete],
  );

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isFormTarget(event.target)) return;
      if (!puzzle || !givenMask) return;

      const code = event.code;
      const ph = phaseRef.current;

      if (code === "KeyP" || code === "Space") {
        if (ph === "playing" || ph === "paused") {
          event.preventDefault();
          if (ph === "playing") {
            frozenMsRef.current += performance.now() - playStartRef.current;
            setDisplayedMs(frozenMsRef.current);
            setPhase("paused");
          } else {
            playStartRef.current = performance.now();
            setPhase("playing");
          }
        }
        return;
      }

      if (ph !== "playing" && ph !== "ready") return;

      const sel = selectedRef.current;
      if (!sel) return;
      let { row, col } = sel;

      if (code === "ArrowLeft" || code === "KeyA") {
        event.preventDefault();
        col = (col + 8) % 9;
      } else if (code === "ArrowRight" || code === "KeyD") {
        event.preventDefault();
        col = (col + 1) % 9;
      } else if (code === "ArrowUp" || code === "KeyW") {
        event.preventDefault();
        row = (row + 8) % 9;
      } else if (code === "ArrowDown" || code === "KeyS") {
        event.preventDefault();
        row = (row + 1) % 9;
      } else if (ph === "playing" && (code === "Backspace" || code === "Delete")) {
        event.preventDefault();
        setCellDigit(row, col, 0);
        return;
      } else if (ph === "playing" && /^Digit[1-9]$/.test(code)) {
        event.preventDefault();
        const n = Number(code.replace("Digit", ""));
        setCellDigit(row, col, n);
        return;
      } else if (ph === "playing" && /^Numpad[1-9]$/.test(code)) {
        event.preventDefault();
        const n = Number(code.replace("Numpad", ""));
        setCellDigit(row, col, n);
        return;
      } else {
        return;
      }

      setSelected({ row, col });
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [puzzle, givenMask, setCellDigit]);

  useEffect(() => {
    if (sudokuInitialGenerationStarted) return;
    sudokuInitialGenerationStarted = true;
    startGeneration(1, bumpGenSeq());
  }, [startGeneration, bumpGenSeq]);

  useEffect(() => {
    if (!selected || !givenMask) return;
    const { row, col } = selected;
    const v = playerGrid[row][col];
    const fixed = givenMask[row][col];
    setLiveRegion(`${row + 1}행 ${col + 1}열, 값 ${v === 0 ? "빈칸" : v}, ${fixed ? "힌트" : "입력 가능"}`);
  }, [selected, playerGrid, givenMask]);

  const onCanvasPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (phase === "generating") return;
    const layout = layoutRef.current;
    const canvas = canvasRef.current;
    if (!layout || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const lx = event.clientX - rect.left;
    const ly = event.clientY - rect.top;
    const hit = hitTest(lx, ly, layout);
    if (!hit) return;

    if (hit.type === "cell") {
      setSelected({ row: hit.row, col: hit.col });
      return;
    }
    if (phaseRef.current !== "playing") return;
    const sel = selectedRef.current;
    if (!sel) return;
    if (hit.type === "num") setCellDigit(sel.row, sel.col, hit.n);
    if (hit.type === "clear") setCellDigit(sel.row, sel.col, 0);
  };

  const handleSubmitScore = async () => {
    if (phase !== "completed" || !puzzle || !givenMask || isSaving || hasSubmitted) return;

    const cleanName = playerName.replace(/\s+/g, " ").trim().slice(0, 18);
    setIsSaving(true);
    setSaveStatus("");
    window.localStorage.setItem(PLAYER_NAME_KEY, cleanName);

    try {
      const response = await fetch("/api/sudoku/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: cleanName,
          levelId,
          timeMs: Math.round(displayedMs),
          seed,
          puzzle: gridToString(puzzle),
          playerGrid: gridToString(playerGrid),
          givenMask: givenMask.map((row) => row.map((g) => (g ? "1" : "0")).join("")).join(""),
        }),
      });
      const data = (await response.json()) as { saved?: boolean; error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "기록 저장에 실패했습니다.");
      }

      setHasSubmitted(true);
      setSaveStatus(
        data.saved ? "글로벌 리더보드에 저장되었습니다." : "Supabase 환경변수가 없어 로컬 데모 모드로 처리되었습니다.",
      );
      await loadScores(levelId);
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "기록 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const localBest = readLocalBestMap()[String(levelId)] ?? null;

  return (
    <>
      <section className="panel sudoku-intro">
        <div>
          <div className="eyebrow">utility / sudoku</div>
          <h1>Sudoku</h1>
          <p className="muted">
            9×9 스도쿠를 레벨별로 생성해 풀고, 클리어 시간으로 순위를 겨루는 Canvas 게임입니다. 키보드 화살표와 숫자, 또는
            아래 숫자 패드를 사용하세요.
          </p>
        </div>

        <div className="sudoku-level-tabs" role="tablist" aria-label="Sudoku levels">
          {SUDOKU_LEVEL_IDS.map((id) => {
            const cfg = getSudokuLevelConfig(id);
            return (
              <button
                key={id}
                type="button"
                className={id === levelId ? "is-active" : ""}
                onClick={() => (id === levelId ? handleNewGame() : handleLevelChange(id))}
                role="tab"
                aria-selected={id === levelId}
              >
                <strong>{cfg.title}</strong>
                <span>{cfg.subtitle}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="sudoku-layout section">
        <div className="panel sudoku-play-panel">
          <div className="sudoku-play-header sudoku-play-header--actions-only">
            <div className="sudoku-play-actions sudoku-play-actions--primary">
              {phase === "generating" ? (
                <button type="button" className="ghost-button" onClick={handleCancelGenerate}>
                  취소
                </button>
              ) : null}
              {phase === "ready" ? (
                <button type="button" className="button" onClick={startPlay}>
                  Start
                </button>
              ) : null}
              {(phase === "playing" || phase === "paused") && puzzle ? (
                <>
                  <button type="button" className="ghost-button" onClick={togglePause}>
                    {phase === "paused" ? "Resume" : "Pause"}
                  </button>
                  <button type="button" className="button" onClick={handleNewGame}>
                    New game
                  </button>
                </>
              ) : null}
              {phase === "idle" && !puzzle ? (
                <button type="button" className="button" onClick={handleNewGame}>
                  퍼즐 생성
                </button>
              ) : null}
              {phase === "completed" ? (
                <button type="button" className="button" onClick={handleNewGame}>
                  New game
                </button>
              ) : null}
            </div>
          </div>

          <div className="sudoku-canvas-wrap" ref={wrapRef} style={{ touchAction: "none" }}>
            <canvas
              ref={canvasRef}
              className="sudoku-canvas"
              aria-label="스도쿠 보드"
              onPointerDown={onCanvasPointer}
            />
          </div>

          {phase === "generating" ? (
            <div className="sudoku-progress">
              <div className="sudoku-progress-track">
                <div className="sudoku-progress-fill" style={{ width: `${Math.round(genProgress * 100)}%` }} />
              </div>
              <p className="muted sudoku-progress-label">
                {genLabel || "퍼즐을 준비하는 중입니다…"} {Math.round(genProgress * 100)}%
              </p>
            </div>
          ) : null}

          {genError ? <div className="notice notice-error">{genError}</div> : null}
        </div>

        <aside className="sudoku-side-stack">
          <section className="panel sudoku-side-panel sudoku-session-panel">
            <h2>진행</h2>
            <dl className="sudoku-session-dl">
              <div>
                <dt>레벨</dt>
                <dd>{levelConfig.title}</dd>
              </div>
              <div>
                <dt>상태</dt>
                <dd>
                  <span className="tag neutral">
                    {phase === "idle" && "대기"}
                    {phase === "generating" && "생성 중"}
                    {phase === "ready" && "준비됨"}
                    {phase === "playing" && "플레이"}
                    {phase === "paused" && "일시정지"}
                    {phase === "completed" && "클리어"}
                  </span>
                </dd>
              </div>
              <div>
                <dt>시간</dt>
                <dd className="sudoku-session-mono">{formatTime(displayedMs)}</dd>
              </div>
              <div>
                <dt>시드</dt>
                <dd className="sudoku-session-mono sudoku-session-seed">{seed || "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="panel sudoku-side-panel">
            <h2>Global Leaderboard</h2>
            <p className="muted">같은 레벨에서 클리어 시간이 짧을수록 위입니다.</p>
            {leaderboardError ? <div className="notice notice-error">{leaderboardError}</div> : null}
            {isLoadingScores ? <div className="loading-inline">리더보드를 불러오는 중입니다.</div> : null}
            {!isLoadingScores && scores.length === 0 ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                아직 기록이 없습니다.
              </p>
            ) : (
              <ol className="sudoku-leaderboard">
                {scores.map((score, index) => (
                  <li key={score.id}>
                    <span className="sudoku-rank">{index + 1}</span>
                    <div>
                      <strong>{score.player_name}</strong>
                      <span>Lv {score.level_id}</span>
                    </div>
                    <b>{formatTime(score.time_ms)}</b>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel sudoku-side-panel">
            <h2>{phase === "completed" ? "클리어" : "조작"}</h2>
            {phase === "completed" ? (
              <div className="sudoku-submit-stack">
                <div className="sudoku-finish-summary">
                  <strong>{formatTime(displayedMs)}</strong>
                  <span>
                    {levelConfig.title} · Seed {seed}
                  </span>
                </div>
                {localBest ? (
                  <p className="muted" style={{ margin: 0 }}>
                    로컬 베스트: {formatTime(localBest.timeMs)}
                  </p>
                ) : null}
                <label className="field">
                  <span className="label">Player name</span>
                  <input
                    className="input"
                    value={playerName}
                    maxLength={18}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="이름"
                  />
                </label>
                <div className="actions">
                  <button type="button" className="button" onClick={handleSubmitScore} disabled={isSaving || hasSubmitted} aria-busy={isSaving}>
                    Save Score
                  </button>
                </div>
                {saveStatus ? <div className="notice">{saveStatus}</div> : null}
              </div>
            ) : (
              <div className="sudoku-control-list">
                <span>화살표 / WASD 이동</span>
                <span>1–9 입력</span>
                <span>Backspace 지우기</span>
                <span>P / Space 일시정지</span>
              </div>
            )}
          </section>
        </aside>
      </section>

      <div className="sr-only" aria-live="polite">
        {liveRegion}
      </div>
    </>
  );
}
