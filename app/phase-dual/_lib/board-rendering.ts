import type { PhaseDualPieceColor, PhaseDualPiecePosMap, PhaseDualPuzzle, PhaseDualSession } from "./engine";
import type { PhaseDualAnimState } from "../_types";

export const PHASE_DUAL_ANIM_MS = 150;

export const PHASE_DUAL_COLOR_FILL: Record<PhaseDualPieceColor, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  purple: "#a855f7",
  orange: "#f97316",
};

export const PHASE_DUAL_COLOR_STROKE: Record<PhaseDualPieceColor, string> = {
  red: "#dc2626",
  blue: "#2563eb",
  green: "#16a34a",
  yellow: "#ca8a04",
  purple: "#9333ea",
  orange: "#ea580c",
};

export type PhaseDualBoardLayout = {
  dpr: number;
  cssW: number;
  cssH: number;
  cellSize: number;
  gridSize: number;
  gridAX: number;
  gridAY: number;
  gridBX: number;
  gridBY: number;
  boardPx: number;
  badgeCenterX: number;
  badgeCenterY: number;
  isStacked: boolean;
};

export type PhaseDualBoardTheme = {
  panel: string;
  border: string;
  muted: string;
  text: string;
};

export function measurePhaseDualLayout(cssW: number, dpr: number, gridCells: number): PhaseDualBoardLayout {
  const padding = 16;
  const badgeWidth = 112;
  const badgeHeight = 64;
  const gap = 14;
  const isStacked = cssW < 640;
  let cellSize: number;
  let gridAX: number;
  let gridAY: number;
  let gridBX: number;
  let gridBY: number;
  let boardPx: number;
  let badgeCenterX: number;
  let badgeCenterY: number;

  if (isStacked) {
    const availableW = cssW - padding * 2;
    boardPx = Math.min(availableW, 320);
    cellSize = boardPx / gridCells;
    gridAX = (cssW - boardPx) / 2;
    gridBX = gridAX;
    gridAY = padding;
    gridBY = padding + boardPx + badgeHeight + gap * 2;
    badgeCenterX = cssW / 2;
    badgeCenterY = gridAY + boardPx + gap + badgeHeight / 2;
  } else {
    const availableW = cssW - padding * 2 - badgeWidth - gap * 2;
    boardPx = Math.min(availableW / 2, 320);
    cellSize = boardPx / gridCells;
    gridAX = padding;
    gridBX = padding + boardPx + gap + badgeWidth + gap;
    gridAY = padding;
    gridBY = padding;
    badgeCenterX = gridAX + boardPx + gap + badgeWidth / 2;
    badgeCenterY = gridAY + boardPx / 2;
  }

  const bottom = isStacked ? gridBY + boardPx + 16 : gridAY + boardPx + 16;
  return {
    dpr,
    cssW,
    cssH: bottom,
    cellSize,
    gridSize: gridCells,
    gridAX,
    gridAY,
    gridBX,
    gridBY,
    boardPx,
    badgeCenterX,
    badgeCenterY,
    isStacked,
  };
}

export function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function drawPhaseDualBoard(
  ctx: CanvasRenderingContext2D,
  session: PhaseDualSession,
  layout: PhaseDualBoardLayout,
  selected: PhaseDualPieceColor | null,
  animState: PhaseDualAnimState | null,
  now: number,
  theme: PhaseDualBoardTheme,
  shake: { active: boolean; ms: number },
) {
  const { dpr, cssW, cssH, cellSize, gridSize, gridAX, gridAY, gridBX, gridBY, boardPx } = layout;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  let shakeDx = 0;
  if (shake.active) {
    const t = Math.min(1, (now - shake.ms) / 240);
    if (t < 1) {
      const amp = (1 - t) * 4;
      shakeDx = Math.sin(t * Math.PI * 8) * amp;
    }
  }

  const drawGrid = (
    baseX: number,
    baseY: number,
    grid: PhaseDualSession["gridA"],
    positions: PhaseDualPiecePosMap,
    pieces: PhaseDualPuzzle["gridA"]["pieces"],
    isGridA: boolean,
  ) => {
    ctx.save();
    if (shakeDx !== 0 && isGridA) ctx.translate(shakeDx, 0);

    ctx.fillStyle = theme.panel;
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1;
    roundRect(ctx, baseX - 4, baseY - 4, boardPx + 8, boardPx + 8, 8, true, true);

    ctx.save();
    ctx.fillStyle = theme.muted;
    ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(isGridA ? "Grid A" : "Grid B", baseX, baseY - 8);
    ctx.restore();

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const x = baseX + c * cellSize;
        const y = baseY + r * cellSize;
        const cell = grid[r][c];

        ctx.fillStyle = "rgba(255,255,255,0.02)";
        ctx.fillRect(x, y, cellSize, cellSize);

        if (cell.isWall) {
          ctx.fillStyle = theme.muted;
          ctx.globalAlpha = 0.55;
          ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
          ctx.globalAlpha = 1;
        }

        ctx.strokeStyle = theme.border;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize, cellSize);
        ctx.globalAlpha = 1;
      }
    }

    for (const piece of pieces) {
      const tx = baseX + piece.targetCol * cellSize;
      const ty = baseY + piece.targetRow * cellSize;
      const pad = cellSize * 0.16;
      const fill = PHASE_DUAL_COLOR_FILL[piece.color];
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = fill;
      ctx.fillRect(tx + pad, ty + pad, cellSize - pad * 2, cellSize - pad * 2);
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = fill;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.4;
      ctx.strokeRect(tx + pad, ty + pad, cellSize - pad * 2, cellSize - pad * 2);
      ctx.setLineDash([]);
      ctx.restore();
    }

    const animColor = animState?.color ?? null;
    for (const piece of pieces) {
      const pos = positions[piece.color];
      if (!pos || (animState && animColor === piece.color)) continue;
      drawPhaseDualPiece(
        ctx,
        baseX,
        baseY,
        pos.row,
        pos.col,
        cellSize,
        piece.color,
        isGridA && selected === piece.color,
        piece.targetRow === pos.row && piece.targetCol === pos.col,
      );
    }

    if (animState && (isGridA ? animState.fromA && animState.toA : animState.fromB && animState.toB)) {
      const t = animState.durationMs <= 0 ? 1 : Math.min(1, Math.max(0, (now - animState.startMs) / animState.durationMs));
      const eased = easeOutCubic(t);
      const from = isGridA ? animState.fromA : animState.fromB;
      const to = isGridA ? animState.toA : animState.toB;
      if (from && to) {
        const r = from.row + (to.row - from.row) * eased;
        const c = from.col + (to.col - from.col) * eased;
        drawPhaseDualPiece(ctx, baseX, baseY, r, c, cellSize, animState.color, false, false);
      }
    }

    ctx.restore();
  };

  drawGrid(gridAX, gridAY, session.gridA, session.posA, session.puzzle.gridA.pieces, true);
  drawGrid(gridBX, gridBY, session.gridB, session.posB, session.puzzle.gridB.pieces, false);
  ctx.restore();
}

export function drawPhaseDualPiece(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  row: number,
  col: number,
  cellSize: number,
  color: PhaseDualPieceColor,
  isSelected: boolean,
  isSettled: boolean,
) {
  const pad = cellSize * 0.12;
  const x = baseX + col * cellSize + pad;
  const y = baseY + row * cellSize + pad;
  const w = cellSize - pad * 2;

  if (isSettled) {
    ctx.save();
    ctx.shadowColor = PHASE_DUAL_COLOR_FILL[color];
    ctx.shadowBlur = 14;
    ctx.fillStyle = PHASE_DUAL_COLOR_FILL[color];
    roundRect(ctx, x, y, w, w, 6, true, false);
    ctx.restore();
  } else {
    ctx.fillStyle = PHASE_DUAL_COLOR_FILL[color];
    roundRect(ctx, x, y, w, w, 6, true, false);
  }

  ctx.strokeStyle = PHASE_DUAL_COLOR_STROKE[color];
  ctx.lineWidth = isSelected ? 3 : 1.5;
  roundRect(ctx, x, y, w, w, 6, false, true);

  if (isSelected) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, x - 2, y - 2, w + 4, w + 4, 8, false, true);
    ctx.restore();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: boolean,
  stroke: boolean,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

export function readPhaseDualTheme(el: HTMLElement): PhaseDualBoardTheme {
  const cs = window.getComputedStyle(el);
  const get = (name: string, fallback: string) => {
    const value = cs.getPropertyValue(name).trim();
    return value.length > 0 ? value : fallback;
  };
  return {
    panel: get("--panel", "rgba(15,23,42,0.85)"),
    border: get("--border", "rgba(148,163,184,0.25)"),
    muted: get("--muted", "rgba(100,116,139,0.5)"),
    text: get("--text", "#e2e8f0"),
  };
}
