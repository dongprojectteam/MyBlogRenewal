import type { PhaseDualLinkRule } from "@/types";

import type { PhaseDualLocalBest, PhaseDualProgress } from "../_types";

export const PHASE_DUAL_PLAYER_NAME_KEY = "dopt-phase-dual-player-name";
export const PHASE_DUAL_BEST_KEY = "dopt-phase-dual-best-v1";
export const PHASE_DUAL_PROGRESS_KEY = "dopt-phase-dual-progress-v1";
export const PHASE_DUAL_SEEN_RULES_KEY = "dopt-phase-dual-seen-rules-v1";
export const PHASE_DUAL_DEFAULT_PLAYER_NAME = "DOPT";

export function getPhaseDualDailyResultKey(dailyKey: string) {
  return `dopt-phase-dual-daily-${dailyKey}`;
}

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readPhaseDualPlayerName() {
  if (!hasStorage()) return PHASE_DUAL_DEFAULT_PLAYER_NAME;
  try {
    return window.localStorage.getItem(PHASE_DUAL_PLAYER_NAME_KEY) || PHASE_DUAL_DEFAULT_PLAYER_NAME;
  } catch {
    return PHASE_DUAL_DEFAULT_PLAYER_NAME;
  }
}

export function writePhaseDualPlayerName(name: string) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(PHASE_DUAL_PLAYER_NAME_KEY, name);
  } catch {
    /* ignore */
  }
}

export function readPhaseDualBestMap(): Record<string, PhaseDualLocalBest> {
  if (!hasStorage()) return {};
  try {
    const raw = window.localStorage.getItem(PHASE_DUAL_BEST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writePhaseDualBest(puzzleId: string, best: PhaseDualLocalBest) {
  if (!hasStorage()) return;
  try {
    const map = readPhaseDualBestMap();
    const existing = map[puzzleId];
    if (!existing || existing.score < best.score) {
      map[puzzleId] = best;
      window.localStorage.setItem(PHASE_DUAL_BEST_KEY, JSON.stringify(map));
    }
  } catch {
    /* ignore */
  }
}

export function readPhaseDualProgress(): PhaseDualProgress {
  const fallback = { unlockedIds: ["campaign-01"], clearedIds: [] };
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(PHASE_DUAL_PROGRESS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    return {
      unlockedIds: Array.isArray(parsed.unlockedIds) ? parsed.unlockedIds : fallback.unlockedIds,
      clearedIds: Array.isArray(parsed.clearedIds) ? parsed.clearedIds : fallback.clearedIds,
    };
  } catch {
    return fallback;
  }
}

export function writePhaseDualProgress(progress: PhaseDualProgress) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(PHASE_DUAL_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

export function readPhaseDualSeenRules() {
  const seen = new Set<PhaseDualLinkRule>();
  if (!hasStorage()) return seen;
  try {
    const raw = window.localStorage.getItem(PHASE_DUAL_SEEN_RULES_KEY);
    if (!raw) return seen;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seen;
    for (const rule of parsed) seen.add(rule as PhaseDualLinkRule);
    return seen;
  } catch {
    return seen;
  }
}

export function writePhaseDualSeenRule(rule: PhaseDualLinkRule) {
  if (!hasStorage()) return;
  try {
    const seen = readPhaseDualSeenRules();
    seen.add(rule);
    window.localStorage.setItem(PHASE_DUAL_SEEN_RULES_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    /* ignore */
  }
}

export function readPhaseDualDailySubmitted(dailyKey: string) {
  if (!hasStorage()) return false;
  try {
    const raw = window.localStorage.getItem(getPhaseDualDailyResultKey(dailyKey));
    if (!raw) return false;
    return Boolean(JSON.parse(raw)?.submitted);
  } catch {
    return false;
  }
}

export function writePhaseDualDailySubmitted(
  dailyKey: string,
  info: { puzzleId: string; score: number; moves: number; timeMs: number },
) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(
      getPhaseDualDailyResultKey(dailyKey),
      JSON.stringify({ ...info, submitted: true, savedAt: new Date().toISOString() }),
    );
  } catch {
    /* ignore */
  }
}
