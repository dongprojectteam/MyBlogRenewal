import type { ClearInfo, GameState } from "tetris-toolkit";

import type { TetrisMode, TetrisScore } from "@/types";

import { formatNumber, formatTime } from "./format";

export function getDisplayTime(state: GameState) {
  if (state.phase.kind === "sprintFinished") return state.phase.timeMs;
  if (state.phase.kind === "ultraFinished") return state.phase.timeMs;
  return state.elapsedMs;
}

export function getPrimaryRankValue(score: TetrisScore, mode: TetrisMode) {
  return mode === "sprint" ? formatTime(score.time_ms) : formatNumber(score.score);
}

export function getPhaseLabel(state: GameState, mode: TetrisMode) {
  if (state.phase.kind === "paused") return "Paused";
  if (state.phase.kind === "lineClearAnim") return "Clear";
  if (state.phase.kind === "sprintFinished") return "Sprint Clear";
  if (state.phase.kind === "ultraFinished") return "Time Up";
  if (state.phase.kind === "gameOver") return mode === "survival" ? "Survived" : "Game Over";
  if (state.phase.kind === "playing") return "Playing";
  return "Ready";
}

export function getFinishTitle(state: GameState, mode: TetrisMode) {
  if (state.phase.kind === "sprintFinished") return "40라인 클리어";
  if (state.phase.kind === "ultraFinished") return "2분 종료";
  if (mode === "survival") return "생존 종료";
  if (mode === "daily") return "오늘의 도전 종료";
  return "게임 종료";
}

export function getClearTitle(clear: ClearInfo) {
  if (clear.isPerfectClear) return "PERFECT CLEAR";

  const lineTitle = ["", "SINGLE", "DOUBLE", "TRIPLE", "TETRIS"][clear.lines] ?? `${clear.lines} LINES`;
  if (clear.tSpin === "full") return `T-SPIN ${lineTitle}`;
  if (clear.tSpin === "mini") return clear.lines > 0 ? `MINI T-SPIN ${lineTitle}` : "MINI T-SPIN";
  return lineTitle;
}

export function getClearBadges(clear: ClearInfo) {
  const badges: string[] = [];

  if (clear.isBackToBack) badges.push("Back-to-Back");
  if (clear.combo > 0) badges.push(`${clear.combo + 1} Combo`);
  if (clear.tSpin !== "none") badges.push("T-Spin");

  return badges;
}

export function getBaseClearPoints(clear: Pick<ClearInfo, "lines" | "tSpin">) {
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

export function isDifficultClear(clear: Pick<ClearInfo, "lines" | "tSpin">) {
  return clear.lines === 4 || (clear.tSpin === "full" && clear.lines > 0) || (clear.tSpin === "mini" && clear.lines > 0);
}

export function getPerfectClearBonus(lines: number) {
  if (lines === 1) return 800;
  if (lines === 2) return 1200;
  if (lines === 3) return 1800;
  if (lines === 4) return 2000;
  return 0;
}

export function isPerfectClearAfterRows(state: GameState, rows: readonly number[]) {
  const clearingRows = new Set(rows);
  return state.board.every((row, rowIndex) => clearingRows.has(rowIndex) || row.every((cell) => cell === null));
}

export function getPendingClearInfo(state: GameState): ClearInfo | null {
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
