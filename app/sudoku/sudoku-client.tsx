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
import {
  getSudokuAssistProfile,
  getSudokuGeneratorProfile,
  getSudokuLevelConfig,
  isSudokuLevelId,
  SUDOKU_LEVEL_IDS,
  type SudokuAssistProfile,
} from "@/lib/sudoku/level-profiles";
import { computeSudokuScore, computeSudokuScoreBreakdown } from "@/lib/sudoku/scoring";
import type { LeaderboardStats, SudokuLevelId, SudokuScore } from "@/types";

type ScreenPhase = "idle" | "generating" | "ready" | "playing" | "completed";

type WorkerGenerateMessage = {
  kind: "generate";
  id: number;
  seed?: number;
  profile: ReturnType<typeof getSudokuGeneratorProfile>;
};

type LocalBest = {
  timeMs: number;
  score: number;
  createdAt: string;
};

function formatStatNumber(value: number) {
  if (!Number.isFinite(value)) return "-";
  return Math.round(value).toLocaleString();
}

function formatTopPercent(value: number | null | undefined) {
  if (!Number.isFinite(value ?? Number.NaN)) return null;
  return `Top ${Math.max(0.1, value as number).toFixed(1)}%`;
}

type NoteMask = number;

const PLAYER_NAME_KEY = "dopt-sudoku-player-name";
const BEST_KEY = "dopt-sudoku-best-v1";
const DEFAULT_PLAYER_NAME = "DOPT";

function emptyNotes(): NoteMask[][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 0));
}

function hasNote(mask: NoteMask, n: number) {
  return (mask & (1 << n)) !== 0;
}

function toggleNote(mask: NoteMask, n: number) {
  return mask ^ (1 << n);
}

function noteNumbers(mask: NoteMask) {
  const nums: number[] = [];
  for (let n = 1; n <= 9; n += 1) {
    if (hasNote(mask, n)) nums.push(n);
  }
  return nums;
}

function buildEmptyCellMask(emptyCells: number): boolean[][] {
  const flat = Array.from({ length: 81 }, (_, index) => index >= 81 - emptyCells ? false : true);
  return Array.from({ length: 9 }, (_, row) => flat.slice(row * 9, row * 9 + 9));
}

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

function formatScore(value: number) {
  return value.toLocaleString("ko-KR");
}

function normalizeStoredPlayerName(value: string | null) {
  const clean = (value ?? "").replace(/\s+/g, " ").trim().slice(0, 18);
  return clean || DEFAULT_PLAYER_NAME;
}

function readLocalBestMap(): Record<string, LocalBest> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, { timeMs: number; score?: number; createdAt: string }>;
    return Object.fromEntries(
      Object.entries(parsed).map(([level, entry]) => {
        const parsedLevel = Number(level);
        const score =
          typeof entry.score === "number"
            ? entry.score
            : isSudokuLevelId(parsedLevel)
              ? computeSudokuScore(parsedLevel, entry.timeMs, buildEmptyCellMask(getSudokuGeneratorProfile(parsedLevel).maxRemovals), 0)
              : 0;
        return [level, { timeMs: entry.timeMs, score, createdAt: entry.createdAt }];
      }),
    ) as Record<string, LocalBest>;
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
  const keyGap = 5;
  const keyW = (boardSize - keyGap * 2) / 3;
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
  notes: NoteMask[][],
  noteMode: boolean,
  selected: { row: number; col: number } | null,
  conflicts: Set<string>,
  assistProfile: SudokuAssistProfile,
  flashConflictKey: string | null,
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
  const shouldBlurBoard = phase === "ready";

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

  if (shouldBlurBoard) {
    ctx.save();
    ctx.filter = "blur(8px)";
  }

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "rgba(2,6,23,0.38)";
  roundPad(boardX - 8, boardY - 8, boardSize + 16, boardSize + 16, 12);
  ctx.fill();
  ctx.restore();

  const boardGradient = ctx.createLinearGradient(boardX, boardY, boardX, boardY + boardSize);
  boardGradient.addColorStop(0, "rgba(15,23,42,0.96)");
  boardGradient.addColorStop(1, "rgba(8,15,28,0.98)");
  ctx.fillStyle = boardGradient;
  roundPad(boardX, boardY, boardSize, boardSize, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(125,211,252,0.22)";
  ctx.lineWidth = 1;
  ctx.stroke();

  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const x = boardX + c * cell;
      const y = boardY + r * cell;
      const g = givenMask[r][c];
      const boxTone = (Math.floor(r / 3) + Math.floor(c / 3)) % 2 === 0 ? 0.11 : 0.06;
      ctx.fillStyle = g ? `rgba(148,163,184,${boxTone})` : `rgba(2,6,23,${boxTone + 0.08})`;
      ctx.fillRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
    }
  }

  if (selected && assistProfile.showPeerHighlight) {
    const { row, col } = selected;
    const boxR = Math.floor(row / 3) * 3;
    const boxC = Math.floor(col / 3) * 3;
    ctx.fillStyle = "rgba(125,211,252,0.1)";
    for (let i = 0; i < 9; i += 1) {
      ctx.fillRect(boardX + i * cell + 1, boardY + row * cell + 1, cell - 2, cell - 2);
      ctx.fillRect(boardX + col * cell + 1, boardY + i * cell + 1, cell - 2, cell - 2);
    }
    for (let r = boxR; r < boxR + 3; r += 1) {
      for (let c = boxC; c < boxC + 3; c += 1) {
        ctx.fillRect(boardX + c * cell + 1, boardY + r * cell + 1, cell - 2, cell - 2);
      }
    }
  }

  if (selected && assistProfile.showSameDigitHighlight) {
    const selectedValue = playerGrid[selected.row][selected.col];
    if (selectedValue !== 0) {
      ctx.fillStyle = "rgba(134,239,172,0.16)";
      for (let r = 0; r < 9; r += 1) {
        for (let c = 0; c < 9; c += 1) {
          if (playerGrid[r][c] !== selectedValue) continue;
          ctx.fillRect(boardX + c * cell + 1, boardY + r * cell + 1, cell - 2, cell - 2);
        }
      }
    }
  }

  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const key = `${r}:${c}`;
      const shouldShowConflict =
        assistProfile.conflictDisplay === "all"
          ? conflicts.has(key)
          : assistProfile.conflictDisplay === "selected"
            ? conflicts.has(key) && selected?.row === r && selected?.col === c
            : assistProfile.conflictDisplay === "flash"
              ? conflicts.has(key) && flashConflictKey === key
              : false;
      if (!shouldShowConflict) continue;
      const x = boardX + c * cell;
      const y = boardY + r * cell;
      ctx.fillStyle = assistProfile.conflictDisplay === "flash" ? "rgba(252,165,165,0.38)" : "rgba(252,165,165,0.22)";
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      if (assistProfile.conflictDisplay === "flash") {
        ctx.strokeStyle = "rgba(248,113,113,0.86)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + cellPad * 0.55, y + cellPad * 0.55, cell - cellPad * 1.1, cell - cellPad * 1.1);
      }
    }
  }

  if (selected) {
    const { row, col } = selected;
    const x = boardX + col * cell;
    const y = boardY + row * cell;
    const selectedFill = ctx.createLinearGradient(x, y, x, y + cell);
    selectedFill.addColorStop(0, "rgba(56,189,248,0.23)");
    selectedFill.addColorStop(1, "rgba(14,165,233,0.1)");
    ctx.fillStyle = selectedFill;
    roundPad(x + cellPad * 0.35, y + cellPad * 0.35, cell - cellPad * 0.7, cell - cellPad * 0.7, 6);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = "rgba(125,211,252,0.35)";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2.4;
    roundPad(x + cellPad * 0.35, y + cellPad * 0.35, cell - cellPad * 0.7, cell - cellPad * 0.7, 6);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 9; i += 1) {
    const thick = i % 3 === 0;
    ctx.lineWidth = thick ? 2.8 : 1;
    ctx.strokeStyle = thick ? "rgba(203,213,225,0.36)" : "rgba(148,163,184,0.16)";
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
      if (givenMask[r][c] || playerGrid[r][c] !== 0) continue;
      const mask = notes[r]?.[c] ?? 0;
      if (mask === 0) continue;
      const x = boardX + c * cell;
      const y = boardY + r * cell;
      const isSelected = selected?.row === r && selected?.col === c;
      const noteFont = Math.max(9, Math.floor(cell * 0.18));
      ctx.font = `700 ${noteFont}px ${theme.font}`;
      ctx.fillStyle = isSelected ? "rgba(224,242,254,0.86)" : "rgba(186,230,253,0.64)";
      ctx.shadowColor = "transparent";
      for (const n of noteNumbers(mask)) {
        const i = n - 1;
        const nr = Math.floor(i / 3);
        const nc = i % 3;
        ctx.fillText(String(n), x + (cell * (nc + 0.5)) / 3, y + (cell * (nr + 0.5)) / 3);
      }
    }
  }

  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const v = playerGrid[r][c];
      if (v === 0) continue;
      const x = boardX + c * cell + cell / 2;
      const y = boardY + r * cell + cell / 2;
      const g = givenMask[r][c];
      ctx.fillStyle = g ? "rgba(226,232,240,0.82)" : "#e0f2fe";
      ctx.font = `${g ? 700 : 600} ${Math.floor(cell * 0.5)}px ${theme.font}`;
      ctx.shadowColor = g ? "transparent" : "rgba(56,189,248,0.18)";
      ctx.shadowBlur = g ? 0 : 8;
      ctx.fillText(String(v), x, y);
      ctx.shadowBlur = 0;
    }
  }

  if (shouldBlurBoard) {
    ctx.restore();
    ctx.fillStyle = "rgba(2,6,23,0.9)";
    ctx.fillRect(boardX, boardY, boardSize, boardSize);
    ctx.fillStyle = theme.text;
    ctx.font = `600 18px ${theme.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Start를 눌러 게임을 시작하세요", boardX + boardSize / 2, boardY + boardSize / 2);
  }

  const px = layout.boardX;
  const py0 = padY + keyGap;
  const selectedValue = selected ? playerGrid[selected.row][selected.col] : 0;
  const selectedNoteMask = selected ? (notes[selected.row]?.[selected.col] ?? 0) : 0;
  ctx.font = `700 14px ${theme.font}`;
  for (let n = 1; n <= 9; n += 1) {
    const i = n - 1;
    const r = Math.floor(i / 3);
    const c = i % 3;
    const x0 = px + c * (keyW + keyGap);
    const y0 = py0 + r * (keyH + keyGap);
    const active = noteMode ? hasNote(selectedNoteMask, n) : selectedValue === n;
    const keyGradient = ctx.createLinearGradient(x0, y0, x0, y0 + keyH);
    keyGradient.addColorStop(0, active ? (noteMode ? "rgba(20,184,166,0.34)" : "rgba(56,189,248,0.34)") : "rgba(30,41,59,0.86)");
    keyGradient.addColorStop(1, active ? (noteMode ? "rgba(15,118,110,0.2)" : "rgba(14,165,233,0.18)") : "rgba(2,6,23,0.66)");
    ctx.save();
    ctx.shadowColor = active ? "rgba(56,189,248,0.22)" : "rgba(0,0,0,0.2)";
    ctx.shadowBlur = active ? 12 : 7;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = keyGradient;
    roundPad(x0, y0, keyW, keyH, 8);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = active ? (noteMode ? "rgba(94,234,212,0.75)" : "rgba(125,211,252,0.75)") : noteMode ? "rgba(94,234,212,0.28)" : "rgba(148,163,184,0.2)";
    ctx.lineWidth = active ? 1.4 : 1;
    roundPad(x0, y0, keyW, keyH, 8);
    ctx.stroke();
    ctx.fillStyle = active ? "#e0f2fe" : noteMode ? "rgba(204,251,241,0.9)" : theme.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(n), x0 + keyW / 2, y0 + keyH / 2);
  }

  const clearY = py0 + 3 * (keyH + keyGap) + keyGap;
  const clearGradient = ctx.createLinearGradient(px, clearY, px, clearY + keyH);
  clearGradient.addColorStop(0, "rgba(30,41,59,0.82)");
  clearGradient.addColorStop(1, "rgba(2,6,23,0.66)");
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.2)";
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = clearGradient;
  roundPad(px, clearY, keyW * 3 + keyGap * 2, keyH, 8);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(148,163,184,0.2)";
  ctx.lineWidth = 1;
  roundPad(px, clearY, keyW * 3 + keyGap * 2, keyH, 8);
  ctx.stroke();
  ctx.fillStyle = "rgba(203,213,225,0.86)";
  ctx.fillText(noteMode ? "Clear notes" : "Clear", px + (keyW * 3 + keyGap * 2) / 2, clearY + keyH / 2);

  if (phase === "generating") {
    ctx.fillStyle = "rgba(2,6,23,0.55)";
    ctx.fillRect(boardX, boardY, boardSize, boardSize);
    ctx.fillStyle = theme.text;
    ctx.font = `600 18px ${theme.font}`;
    ctx.textAlign = "center";
    ctx.fillText("생성 중…", boardX + boardSize / 2, boardY + boardSize / 2);
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
  const [canvasResizeTick, setCanvasResizeTick] = useState(0);
  const [displayedMs, setDisplayedMs] = useState(0);
  const [scores, setScores] = useState<SudokuScore[]>([]);
  const [leaderboardStats, setLeaderboardStats] = useState<LeaderboardStats>({
    participants: 0,
    average: 0,
    variance: 0,
    standardDeviation: 0,
  });
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [playerName, setPlayerName] = useState(DEFAULT_PLAYER_NAME);
  const [saveStatus, setSaveStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [liveRegion, setLiveRegion] = useState("");
  const [mistakeCount, setMistakeCount] = useState(0);
  const [flashConflictKey, setFlashConflictKey] = useState<string | null>(null);
  const [localBestMap, setLocalBestMap] = useState<Record<string, LocalBest>>({});
  const [noteMode, setNoteMode] = useState(false);
  const [notes, setNotes] = useState<NoteMask[][]>(() => emptyNotes());

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  const themeRef = useRef<CanvasTheme | null>(null);
  const phaseRef = useRef<ScreenPhase>("idle");
  const playStartRef = useRef(0);
  const frozenMsRef = useRef(0);
  const selectedRef = useRef<{ row: number; col: number } | null>({ row: 0, col: 0 });
  const playerGridRef = useRef<Grid9>(emptyGrid());
  const noteModeRef = useRef(false);
  const notesRef = useRef<NoteMask[][]>(emptyNotes());
  const mistakeCountRef = useRef(0);
  const mistakeKeysRef = useRef<Set<string>>(new Set());
  const flashConflictTimerRef = useRef<number | null>(null);

  const levelConfig = useMemo(() => getSudokuLevelConfig(levelId), [levelId]);
  const assistProfile = useMemo(() => getSudokuAssistProfile(levelId), [levelId]);
  const shouldShowMistakes = phase === "completed" || assistProfile.mistakeVisibility !== "completed";
  const shouldShowSubtleMistakes = phase !== "completed" && assistProfile.mistakeVisibility === "subtle";

  const conflicts = useMemo(() => computeConflictCells(playerGrid), [playerGrid]);

  useEffect(() => {
    playerGridRef.current = playerGrid;
  }, [playerGrid]);

  useEffect(() => {
    noteModeRef.current = noteMode;
  }, [noteMode]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const resetMistakes = useCallback(() => {
    mistakeCountRef.current = 0;
    mistakeKeysRef.current.clear();
    setMistakeCount(0);
  }, []);

  const resetNotes = useCallback(() => {
    const freshNotes = emptyNotes();
    notesRef.current = freshNotes;
    noteModeRef.current = false;
    setNotes(freshNotes);
    setNoteMode(false);
  }, []);

  const toggleNoteMode = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    setNoteMode((current) => {
      const next = !current;
      noteModeRef.current = next;
      return next;
    });
  }, []);

  const clearFlashConflict = useCallback(() => {
    if (flashConflictTimerRef.current !== null) {
      window.clearTimeout(flashConflictTimerRef.current);
      flashConflictTimerRef.current = null;
    }
    setFlashConflictKey(null);
  }, []);

  const loadScores = useCallback(async (targetLevel: SudokuLevelId) => {
    setIsLoadingScores(true);
    setLeaderboardError("");
    try {
      const response = await fetch(`/api/sudoku/scores?level=${targetLevel}`, { cache: "no-store" });
      const data = (await response.json()) as { scores?: SudokuScore[]; stats?: LeaderboardStats; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "리더보드를 불러오지 못했습니다.");
      }
      setScores(data.scores ?? []);
      setLeaderboardStats(data.stats ?? { participants: 0, average: 0, variance: 0, standardDeviation: 0 });
    } catch (error) {
      setScores([]);
      setLeaderboardStats({ participants: 0, average: 0, variance: 0, standardDeviation: 0 });
      setLeaderboardError(error instanceof Error ? error.message : "리더보드를 불러오지 못했습니다.");
    } finally {
      setIsLoadingScores(false);
    }
  }, []);

  useEffect(() => {
    setPlayerName(normalizeStoredPlayerName(window.localStorage.getItem(PLAYER_NAME_KEY)));
    setLocalBestMap(readLocalBestMap());
  }, []);

  const handlePlayerNameChange = useCallback((value: string) => {
    const next = value.slice(0, 18);
    setPlayerName(next);
    window.localStorage.setItem(PLAYER_NAME_KEY, normalizeStoredPlayerName(next));
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
    const numpadBlock = 120;
    const maxBoard = 720;
    const boardByW = Math.min(cssW - pad * 2, maxBoard);
    const cssH = Math.max(320, Math.min(820, boardByW + numpadBlock + pad * 2 + 16));
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
    window.requestAnimationFrame(() => setCanvasResizeTick((tick) => tick + 1));
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
    drawScene(ctx, layout, theme, puzzle, playerGrid, givenMask, notes, noteMode, selected, conflicts, assistProfile, flashConflictKey, phase);
  }, [puzzle, playerGrid, givenMask, notes, noteMode, selected, conflicts, assistProfile, flashConflictKey, phase]);

  useEffect(() => {
    paint();
  }, [paint, genProgress, canvasResizeTick]);

  const terminateWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => () => terminateWorker(), [terminateWorker]);

  useEffect(
    () => () => {
      if (flashConflictTimerRef.current !== null) {
        window.clearTimeout(flashConflictTimerRef.current);
      }
    },
    [],
  );

  const startGeneration = useCallback(
    (nextLevel: SudokuLevelId, nextId: number) => {
      terminateWorker();
      setGenError("");
      setGenProgress(0);
      setGenLabel("");
      setPhase("generating");
      setPuzzle(null);
      setGivenMask(null);
      const freshGrid = emptyGrid();
      playerGridRef.current = freshGrid;
      setPlayerGrid(freshGrid);
      setHasSubmitted(false);
      setSaveStatus("");
      resetMistakes();
      resetNotes();
      clearFlashConflict();

      const worker = new Worker("/workers/sudoku-generator.worker.js");
      workerRef.current = worker;

      const onMessage = (event: MessageEvent) => {
        const data = event.data as { kind: string; id: number; ratio?: number; label?: string; message?: string; puzzle?: Grid9; seed?: number; metadata?: { givenCount?: number } };
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
        if (data.kind === "success" && data.puzzle) {
          terminateWorker();
          const p = data.puzzle as Grid9;
          const gMask = buildGivenMask(p);
          const pg = cloneGrid(p);
          setPuzzle(p);
          setGivenMask(gMask);
          playerGridRef.current = pg;
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
    [clearFlashConflict, resetMistakes, resetNotes, terminateWorker],
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
    const freshGrid = emptyGrid();
    playerGridRef.current = freshGrid;
    setPlayerGrid(freshGrid);
    setGivenMask(null);
    resetMistakes();
    resetNotes();
    clearFlashConflict();
  };

  const startPlay = () => {
    if (phase !== "ready" || !puzzle || !givenMask) return;
    const next = cloneGrid(playerGridRef.current);
    applyGivens(next, puzzle, givenMask);
    playerGridRef.current = next;
    setPlayerGrid(next);
    frozenMsRef.current = 0;
    playStartRef.current = performance.now();
    setDisplayedMs(0);
    setPhase("playing");
  };

  const tryComplete = useCallback(
    (grid: Grid9) => {
      if (!isComplete(grid) || computeConflictCells(grid).size !== 0) return;
      frozenMsRef.current += phaseRef.current === "playing" ? performance.now() - playStartRef.current : 0;
      setDisplayedMs(frozenMsRef.current);
      setPhase("completed");
      noteModeRef.current = false;
      setNoteMode(false);

      const elapsed = Math.round(frozenMsRef.current);
      const mistakes = mistakeCountRef.current;
      const score = givenMask
        ? computeSudokuScore(levelId, elapsed, givenMask, mistakes)
        : levelId === 1
          ? computeSudokuScore(levelId, elapsed, buildEmptyCellMask(getSudokuGeneratorProfile(levelId).maxRemovals), mistakes)
          : 0;
      const prev = readLocalBestMap()[String(levelId)];
      if (!prev || score > prev.score || (score === prev.score && elapsed < prev.timeMs)) {
        const nextBest = { timeMs: elapsed, score, createdAt: new Date().toISOString() };
        writeLocalBest(levelId, nextBest);
        setLocalBestMap((prevMap) => ({ ...prevMap, [String(levelId)]: nextBest }));
      }
    },
    [givenMask, levelId],
  );

  const setCellDigit = useCallback(
    (row: number, col: number, value: number) => {
      if (phaseRef.current !== "playing") return;
      if (!givenMask || !puzzle) return;
      if (givenMask[row][col]) return;

      const next = cloneGrid(playerGridRef.current);
      next[row][col] = value;
      applyGivens(next, puzzle, givenMask);

      if (value !== 0 && computeConflictCells(next).has(`${row}:${col}`)) {
        const mistakeKey = `${row}:${col}:${value}`;
        if (!mistakeKeysRef.current.has(mistakeKey)) {
          mistakeKeysRef.current.add(mistakeKey);
          const nextMistakeCount = mistakeCountRef.current + 1;
          mistakeCountRef.current = nextMistakeCount;
          setMistakeCount(nextMistakeCount);
        }
        if (assistProfile.conflictDisplay === "flash") {
          const conflictKey = `${row}:${col}`;
          setFlashConflictKey(conflictKey);
          if (flashConflictTimerRef.current !== null) {
            window.clearTimeout(flashConflictTimerRef.current);
          }
          flashConflictTimerRef.current = window.setTimeout(() => {
            flashConflictTimerRef.current = null;
            setFlashConflictKey((current) => (current === conflictKey ? null : current));
          }, 650);
        }
      }

      playerGridRef.current = next;
      setPlayerGrid(next);
      if (value !== 0) {
        setNotes((current) => {
          if ((current[row]?.[col] ?? 0) === 0) return current;
          const nextNotes = current.map((line) => line.slice());
          nextNotes[row][col] = 0;
          notesRef.current = nextNotes;
          return nextNotes;
        });
      }
      if (phaseRef.current === "playing") tryComplete(next);
    },
    [assistProfile.conflictDisplay, givenMask, puzzle, tryComplete],
  );

  const toggleCellNote = useCallback(
    (row: number, col: number, value: number) => {
      if (phaseRef.current !== "playing") return;
      if (!givenMask || !puzzle) return;
      if (value < 1 || value > 9) return;
      if (givenMask[row][col]) return;
      if (playerGridRef.current[row][col] !== 0) return;

      const nextNotes = notesRef.current.map((line) => line.slice());
      nextNotes[row][col] = toggleNote(nextNotes[row][col], value);
      notesRef.current = nextNotes;
      setNotes(nextNotes);
    },
    [givenMask, puzzle],
  );

  const clearCellNotes = useCallback(
    (row: number, col: number) => {
      if (phaseRef.current !== "playing") return;
      if (!givenMask || !puzzle) return;
      if (givenMask[row][col]) return;
      const currentMask = notesRef.current[row]?.[col] ?? 0;
      if (currentMask === 0) return;

      const nextNotes = notesRef.current.map((line) => line.slice());
      nextNotes[row][col] = 0;
      notesRef.current = nextNotes;
      setNotes(nextNotes);
    },
    [givenMask, puzzle],
  );

  const handleDigitInput = useCallback(
    (row: number, col: number, value: number) => {
      if (noteModeRef.current) {
        toggleCellNote(row, col, value);
        return;
      }
      setCellDigit(row, col, value);
    },
    [setCellDigit, toggleCellNote],
  );

  const handleClearInput = useCallback(
    (row: number, col: number) => {
      if (noteModeRef.current) {
        clearCellNotes(row, col);
        return;
      }
      setCellDigit(row, col, 0);
    },
    [clearCellNotes, setCellDigit],
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

      if (ph !== "playing" && ph !== "ready") return;

      if (ph === "playing" && code === "KeyN") {
        event.preventDefault();
        toggleNoteMode();
        return;
      }

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
        handleClearInput(row, col);
        return;
      } else if (ph === "playing" && /^Digit[1-9]$/.test(code)) {
        event.preventDefault();
        const n = Number(code.replace("Digit", ""));
        handleDigitInput(row, col, n);
        return;
      } else if (ph === "playing" && /^Numpad[1-9]$/.test(code)) {
        event.preventDefault();
        const n = Number(code.replace("Numpad", ""));
        handleDigitInput(row, col, n);
        return;
      } else {
        return;
      }

      setSelected({ row, col });
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [puzzle, givenMask, handleClearInput, handleDigitInput, toggleNoteMode]);

  useEffect(() => {
    startGeneration(1, bumpGenSeq());
  }, [startGeneration, bumpGenSeq]);

  useEffect(() => {
    if (!selected || !givenMask) return;
    const { row, col } = selected;
    const v = playerGrid[row][col];
    const fixed = givenMask[row][col];
    setLiveRegion(`${row + 1}행 ${col + 1}열, 값 ${v === 0 ? "빈칸" : v}, ${fixed ? "힌트" : "입력 가능"}`);
  }, [selected, playerGrid, givenMask]);

  useEffect(() => {
    if (!selected || !givenMask) return;
    const { row, col } = selected;
    const v = playerGrid[row][col];
    const fixed = givenMask[row][col];
    const currentNotes = noteNumbers(notes[row]?.[col] ?? 0).join(" ");
    const noteText = v === 0 && currentNotes ? `, notes ${currentNotes}` : "";
    setLiveRegion(`Row ${row + 1}, column ${col + 1}, ${v === 0 ? "empty" : `value ${v}`}, ${fixed ? "given" : "editable"}${noteText}${noteMode ? ", note mode" : ""}`);
  }, [selected, playerGrid, givenMask, notes, noteMode]);

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
    if (hit.type === "num") handleDigitInput(sel.row, sel.col, hit.n);
    if (hit.type === "clear") handleClearInput(sel.row, sel.col);
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
          mistakeCount,
          seed,
          puzzle: gridToString(puzzle),
          playerGrid: gridToString(playerGrid),
          givenMask: givenMask.map((row) => row.map((g) => (g ? "1" : "0")).join("")).join(""),
        }),
      });
      const data = (await response.json()) as { saved?: boolean; topPercent?: number | null; error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "기록 저장에 실패했습니다.");
      }

      setHasSubmitted(true);
      const percent = formatTopPercent(data.topPercent);
      setSaveStatus(
        `${data.saved ? "Score saved to the global leaderboard." : "Saved locally because Supabase is not configured."}${percent ? ` ${percent}.` : ""}`,
      );
      await loadScores(levelId);
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "기록 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const scoreBreakdown = useMemo(
    () => (givenMask ? computeSudokuScoreBreakdown(levelId, Math.round(displayedMs), givenMask, mistakeCount) : null),
    [displayedMs, givenMask, levelId, mistakeCount],
  );

  const localScoreBreakdown = phase === "completed" ? scoreBreakdown : null;
  const localScore = localScoreBreakdown?.finalScore ?? null;
  const hudScore = scoreBreakdown?.finalScore ?? null;

  const localBest = localBestMap[String(levelId)] ?? null;

  return (
    <>
      <section className="panel sudoku-intro">
        <div>
          <div className="eyebrow">utility / sudoku</div>
          <h1>Sudoku</h1>
          <p className="muted">
            9×9 수도쿠를 빠르게 풀어보고 전세계 사람들과 순위를 겨뤄보세요. 점수는 풀어낸 시간과 난이도에 따라 결정됩니다. 키보드 화살표와 숫자, 또는
            아래 숫자 패드를 사용하세요.
          </p>
        </div>

        <div className="sudoku-level-picker">
          <div className="sudoku-level-picker-header">
            <span>Difficulty</span>
            <strong>Lv {levelId}</strong>
          </div>
          <div className="sudoku-level-tabs" role="tablist" aria-label="Sudoku levels">
            {SUDOKU_LEVEL_IDS.map((id) => {
              const cfg = getSudokuLevelConfig(id);
              const label = cfg.subtitle.split("—")[0].trim();
              const tier = id <= 3 ? "Easy" : id <= 7 ? "Focus" : "Expert";
              return (
                <button
                  key={id}
                  type="button"
                  className={id === levelId ? "is-active" : ""}
                  onClick={() => (id === levelId ? handleNewGame() : handleLevelChange(id))}
                  role="tab"
                  aria-selected={id === levelId}
                >
                  <span className="sudoku-level-topline">
                    <span className="sudoku-level-badge">Lv {id}</span>
                    <span className="sudoku-level-tier">{tier}</span>
                  </span>
                  <span className="sudoku-level-content">
                    <strong>{label}</strong>
                  </span>
                  <span className="sudoku-level-meter" aria-hidden="true">
                    {Array.from({ length: 10 }, (_, index) => (
                      <span key={index} className={index < id ? "is-filled" : ""} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="sudoku-layout section">
        <div className="game-main-column">
        <div className="panel sudoku-play-panel">
          <div className="sudoku-play-header">
            <div className="sudoku-board-status" aria-label={`Lv ${levelId} ${assistProfile.label}`}>
              <span>Lv {levelId}</span>
              <strong>{assistProfile.label}</strong>
            </div>
            <div className="sudoku-play-actions sudoku-play-actions--primary">
              <button
                type="button"
                className={`ghost-button sudoku-note-toggle${noteMode ? " is-active" : ""}`}
                onClick={toggleNoteMode}
                aria-pressed={noteMode}
                disabled={phase !== "playing"}
                title="Toggle notes (N)"
              >
                Note
              </button>
              {phase === "generating" ? (
                <button type="button" className="ghost-button" onClick={handleCancelGenerate}>
                  취소
                </button>
              ) : null}
              {phase === "playing" && puzzle ? (
                <button type="button" className="button" onClick={handleNewGame}>
                  New game
                </button>
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

          <div className="sudoku-top-hud" aria-label="Game stats">
            <div className="sudoku-hud-stat sudoku-hud-stat--score">
              <span>Score</span>
              <strong>{hudScore === null ? "-" : formatScore(hudScore)}</strong>
            </div>
            <div className="sudoku-hud-stat">
              <span>Time</span>
              <strong>{formatTime(displayedMs)}</strong>
            </div>
            {shouldShowMistakes ? (
              <div className={mistakeCount > 0 ? "sudoku-hud-stat sudoku-hud-stat--penalty is-active" : "sudoku-hud-stat sudoku-hud-stat--penalty"}>
                <span>Penalty</span>
                <strong>{mistakeCount}</strong>
              </div>
            ) : (
              <div className="sudoku-hud-stat sudoku-hud-stat--hidden">
                <span>Penalty</span>
                <strong>Hidden</strong>
              </div>
            )}
            <div className="sudoku-hud-stat">
              <span>Best</span>
              <strong>{localBest ? formatScore(localBest.score) : "-"}</strong>
            </div>
          </div>

          <div
            className={`sudoku-canvas-wrap${phase === "completed" ? " sudoku-canvas-wrap--blur" : ""}`}
            ref={wrapRef}
            style={{ touchAction: "none" }}
          >
            <canvas
              ref={canvasRef}
              className="sudoku-canvas"
              aria-label="스도쿠 보드"
              onPointerDown={onCanvasPointer}
            />
            {phase === "ready" ? (
              <button type="button" className="sudoku-canvas-start-button" onClick={startPlay}>
                Start
              </button>
            ) : null}
            {phase === "completed" ? (
              <div className="sudoku-complete-overlay">
                <div className="sudoku-complete-card">
                  <span className="tag success">게임 종료</span>
                  <strong className="sudoku-complete-score">{localScore === null ? "-" : formatScore(localScore)}</strong>
                  <p className="sudoku-complete-label">점수</p>
                  <div className="sudoku-complete-meta">
                    <span>시간 {formatTime(displayedMs)}</span>
                    <span>실수 {mistakeCount}</span>
                    <span>{levelConfig.title}</span>
                    <span>Seed {seed || "—"}</span>
                  </div>
                  <form
                    className="sudoku-complete-submit"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleSubmitScore();
                    }}
                  >
                    <label className="sudoku-complete-name">
                      <span>Player name</span>
                      <input
                        className="input"
                        value={playerName}
                        maxLength={18}
                        onChange={(e) => handlePlayerNameChange(e.target.value)}
                        placeholder="이름"
                      />
                    </label>
                    <button type="submit" className="button sudoku-complete-submit-button" disabled={isSaving || hasSubmitted} aria-busy={isSaving}>
                      {hasSubmitted ? "Saved" : isSaving ? "Saving..." : "Save Score"}
                    </button>
                    {saveStatus ? <div className="sudoku-complete-status">{saveStatus}</div> : null}
                  </form>
                </div>
              </div>
            ) : null}
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

        <section className="panel sudoku-side-panel game-leaderboard-panel">
          <div className="leaderboard-title-row">
            <h2>Global Leaderboard</h2>
            <div className="leaderboard-summary" aria-label="Leaderboard statistics">
              <span>{leaderboardStats.participants} players</span>
              <span>Avg {formatStatNumber(leaderboardStats.average)}</span>
              <span>Var {formatStatNumber(leaderboardStats.variance)}</span>
              <span>SD {formatStatNumber(leaderboardStats.standardDeviation)}</span>
            </div>
          </div>
          <p className="muted">Same level, score ranked. Showing top 10.</p>
          {leaderboardError ? <div className="notice notice-error">{leaderboardError}</div> : null}
          {isLoadingScores ? <div className="loading-inline">Loading leaderboard...</div> : null}
          {!isLoadingScores && scores.length === 0 ? (
            <p className="muted" style={{ marginBottom: 0 }}>
              No ranked runs yet.
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
                  <b>{formatScore(score.score)}</b>
                </li>
              ))}
            </ol>
          )}
        </section>
        </div>

        <aside className="sudoku-side-stack">
          <section className="panel sudoku-side-panel sudoku-session-panel">
            <div className="sudoku-session-header">
              <div>
                <span className="tag neutral">
                  {phase === "idle" && "대기"}
                  {phase === "generating" && "생성 중"}
                  {phase === "ready" && "준비됨"}
                  {phase === "playing" && "플레이"}
                  {phase === "completed" && "클리어"}
                </span>
              </div>
              <div className="sudoku-session-seed-header">Seed {seed || "—"}</div>
            </div>

            <div className="sudoku-session-grid">
              <div className="sudoku-session-card">
                <span className="sudoku-session-label">Level</span>
                <strong>{levelConfig.title}</strong>
              </div>
              <div className="sudoku-session-card">
                <span className="sudoku-session-label">Time</span>
                <strong className="sudoku-session-mono">{formatTime(displayedMs)}</strong>
              </div>
              {shouldShowMistakes ? (
                <div className={`sudoku-session-card${shouldShowSubtleMistakes ? " sudoku-session-card--subtle" : ""}`}>
                  <span className="sudoku-session-label">Penalty</span>
                  <strong className="sudoku-session-mono">{mistakeCount}</strong>
                </div>
              ) : null}
              <div className="sudoku-session-card">
                <span className="sudoku-session-label">Assist</span>
                <strong>{assistProfile.label}</strong>
              </div>
              <div className="sudoku-session-card">
                <span className="sudoku-session-label">Seed</span>
                <strong className="sudoku-session-mono sudoku-session-seed">{seed || "—"}</strong>
              </div>
              <div className="sudoku-session-card">
                <span className="sudoku-session-label">Mode</span>
                <strong>{phase === "idle" || phase === "ready" ? "Ready" : phase === "playing" ? "Playing" : phase === "completed" ? "Cleared" : ""}</strong>
              </div>
              <div className={`sudoku-session-card${noteMode ? " sudoku-session-card--note-active" : ""}`}>
                <span className="sudoku-session-label">Notes</span>
                <strong>{noteMode ? "On" : "Off"}</strong>
              </div>
            </div>
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
                {localScore !== null ? (
                  <p className="muted" style={{ margin: 0 }}>
                    점수: {formatScore(localScore)}
                  </p>
                ) : null}
                {localScoreBreakdown ? (
                  <div className="sudoku-score-breakdown" aria-label="점수 산정 근거">
                    <span>기본 {formatScore(localScoreBreakdown.baseScore)}</span>
                    <span>시간 -{formatScore(localScoreBreakdown.timePenalty)}</span>
                    <span>실수 -{formatScore(localScoreBreakdown.mistakePenalty)}</span>
                    <span>빈칸 {localScoreBreakdown.emptyCells} · 실수 {mistakeCount}</span>
                  </div>
                ) : null}
                {localBest ? (
                  <p className="muted" style={{ margin: 0 }}>
                    로컬 베스트: {formatTime(localBest.timeMs)} · {formatScore(localBest.score)}점
                  </p>
                ) : null}
                <label className="field">
                  <span className="label">Player name</span>
                  <input
                    className="input"
                    value={playerName}
                    maxLength={18}
                    onChange={(e) => handlePlayerNameChange(e.target.value)}
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
                <span>N Note mode</span>
                <span>화살표 / WASD 이동</span>
                <span>1–9 입력</span>
                <span>Backspace 지우기</span>
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
