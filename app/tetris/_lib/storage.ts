import type { TetrisMode } from "@/types";

import type { LocalBest } from "../_types";

export const PLAYER_NAME_KEY = "dopt-tetris-player-name";
export const MUSIC_ENABLED_KEY = "dopt-tetris-music-enabled";
export const DEFAULT_PLAYER_NAME = "DOPT";

export function getBestStorageKey(mode: TetrisMode, dailyKey: string | null) {
  return `dopt-tetris-best-${mode}${dailyKey ? `-${dailyKey}` : ""}`;
}

export function isBetterBest(mode: TetrisMode, candidate: LocalBest, previous: LocalBest | null) {
  if (!previous) return true;
  if (mode === "sprint") return candidate.timeMs > 0 && candidate.timeMs < previous.timeMs;
  return candidate.score > previous.score;
}

export function readLocalBest(mode: TetrisMode, dailyKey: string | null): LocalBest | null {
  try {
    const raw = window.localStorage.getItem(getBestStorageKey(mode, dailyKey));
    return raw ? (JSON.parse(raw) as LocalBest) : null;
  } catch {
    return null;
  }
}
