import type { TetrisMode } from "@/types";

export function TetrisModeIcon({ mode }: { mode: TetrisMode }) {
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
