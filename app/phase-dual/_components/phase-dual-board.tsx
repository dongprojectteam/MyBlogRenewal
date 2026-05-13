"use client";

import { type ReactNode, useCallback, useEffect, useRef } from "react";

import type { PhaseDualAnimState } from "../_types";
import {
  drawPhaseDualBoard,
  measurePhaseDualLayout,
  readPhaseDualTheme,
  type PhaseDualBoardLayout,
  type PhaseDualBoardTheme,
} from "../_lib/board-rendering";
import type { PhaseDualPieceColor, PhaseDualSession } from "../_lib/engine";

type PhaseDualBoardProps = {
  session: PhaseDualSession | null;
  selected: PhaseDualPieceColor | null;
  animState: PhaseDualAnimState | null;
  shake: { active: boolean; ms: number };
  disabled: boolean;
  onSelectColor: (color: PhaseDualPieceColor | null) => void;
  children?: ReactNode;
};

const fallbackTheme: PhaseDualBoardTheme = {
  panel: "rgba(15,23,42,0.85)",
  border: "rgba(148,163,184,0.25)",
  muted: "rgba(100,116,139,0.5)",
  text: "#e2e8f0",
};

export function PhaseDualBoard({
  session,
  selected,
  animState,
  shake,
  disabled,
  onSelectColor,
  children,
}: PhaseDualBoardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layoutRef = useRef<PhaseDualBoardLayout | null>(null);
  const themeRef = useRef<PhaseDualBoardTheme>(fallbackTheme);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      if (!session) return;
      const rect = container.getBoundingClientRect();
      const style = window.getComputedStyle(container);
      const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
      const paddingTop = Number.parseFloat(style.paddingTop) || 0;
      const paddingX = paddingLeft + (Number.parseFloat(style.paddingRight) || 0);
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const cssW = Math.max(280, rect.width - paddingX);
      const layout = measurePhaseDualLayout(cssW, dpr, session.puzzle.gridSize);
      layoutRef.current = layout;
      themeRef.current = readPhaseDualTheme(container);
      container.style.setProperty("--phase-dual-badge-x", `${paddingLeft + layout.badgeCenterX}px`);
      container.style.setProperty("--phase-dual-badge-y", `${paddingTop + layout.badgeCenterY}px`);
      canvas.width = Math.floor(layout.cssW * dpr);
      canvas.height = Math.floor(layout.cssH * dpr);
      canvas.style.width = `${layout.cssW}px`;
      canvas.style.height = `${layout.cssH}px`;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [session]);

  const drawNow = useCallback(() => {
    const canvas = canvasRef.current;
    const layout = layoutRef.current;
    if (!canvas || !layout || !session) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawPhaseDualBoard(ctx, session, layout, selected, animState, performance.now(), themeRef.current, shake);
  }, [session, selected, animState, shake]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      drawNow();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [drawNow]);

  const onCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!session || disabled || !canvasRef.current || !layoutRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const layout = layoutRef.current;

    const hitGrid = (gridX: number, gridY: number, grid: PhaseDualSession["gridA"]) => {
      const inGrid =
        x >= gridX &&
        x < gridX + layout.boardPx &&
        y >= gridY &&
        y < gridY + layout.boardPx;
      if (!inGrid) return false;

      const col = Math.floor((x - gridX) / layout.cellSize);
      const row = Math.floor((y - gridY) / layout.cellSize);
      const cell = grid[row]?.[col];
      onSelectColor(cell?.pieceColor ?? null);
      return true;
    };

    if (hitGrid(layout.gridAX, layout.gridAY, session.gridA)) return;
    if (hitGrid(layout.gridBX, layout.gridBY, session.gridB)) return;
    onSelectColor(null);
  };

  return (
    <div className="phase-dual-canvas-wrap" ref={containerRef}>
      <canvas ref={canvasRef} onClick={onCanvasClick} className="phase-dual-canvas" aria-label="Phase Dual 게임 보드" />
      {children}
    </div>
  );
}
