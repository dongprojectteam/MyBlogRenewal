"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BOARD_WIDTH,
  LINE_CLEAR_ANIM_MS,
  VISIBLE_HEIGHT,
  VISIBLE_TOP,
  createEngine,
  getGhostCells,
  getLinesPerMinute,
  getPieceCells,
  getPiecePreview,
  getPiecesPerSecond,
  getPlayTimeSeconds,
  gravityMsPerRow,
  isFinished,
  isPaused,
  type Engine,
  type GameMode,
  type GameState,
  type PieceKind,
  type ClearInfo,
  type RotationDirection,
} from "tetris-toolkit";

import type { TetrisMode, TetrisScore } from "@/types";

type ModeConfig = {
  id: TetrisMode;
  title: string;
  subtitle: string;
  badge: string;
  accentA: string;
  accentB: string;
  engineMode: GameMode;
  startLevel?: number;
  durationMs?: number;
};

type SessionInfo = {
  seed: number;
  dailyKey: string | null;
  startedAt: number;
};

type RenderCell = {
  kind: PieceKind | null;
  status: "empty" | "filled" | "ghost" | "active";
  clearing: boolean;
};

type LocalBest = {
  score: number;
  timeMs: number;
  lines: number;
  createdAt: string;
};

const MODES: ModeConfig[] = [
  {
    id: "marathon",
    title: "Marathon",
    badge: "Classic",
    accentA: "#8affc7",
    accentB: "#7ad8ff",
    subtitle: "점수를 쌓으며 오래 버티는 기본 모드",
    engineMode: "marathon",
    startLevel: 1,
  },
  {
    id: "sprint",
    title: "Sprint 40",
    badge: "40 Lines",
    accentA: "#ffd54a",
    accentB: "#ff8f6d",
    subtitle: "40라인을 가장 빠르게 클리어",
    engineMode: "sprint",
  },
  {
    id: "ultra",
    title: "Ultra 2:00",
    badge: "2 Min",
    accentA: "#7ad8ff",
    accentB: "#d6b3ff",
    subtitle: "2분 동안 최대 점수 경쟁",
    engineMode: "ultra",
    durationMs: 120_000,
  },
  {
    id: "survival",
    title: "Survival",
    badge: "Lv 8",
    accentA: "#f5686a",
    accentB: "#ffd54a",
    subtitle: "빠른 중력으로 버티는 고난도 모드",
    engineMode: "marathon",
    startLevel: 8,
  },
  {
    id: "daily",
    title: "Daily",
    badge: "Seeded",
    accentA: "#8affc7",
    accentB: "#f2ff8a",
    subtitle: "오늘의 고정 시드로 전세계 경쟁",
    engineMode: "marathon",
    startLevel: 3,
  },
];

const INITIAL_STATE = createEngine({ seed: 1 }).getSnapshot();
const PLAYER_NAME_KEY = "dopt-tetris-player-name";
const DEFAULT_PLAYER_NAME = "DOPT";
const PIECE_COLORS: Record<PieceKind, string> = {
  I: "#38d5f5",
  O: "#facc15",
  T: "#c084fc",
  S: "#4ade80",
  Z: "#fb7185",
  J: "#60a5fa",
  L: "#fb923c",
};

function getModeConfig(mode: TetrisMode) {
  return MODES.find((item) => item.id === mode) ?? MODES[0];
}

function TetrisModeIcon({ mode }: { mode: TetrisMode }) {
  const patterns: Record<TetrisMode, number[]> = {
    marathon: [1, 4, 5, 7],
    sprint: [3, 4, 5, 6],
    ultra: [1, 3, 4, 5],
    survival: [0, 3, 4, 7],
    daily: [1, 3, 4, 7],
  };
  const filled = new Set(patterns[mode]);

  return (
    <span className="tetris-mode-icon" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <i key={`${mode}-${index}`} className={filled.has(index) ? "is-filled" : ""} />
      ))}
    </span>
  );
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function seedFromString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomSeed() {
  return Math.floor(Math.random() * 2_147_483_647);
}

function createModeEngine(mode: TetrisMode, seed: number) {
  if (mode !== "survival") {
    return createEngine({ seed });
  }

  return createEngine({
    seed,
    gravity: (level) => {
      const guideline = gravityMsPerRow(level);
      if (guideline <= 0) return 0;
      return Math.max(18, guideline * 0.52 - Math.max(0, level - 8) * 4);
    },
  });
}

function createPreparedEngine(mode: TetrisMode): { engine: Engine; session: SessionInfo } {
  const dailyKey = mode === "daily" ? getTodayKey() : null;
  const seed = dailyKey ? seedFromString(`dopt-tetris-${dailyKey}`) : randomSeed();
  const engine = createModeEngine(mode, seed);

  engine.configure({
    dasMs: 145,
    arrMs: 38,
    softDropFactor: 22,
  });

  return {
    engine,
    session: {
      seed,
      dailyKey,
      startedAt: 0,
    },
  };
}

function startPreparedEngine(engine: Engine, mode: TetrisMode, session: SessionInfo): SessionInfo {
  const config = getModeConfig(mode);

  engine.startGame({
    mode: config.engineMode,
    startLevel: config.startLevel,
    durationMs: config.durationMs,
    seed: session.seed,
  });

  return {
    ...session,
    startedAt: Date.now(),
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatTime(ms: number) {
  const safeMs = Math.max(0, Math.trunc(ms));
  const minutes = Math.floor(safeMs / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1000);
  const centiseconds = Math.floor((safeMs % 1000) / 10);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function normalizePlayerName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 18);
}

function getDisplayTime(state: GameState) {
  if (state.phase.kind === "sprintFinished") return state.phase.timeMs;
  if (state.phase.kind === "ultraFinished") return state.phase.timeMs;
  return state.elapsedMs;
}

function getPrimaryRankValue(score: TetrisScore, mode: TetrisMode) {
  return mode === "sprint" ? formatTime(score.time_ms) : formatNumber(score.score);
}

function getPhaseLabel(state: GameState, mode: TetrisMode) {
  if (state.phase.kind === "paused") return "Paused";
  if (state.phase.kind === "lineClearAnim") return "Clear";
  if (state.phase.kind === "sprintFinished") return "Sprint Clear";
  if (state.phase.kind === "ultraFinished") return "Time Up";
  if (state.phase.kind === "gameOver") return mode === "survival" ? "Survived" : "Game Over";
  if (state.phase.kind === "playing") return "Playing";
  return "Ready";
}

function getFinishTitle(state: GameState, mode: TetrisMode) {
  if (state.phase.kind === "sprintFinished") return "40라인 클리어";
  if (state.phase.kind === "ultraFinished") return "2분 종료";
  if (mode === "survival") return "생존 종료";
  if (mode === "daily") return "오늘의 도전 종료";
  return "게임 종료";
}

function getClearTitle(clear: ClearInfo) {
  if (clear.isPerfectClear) return "PERFECT CLEAR";

  const lineTitle = ["", "SINGLE", "DOUBLE", "TRIPLE", "TETRIS"][clear.lines] ?? `${clear.lines} LINES`;
  if (clear.tSpin === "full") return `T-SPIN ${lineTitle}`;
  if (clear.tSpin === "mini") return clear.lines > 0 ? `MINI T-SPIN ${lineTitle}` : "MINI T-SPIN";
  return lineTitle;
}

function getClearBadges(clear: ClearInfo) {
  const badges: string[] = [];

  if (clear.isBackToBack) badges.push("Back-to-Back");
  if (clear.combo > 0) badges.push(`${clear.combo + 1} Combo`);
  if (clear.tSpin !== "none") badges.push("T-Spin");

  return badges;
}

function getBaseClearPoints(clear: Pick<ClearInfo, "lines" | "tSpin">) {
  if (clear.tSpin === "full") {
    if (clear.lines === 1) return 800;
    if (clear.lines === 2) return 1200;
    if (clear.lines === 3) return 1600;
    return 400;
  }

  if (clear.tSpin === "mini") {
    if (clear.lines === 1) return 200;
    if (clear.lines === 2) return 400;
    return 100;
  }

  if (clear.lines === 1) return 100;
  if (clear.lines === 2) return 300;
  if (clear.lines === 3) return 500;
  if (clear.lines === 4) return 800;
  return 0;
}

function isDifficultClear(clear: Pick<ClearInfo, "lines" | "tSpin">) {
  return clear.lines === 4 || (clear.tSpin === "full" && clear.lines > 0) || (clear.tSpin === "mini" && clear.lines > 0);
}

function getPerfectClearBonus(lines: number) {
  if (lines === 1) return 800;
  if (lines === 2) return 1200;
  if (lines === 3) return 1800;
  if (lines === 4) return 2000;
  return 0;
}

function isPerfectClearAfterRows(state: GameState, rows: readonly number[]) {
  const clearingRows = new Set(rows);
  return state.board.every((row, rowIndex) => clearingRows.has(rowIndex) || row.every((cell) => cell === null));
}

function getPendingClearInfo(state: GameState): ClearInfo | null {
  if (state.phase.kind !== "lineClearAnim" || state.phase.rows.length === 0) return null;

  const lines = state.phase.rows.length;
  const tSpin = state.phase.tSpin;
  const preview = { lines, tSpin };
  const level = Math.max(1, state.level);
  const difficult = isDifficultClear(preview);
  const isPerfectClear = isPerfectClearAfterRows(state, state.phase.rows);
  const combo = state.combo + 1;
  const base = Math.floor(getBaseClearPoints(preview) * level * (difficult && state.backToBack ? 1.5 : 1));
  const comboBonus = combo > 0 ? 50 * combo * level : 0;
  const perfectClearBonus = isPerfectClear ? getPerfectClearBonus(lines) * level : 0;

  return {
    lines,
    tSpin,
    isBackToBack: difficult && state.backToBack,
    combo,
    isPerfectClear,
    points: base + comboBonus + perfectClearBonus,
  };
}

function getBestStorageKey(mode: TetrisMode, dailyKey: string | null) {
  return `dopt-tetris-best-${mode}${dailyKey ? `-${dailyKey}` : ""}`;
}

function isBetterBest(mode: TetrisMode, candidate: LocalBest, previous: LocalBest | null) {
  if (!previous) return true;
  if (mode === "sprint") return candidate.timeMs > 0 && candidate.timeMs < previous.timeMs;
  return candidate.score > previous.score;
}

function readLocalBest(mode: TetrisMode, dailyKey: string | null): LocalBest | null {
  try {
    const raw = window.localStorage.getItem(getBestStorageKey(mode, dailyKey));
    return raw ? (JSON.parse(raw) as LocalBest) : null;
  } catch {
    return null;
  }
}

function buildVisibleCells(state: GameState): RenderCell[] {
  const activeCells = new Map<string, PieceKind>();
  const ghostCells = new Map<string, PieceKind>();
  const clearingRows = new Set(state.phase.kind === "lineClearAnim" ? state.phase.rows : []);

  if (state.active) {
    getPieceCells(state.active.kind, state.active.rotation, state.active.x, state.active.y).forEach(([x, y]) => {
      activeCells.set(`${x}:${y}`, state.active?.kind ?? "I");
    });

    getGhostCells(state).forEach(([x, y]) => {
      ghostCells.set(`${x}:${y}`, state.active?.kind ?? "I");
    });
  }

  const cells: RenderCell[] = [];

  for (let y = VISIBLE_TOP; y < VISIBLE_TOP + VISIBLE_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const key = `${x}:${y}`;
      const boardKind = state.board[y]?.[x] ?? null;
      const ghostKind = ghostCells.get(key) ?? null;
      const activeKind = activeCells.get(key) ?? null;

      if (activeKind) {
        cells.push({ kind: activeKind, status: "active", clearing: clearingRows.has(y) });
      } else if (!boardKind && ghostKind) {
        cells.push({ kind: ghostKind, status: "ghost", clearing: false });
      } else if (boardKind) {
        cells.push({ kind: boardKind, status: "filled", clearing: clearingRows.has(y) });
      } else {
        cells.push({ kind: null, status: "empty", clearing: false });
      }
    }
  }

  return cells;
}

type BoardProps = {
  state: GameState;
  mode: TetrisMode;
  hasStarted: boolean;
  displayedTimeMs: number;
  playerName: string;
  personalBest: LocalBest | null;
  saveStatus: string;
  isSaving: boolean;
  hasSubmitted: boolean;
  onStart: () => void;
  onPlayAgain: () => void;
  onPlayerNameChange: (value: string) => void;
  onSubmitScore: () => void;
};

function Board({
  state,
  mode,
  hasStarted,
  displayedTimeMs,
  playerName,
  personalBest,
  saveStatus,
  isSaving,
  hasSubmitted,
  onStart,
  onPlayAgain,
  onPlayerNameChange,
  onSubmitScore,
}: BoardProps) {
  const cells = useMemo(() => buildVisibleCells(state), [state]);
  const finished = isFinished(state);
  const paused = isPaused(state);
  const clearRows =
    state.phase.kind === "lineClearAnim"
      ? state.phase.rows.filter((row) => row >= VISIBLE_TOP && row < VISIBLE_TOP + VISIBLE_HEIGHT)
      : [];
  const clearInfo = clearRows.length > 0 ? getPendingClearInfo(state) : null;
  const clearBadges = clearInfo ? getClearBadges(clearInfo) : [];
  const stageStyle = clearInfo ? ({ "--clear-duration": `${LINE_CLEAR_ANIM_MS}ms` } as CSSProperties) : undefined;

  return (
    <div className={`tetris-board-stage${clearInfo ? " is-clearing" : ""}`} style={stageStyle}>
      <div className="tetris-board" aria-label="Tetris board">
        {cells.map((cell, index) => {
          const style = cell.kind ? ({ "--piece-color": PIECE_COLORS[cell.kind] } as CSSProperties) : undefined;
          return (
            <div
              key={`${index}-${cell.status}-${cell.kind ?? "empty"}`}
              className={`tetris-cell is-${cell.status}${cell.clearing ? " is-clearing" : ""}`}
              data-kind={cell.kind?.toLowerCase() ?? "empty"}
              style={style}
              aria-hidden="true"
            />
          );
        })}
      </div>

      {clearInfo ? (
        <>
          <div className="tetris-clear-layer" aria-hidden="true">
            {clearRows.map((row, index) => (
              <span
                key={`${row}-${index}`}
                className="tetris-clear-row-flash"
                style={
                  {
                    animationDelay: `${index * 32}ms`,
                    top: `${((row - VISIBLE_TOP) / VISIBLE_HEIGHT) * 100}%`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <div className={`tetris-clear-pop is-lines-${Math.min(clearInfo.lines, 4)}`} aria-live="polite">
            <strong>{getClearTitle(clearInfo)}</strong>
            <span>+{formatNumber(clearInfo.points)}</span>
            {clearBadges.length > 0 ? (
              <small>
                {clearBadges.map((badge) => (
                  <b key={badge}>{badge}</b>
                ))}
              </small>
            ) : null}
          </div>
        </>
      ) : null}

      {!hasStarted || paused || finished ? (
        <div className={`tetris-board-overlay${finished ? " is-finished" : ""}`}>
          {finished ? (
            <form
              className="tetris-board-submit"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmitScore();
              }}
            >
              <div className="tetris-board-result">
                <span>{getFinishTitle(state, mode)}</span>
                <strong>{mode === "sprint" ? formatTime(displayedTimeMs) : formatNumber(state.score)}</strong>
                <small>
                  {state.lines} lines · Lv {state.level} · {formatTime(displayedTimeMs)}
                </small>
              </div>
              {personalBest ? (
                <p className="tetris-board-best">
                  Personal best: {mode === "sprint" ? formatTime(personalBest.timeMs) : formatNumber(personalBest.score)}
                </p>
              ) : null}
              <label className="field tetris-board-name">
                <span className="label">Player name</span>
                <input
                  className="input"
                  value={playerName}
                  maxLength={18}
                  onChange={(event) => onPlayerNameChange(event.target.value)}
                  placeholder="이름"
                />
              </label>
              <div className="tetris-board-actions">
                <button type="submit" className="button" disabled={isSaving || hasSubmitted} aria-busy={isSaving}>
                  {hasSubmitted ? "Saved" : isSaving ? "Saving..." : "Save Score"}
                </button>
                <button type="button" className="ghost-button" onClick={onPlayAgain}>
                  Play Again
                </button>
              </div>
              {saveStatus ? (
                <div className="notice tetris-board-save-status" aria-live="polite">
                  {saveStatus}
                </div>
              ) : null}
            </form>
          ) : (
            <>
              <strong>{!hasStarted ? "Ready" : "일시정지"}</strong>
              <span>{!hasStarted ? "모드를 고른 뒤 Start를 누르면 블록이 내려오기 시작합니다." : "P 키로 이어서 플레이하세요."}</span>
              {!hasStarted ? (
                <button type="button" className="button" onClick={onStart}>
                  Start
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function MiniPiece({ kind, label }: { kind: PieceKind | null; label: string }) {
  const preview = kind ? getPiecePreview(kind) : null;
  const occupied = new Set<string>();

  if (preview) {
    preview.cells.forEach(([x, y]) => {
      occupied.add(`${x - preview.minX}:${y - preview.minY}`);
    });
  }

  return (
    <div className="tetris-mini-piece" aria-label={label}>
      {Array.from({ length: 16 }, (_, index) => {
        const x = index % 4;
        const y = Math.floor(index / 4);
        const filled = Boolean(kind && occupied.has(`${x}:${y}`));
        const style = filled && kind ? ({ "--piece-color": PIECE_COLORS[kind] } as CSSProperties) : undefined;

        return <span key={`${label}-${index}`} className={filled ? "is-filled" : ""} style={style} />;
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="tetris-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function isFormTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, button"));
}

export function TetrisClient() {
  const [mode, setMode] = useState<TetrisMode>("marathon");
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [session, setSession] = useState<SessionInfo>({ seed: 0, dailyKey: null, startedAt: 0 });
  const [scores, setScores] = useState<TetrisScore[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [playerName, setPlayerName] = useState(DEFAULT_PLAYER_NAME);
  const [saveStatus, setSaveStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [personalBest, setPersonalBest] = useState<LocalBest | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const stateRef = useRef<GameState>(INITIAL_STATE);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const bestUpdatedForSessionRef = useRef(0);

  const config = getModeConfig(mode);
  const finished = isFinished(state);
  const hasStarted = session.startedAt > 0;
  const displayedTimeMs = getDisplayTime(state);
  const elapsedSeconds = getPlayTimeSeconds(state);
  const piecesPerSecond = getPiecesPerSecond(state);
  const linesPerMinute = getLinesPerMinute(state);
  const ultraRemainingMs =
    mode === "ultra" && state.durationMs !== null ? Math.max(0, state.durationMs - state.elapsedMs) : null;

  const prepareNewGame = useCallback((nextMode: TetrisMode) => {
    pressedKeysRef.current.clear();
    engineRef.current?.destroy();

    const next = createPreparedEngine(nextMode);
    engineRef.current = next.engine;
    stateRef.current = next.engine.getSnapshot();
    bestUpdatedForSessionRef.current = 0;

    setSession(next.session);
    setState(next.engine.getSnapshot());
    setHasSubmitted(false);
    setSaveStatus("");
  }, []);

  const startCurrentGame = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    pressedKeysRef.current.clear();
    const startedSession = startPreparedEngine(engine, mode, session);
    stateRef.current = engine.getSnapshot();

    setSession(startedSession);
    setState(engine.getSnapshot());
    setHasSubmitted(false);
    setSaveStatus("");
  }, [mode, session]);

  const startNewGame = useCallback((nextMode: TetrisMode) => {
    pressedKeysRef.current.clear();
    engineRef.current?.destroy();

    const next = createPreparedEngine(nextMode);
    const startedSession = startPreparedEngine(next.engine, nextMode, next.session);
    engineRef.current = next.engine;
    stateRef.current = next.engine.getSnapshot();
    bestUpdatedForSessionRef.current = 0;

    setSession(startedSession);
    setState(next.engine.getSnapshot());
    setHasSubmitted(false);
    setSaveStatus("");
  }, []);

  const loadScores = useCallback(async (targetMode: TetrisMode, dailyKey: string | null) => {
    setIsLoadingScores(true);
    setLeaderboardError("");

    try {
      const params = new URLSearchParams({ mode: targetMode });
      if (targetMode === "daily" && dailyKey) {
        params.set("dailyKey", dailyKey);
      }

      const response = await fetch(`/api/tetris/scores?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as { scores?: TetrisScore[]; error?: string };

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
    const savedName = normalizePlayerName(window.localStorage.getItem(PLAYER_NAME_KEY) ?? "");
    if (savedName) {
      setPlayerName(savedName);
      window.localStorage.setItem(PLAYER_NAME_KEY, savedName);
    } else {
      setPlayerName(DEFAULT_PLAYER_NAME);
      window.localStorage.removeItem(PLAYER_NAME_KEY);
    }
  }, []);

  useEffect(() => {
    prepareNewGame(mode);

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [mode, prepareNewGame]);

  useEffect(() => {
    let frameId = 0;
    let previous = performance.now();

    const frame = (now: number) => {
      const engine = engineRef.current;
      const delta = Math.min(64, now - previous);
      previous = now;

      if (engine) {
        engine.tick(delta);
        const nextState = engine.getSnapshot();
        stateRef.current = nextState;
        setState(nextState);
      }

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    loadScores(mode, session.dailyKey);
    setPersonalBest(readLocalBest(mode, session.dailyKey));
  }, [loadScores, mode, session.dailyKey]);

  useEffect(() => {
    if (!finished || bestUpdatedForSessionRef.current === session.startedAt) return;

    const candidate: LocalBest = {
      score: state.score,
      timeMs: displayedTimeMs,
      lines: state.lines,
      createdAt: new Date().toISOString(),
    };

    const previous = readLocalBest(mode, session.dailyKey);
    if (isBetterBest(mode, candidate, previous)) {
      window.localStorage.setItem(getBestStorageKey(mode, session.dailyKey), JSON.stringify(candidate));
      setPersonalBest(candidate);
    } else {
      setPersonalBest(previous);
    }

    bestUpdatedForSessionRef.current = session.startedAt;
  }, [displayedTimeMs, finished, mode, session.dailyKey, session.startedAt, state.lines, state.score]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFormTarget(event.target)) return;

      const engine = engineRef.current;
      if (!engine) return;

      const code = event.code;
      const holdable = code === "ArrowLeft" || code === "ArrowRight" || code === "ArrowDown";
      const handledCodes = new Set([
        "ArrowLeft",
        "ArrowRight",
        "ArrowDown",
        "ArrowUp",
        "Space",
        "KeyZ",
        "KeyX",
        "KeyC",
        "ShiftLeft",
        "ShiftRight",
        "KeyP",
        "KeyR",
      ]);

      if (!handledCodes.has(code)) return;
      event.preventDefault();

      if (stateRef.current.phase.kind === "menu") return;

      if (holdable) {
        if (pressedKeysRef.current.has(code)) return;
        pressedKeysRef.current.add(code);
      } else if (event.repeat) {
        return;
      }

      if (code === "ArrowLeft") engine.moveLeft();
      if (code === "ArrowRight") engine.moveRight();
      if (code === "ArrowDown") engine.softDrop();
      if (code === "ArrowUp" || code === "KeyX") engine.rotate("cw");
      if (code === "KeyZ") engine.rotate("ccw");
      if (code === "KeyC" || code === "ShiftLeft" || code === "ShiftRight") engine.hold();
      if (code === "Space") engine.hardDrop();
      if (code === "KeyP") {
        if (isPaused(stateRef.current)) {
          engine.resume();
        } else {
          engine.pause();
        }
      }
      if (code === "KeyR") startNewGame(mode);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (event.code === "ArrowLeft") {
        pressedKeysRef.current.delete(event.code);
        engine.releaseMoveLeft();
      }
      if (event.code === "ArrowRight") {
        pressedKeysRef.current.delete(event.code);
        engine.releaseMoveRight();
      }
      if (event.code === "ArrowDown") {
        pressedKeysRef.current.delete(event.code);
        engine.releaseSoftDrop();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [mode, startNewGame]);

  const handleModeSelect = (nextMode: TetrisMode) => {
    if (nextMode === mode) {
      prepareNewGame(nextMode);
      return;
    }

    setMode(nextMode);
  };

  const togglePause = () => {
    const engine = engineRef.current;
    if (!engine || !hasStarted || finished) return;

    if (isPaused(stateRef.current)) {
      engine.resume();
    } else {
      engine.pause();
    }
  };

  const pressControl = (action: "left" | "right" | "down") => {
    const engine = engineRef.current;
    if (!engine || !hasStarted || finished) return;
    if (action === "left") engine.moveLeft();
    if (action === "right") engine.moveRight();
    if (action === "down") engine.softDrop();
  };

  const releaseControl = (action: "left" | "right" | "down") => {
    const engine = engineRef.current;
    if (!engine || !hasStarted) return;
    if (action === "left") engine.releaseMoveLeft();
    if (action === "right") engine.releaseMoveRight();
    if (action === "down") engine.releaseSoftDrop();
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, action: "left" | "right" | "down") => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pressControl(action);
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>, action: "left" | "right" | "down") => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    releaseControl(action);
  };

  const oneShot = (action: "rotateCW" | "rotateCCW" | "rotate180" | "hardDrop" | "hold") => {
    const engine = engineRef.current;
    if (!engine || !hasStarted || finished) return;

    if (action === "rotateCW") engine.rotate("cw");
    if (action === "rotateCCW") engine.rotate("ccw");
    if (action === "rotate180") engine.rotate("180" as RotationDirection);
    if (action === "hardDrop") engine.hardDrop();
    if (action === "hold") engine.hold();
  };

  const handlePlayerNameChange = useCallback((value: string) => {
    const nextName = value.slice(0, 18);
    const cleanName = normalizePlayerName(nextName);

    setPlayerName(nextName);

    if (cleanName) {
      window.localStorage.setItem(PLAYER_NAME_KEY, cleanName);
    } else {
      window.localStorage.removeItem(PLAYER_NAME_KEY);
    }
  }, []);

  const handleSubmitScore = async () => {
    if (!finished || isSaving || hasSubmitted) return;

    const cleanName = normalizePlayerName(playerName) || DEFAULT_PLAYER_NAME;
    setIsSaving(true);
    setSaveStatus("");
    setPlayerName(cleanName);
    window.localStorage.setItem(PLAYER_NAME_KEY, cleanName);

    try {
      const response = await fetch("/api/tetris/scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerName: cleanName,
          mode,
          score: state.score,
          lines: state.lines,
          level: state.level,
          timeMs: displayedTimeMs,
          pieces: state.lockCount,
          seed: session.seed,
          dailyKey: session.dailyKey,
        }),
      });
      const data = (await response.json()) as { saved?: boolean; error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "기록 저장에 실패했습니다.");
      }

      setHasSubmitted(true);
      setSaveStatus(data.saved ? "글로벌 리더보드에 저장되었습니다." : "Supabase 환경변수가 없어 로컬 데모 모드로 처리되었습니다.");
      await loadScores(mode, session.dailyKey);
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "기록 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const nextPieces = state.queue.slice(0, 5);
  const phaseLabel = getPhaseLabel(state, mode);
  const controlsDisabled = !hasStarted || finished || isPaused(state);

  return (
    <>
      <section className="panel tetris-intro">
        <div className="tetris-intro-copy">
          <div className="eyebrow">utility / tetris</div>
          <h1>Tetris Arena</h1>
          <p className="muted">
            고스트 블록, Hold, SRS 회전, 콤보와 Back-to-Back 점수를 갖춘 브라우저 테트리스입니다.
          </p>
        </div>

        <div className="tetris-mode-console">
          <div className="tetris-mode-console-header">
            <span>Game mode</span>
            <strong>{config.title}</strong>
          </div>
          <div className="tetris-mode-tabs" role="tablist" aria-label="Tetris modes">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === mode ? "tetris-mode-card is-active" : "tetris-mode-card"}
                onClick={() => handleModeSelect(item.id)}
                role="tab"
                aria-selected={item.id === mode}
                aria-label={`${item.title}: ${item.subtitle}`}
                title={item.subtitle}
                style={
                  {
                    "--mode-a": item.accentA,
                    "--mode-b": item.accentB,
                  } as CSSProperties
                }
              >
                <span className="tetris-mode-aura" aria-hidden="true" />
                <TetrisModeIcon mode={item.id} />
                <span className="tetris-mode-copy">
                  <strong>{item.title}</strong>
                  <small>{item.badge}</small>
                </span>
                <span className="tetris-mode-check" aria-hidden="true" />
              </button>
            ))}
          </div>
          <p className="tetris-mode-readout">{config.subtitle}</p>
        </div>
      </section>

      <section className="tetris-layout section">
        <div className="panel tetris-play-panel">
          <div className="tetris-play-header">
            <div>
              <span className="tag neutral">{config.title}</span>
              {mode === "daily" && session.dailyKey ? <span className="tag neutral">{session.dailyKey}</span> : null}
            </div>
            <div className="tetris-play-actions">
              {!hasStarted ? (
                <button type="button" className="button" onClick={startCurrentGame}>
                  Start
                </button>
              ) : (
                <>
                  <button type="button" className="ghost-button" onClick={togglePause} disabled={finished}>
                    {isPaused(state) ? "Resume" : "Pause"}
                  </button>
                  <button type="button" className="button" onClick={() => startNewGame(mode)}>
                    Restart
                  </button>
                </>
              )}
            </div>
          </div>

          <Board
            state={state}
            mode={mode}
            hasStarted={hasStarted}
            displayedTimeMs={displayedTimeMs}
            playerName={playerName}
            personalBest={personalBest}
            saveStatus={saveStatus}
            isSaving={isSaving}
            hasSubmitted={hasSubmitted}
            onStart={startCurrentGame}
            onPlayAgain={() => startNewGame(mode)}
            onPlayerNameChange={handlePlayerNameChange}
            onSubmitScore={handleSubmitScore}
          />

          <div className="tetris-touch-controls" aria-label="Touch controls">
            <button
              type="button"
              className="tetris-control-button"
              onPointerDown={(event) => handlePointerDown(event, "left")}
              onPointerUp={(event) => handlePointerUp(event, "left")}
              onPointerCancel={(event) => handlePointerUp(event, "left")}
              title="Move left"
              aria-label="Move left"
              disabled={controlsDisabled}
            >
              ←
            </button>
            <button
              type="button"
              className="tetris-control-button"
              onPointerDown={(event) => handlePointerDown(event, "down")}
              onPointerUp={(event) => handlePointerUp(event, "down")}
              onPointerCancel={(event) => handlePointerUp(event, "down")}
              title="Soft drop"
              aria-label="Soft drop"
              disabled={controlsDisabled}
            >
              ↓
            </button>
            <button
              type="button"
              className="tetris-control-button"
              onPointerDown={(event) => handlePointerDown(event, "right")}
              onPointerUp={(event) => handlePointerUp(event, "right")}
              onPointerCancel={(event) => handlePointerUp(event, "right")}
              title="Move right"
              aria-label="Move right"
              disabled={controlsDisabled}
            >
              →
            </button>
            <button
              type="button"
              className="tetris-control-button"
              onClick={() => oneShot("rotateCCW")}
              title="Rotate counterclockwise"
              aria-label="Rotate counterclockwise"
              disabled={controlsDisabled}
            >
              ↺
            </button>
            <button
              type="button"
              className="tetris-control-button"
              onClick={() => oneShot("rotateCW")}
              title="Rotate clockwise"
              aria-label="Rotate clockwise"
              disabled={controlsDisabled}
            >
              ↻
            </button>
            <button
              type="button"
              className="tetris-control-button"
              onClick={() => oneShot("hardDrop")}
              title="Hard drop"
              aria-label="Hard drop"
              disabled={controlsDisabled}
            >
              ⤓
            </button>
            <button
              type="button"
              className="tetris-control-button"
              onClick={() => oneShot("hold")}
              title="Hold"
              aria-label="Hold"
              disabled={controlsDisabled}
            >
              H
            </button>
          </div>
        </div>

        <aside className="tetris-side-stack">
          <section className="panel tetris-side-panel">
            <div className="tetris-status-line">
              <span className="tag neutral">{phaseLabel}</span>
              <span className="muted">Seed {session.seed || "-"}</span>
            </div>

            <div className="tetris-stats-grid">
              <Stat label="Score" value={formatNumber(state.score)} />
              <Stat label={ultraRemainingMs === null ? "Time" : "Left"} value={formatTime(ultraRemainingMs ?? displayedTimeMs)} />
              <Stat label="Lines" value={state.lines} />
              <Stat label="Level" value={state.level} />
              <Stat label="Combo" value={state.combo < 0 ? 0 : state.combo} />
              <Stat label="Pieces" value={state.lockCount} />
            </div>

            <div className="tetris-rate-row">
              <span>PPS {piecesPerSecond.toFixed(2)}</span>
              <span>LPM {linesPerMinute.toFixed(1)}</span>
              <span>{elapsedSeconds}s</span>
            </div>

            <div className="tetris-preview-grid">
              <div className="tetris-preview-slot">
                <span>Hold</span>
                <MiniPiece kind={state.hold} label="Held piece" />
              </div>
              <div className="tetris-preview-slot">
                <span>Next</span>
                <div className="tetris-next-list">
                  {nextPieces.map((piece, index) => (
                    <MiniPiece key={`${piece}-${index}`} kind={piece} label={`Next piece ${index + 1}`} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="panel tetris-side-panel">
            <h2>Global Leaderboard</h2>
            <p className="muted">
              {mode === "sprint" ? "짧을수록 높은 순위입니다." : "점수가 높을수록 높은 순위입니다."}
            </p>

            {leaderboardError ? <div className="notice notice-error">{leaderboardError}</div> : null}
            {isLoadingScores ? <div className="loading-inline">리더보드를 불러오는 중입니다.</div> : null}

            {!isLoadingScores && scores.length === 0 ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                아직 기록이 없습니다.
              </p>
            ) : (
              <ol className="tetris-leaderboard">
                {scores.map((score, index) => (
                  <li key={score.id}>
                    <span className="tetris-rank">{index + 1}</span>
                    <div>
                      <strong>{score.player_name}</strong>
                      <span>
                        {score.lines} lines · Lv {score.level} · {formatTime(score.time_ms)}
                      </span>
                    </div>
                    <b>{getPrimaryRankValue(score, mode)}</b>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel tetris-side-panel">
            <h2>{finished ? getFinishTitle(state, mode) : "Controls"}</h2>
            {finished ? (
              <div className="tetris-submit-stack">
                <div className="tetris-finish-summary">
                  <strong>{mode === "sprint" ? formatTime(displayedTimeMs) : formatNumber(state.score)}</strong>
                  <span>
                    {state.lines} lines · Lv {state.level} · {formatTime(displayedTimeMs)}
                  </span>
                </div>
                {personalBest ? (
                  <p className="muted" style={{ margin: 0 }}>
                    Personal best: {mode === "sprint" ? formatTime(personalBest.timeMs) : formatNumber(personalBest.score)}
                  </p>
                ) : null}
                <label className="field">
                  <span className="label">Player name</span>
                  <input
                    className="input"
                    value={playerName}
                    maxLength={18}
                    onChange={(event) => handlePlayerNameChange(event.target.value)}
                    placeholder="이름"
                  />
                </label>
                <div className="actions">
                  <button
                    type="button"
                    className="button"
                    onClick={handleSubmitScore}
                    disabled={isSaving || hasSubmitted}
                    aria-busy={isSaving}
                  >
                    Save Score
                  </button>
                  <button type="button" className="ghost-button" onClick={() => startNewGame(mode)}>
                    Play Again
                  </button>
                </div>
                {saveStatus ? <div className="notice">{saveStatus}</div> : null}
              </div>
            ) : (
              <div className="tetris-control-list">
                <span>← / → Move</span>
                <span>↓ Soft drop</span>
                <span>Space Hard drop</span>
                <span>↑ / X Rotate</span>
                <span>Z Counter rotate</span>
                <span>C / Shift Hold</span>
                <span>P Pause</span>
                <span>R Restart</span>
              </div>
            )}
          </section>
        </aside>
      </section>
    </>
  );
}
