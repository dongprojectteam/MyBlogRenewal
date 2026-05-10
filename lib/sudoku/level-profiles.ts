import type { SudokuLevelId } from "@/types";

/** Passed to the generator worker (single source of truth for difficulty). */
export type SudokuGeneratorProfile = {
  /** Successful cell removals (unique solution preserved). */
  maxRemovals: number;
  /** Budget for failed removal tries (uniqueness broken). */
  removalAttempts: number;
  /** Full board regeneration rounds if carving stalls. */
  fullRegenerateRounds: number;
};

export type SudokuLevelConfig = SudokuGeneratorProfile & {
  title: string;
  subtitle: string;
};

const LEVELS: SudokuLevelConfig[] = [
  { title: "Level 1", subtitle: "입문 — 힌트가 많은 편", maxRemovals: 24, removalAttempts: 120, fullRegenerateRounds: 10 },
  { title: "Level 2", subtitle: "쉬움", maxRemovals: 28, removalAttempts: 140, fullRegenerateRounds: 11 },
  { title: "Level 3", subtitle: "편안함", maxRemovals: 32, removalAttempts: 160, fullRegenerateRounds: 12 },
  { title: "Level 4", subtitle: "표준", maxRemovals: 36, removalAttempts: 185, fullRegenerateRounds: 13 },
  { title: "Level 5", subtitle: "약간 도전", maxRemovals: 40, removalAttempts: 210, fullRegenerateRounds: 14 },
  { title: "Level 6", subtitle: "중급", maxRemovals: 43, removalAttempts: 235, fullRegenerateRounds: 15 },
  { title: "Level 7", subtitle: "집중", maxRemovals: 46, removalAttempts: 260, fullRegenerateRounds: 16 },
  { title: "Level 8", subtitle: "상급", maxRemovals: 49, removalAttempts: 290, fullRegenerateRounds: 18 },
  { title: "Level 9", subtitle: "어려움", maxRemovals: 51, removalAttempts: 320, fullRegenerateRounds: 20 },
  { title: "Level 10", subtitle: "마스터", maxRemovals: 54, removalAttempts: 360, fullRegenerateRounds: 24 },
];

export function isSudokuLevelId(value: number): value is SudokuLevelId {
  return Number.isInteger(value) && value >= 1 && value <= 10;
}

export function getSudokuLevelConfig(levelId: SudokuLevelId): SudokuLevelConfig {
  return LEVELS[levelId - 1] ?? LEVELS[0];
}

export function getSudokuGeneratorProfile(levelId: SudokuLevelId): SudokuGeneratorProfile {
  const c = getSudokuLevelConfig(levelId);
  return {
    maxRemovals: c.maxRemovals,
    removalAttempts: c.removalAttempts,
    fullRegenerateRounds: c.fullRegenerateRounds,
  };
}

export const SUDOKU_LEVEL_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const satisfies readonly SudokuLevelId[];
