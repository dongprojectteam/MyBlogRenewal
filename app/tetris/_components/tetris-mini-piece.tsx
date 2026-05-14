import type { CSSProperties } from "react";
import { getPiecePreview, type PieceKind } from "tetris-toolkit";

import { PIECE_COLORS } from "../_lib/modes";

const PREVIEW_GRID_SIZE = 4;

export function MiniPiece({ kind, label }: { kind: PieceKind | null; label: string }) {
  const preview = kind ? getPiecePreview(kind) : null;
  const centeredCells = preview
    ? preview.cells.map(([x, y]) => {
        const offsetX = Math.floor((PREVIEW_GRID_SIZE - preview.widthCells) / 2);
        const offsetY = Math.floor((PREVIEW_GRID_SIZE - preview.heightCells) / 2);
        return [x - preview.minX + offsetX, y - preview.minY + offsetY] as const;
      })
    : [];
  const occupied = new Set(centeredCells.map(([x, y]) => `${x}:${y}`));
  const activeStyle = kind ? ({ "--piece-color": PIECE_COLORS[kind] } as CSSProperties) : undefined;

  return (
    <div className="tetris-mini-piece" aria-label={label}>
      <div className="tetris-mini-piece-board" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => {
          const x = index % 4;
          const y = Math.floor(index / 4);
          const filled = Boolean(kind && occupied.has(`${x}:${y}`));

          return (
            <span
              key={`${label}-${index}`}
              className={`tetris-cell is-${filled ? "active" : "empty"}`}
              data-kind={filled ? kind?.toLowerCase() : "empty"}
              style={filled ? activeStyle : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
