"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import {
  LINE_CLEAR_ANIM_MS,
  VISIBLE_HEIGHT,
  VISIBLE_TOP,
  isFinished,
  isPaused,
  type GameState,
} from "tetris-toolkit";

import type { TetrisMode } from "@/types";
import type { LocalBest } from "../_types";
import { buildVisibleCells } from "../_lib/board-rendering";
import { getClearBadges, getClearTitle, getFinishTitle, getPendingClearInfo } from "../_lib/clear-scoring";
import { formatNumber, formatTime } from "../_lib/format";
import { PIECE_COLORS } from "../_lib/modes";

export type BoardProps = {
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

export function Board({
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
