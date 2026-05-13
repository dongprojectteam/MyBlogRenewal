import type {
  PhaseDualPieceColor,
  PhaseDualPos,
  PhaseDualScoreBreakdown,
} from "./_lib/engine";

export type PhaseDualMode = "campaign" | "daily";
export type PhaseDualAssetLoadState = "loading" | "ready" | "error";
export type PhaseDualAudioAssetKey = "drop" | "break" | "block";

export type PhaseDualScreenPhase =
  | "ready"
  | "tutorial"
  | "playing"
  | "animating"
  | "paused"
  | "completed";

export type PhaseDualLocalBest = {
  score: number;
  moves: number;
  timeMs: number;
  undos: number;
  solvedAt: string;
};

export type PhaseDualProgress = {
  unlockedIds: string[];
  clearedIds: string[];
};

export type PhaseDualHistoryEntry = {
  posA: Record<string, PhaseDualPos | undefined>;
  posB: Record<string, PhaseDualPos | undefined>;
};

export type PhaseDualAnimState = {
  startMs: number;
  durationMs: number;
  color: PhaseDualPieceColor;
  fromA: PhaseDualPos;
  toA: PhaseDualPos;
  fromB?: PhaseDualPos;
  toB?: PhaseDualPos;
};

export type PhaseDualResult = {
  breakdown: PhaseDualScoreBreakdown;
  moves: number;
  timeMs: number;
  undos: number;
};
