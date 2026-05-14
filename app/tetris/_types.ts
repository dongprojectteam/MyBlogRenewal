import type { GameMode, PieceKind } from "tetris-toolkit";

import type { TetrisMode } from "@/types";

export type ModeConfig = {
  id: TetrisMode;
  title: string;
  subtitle: string;
  badge: string;
  accentA: string;
  accentB: string;
  engineMode: GameMode;
  startLevel?: number;
  durationMs?: number;
};

export type SessionInfo = {
  seed: number;
  dailyKey: string | null;
  startedAt: number;
};

export type RenderCell = {
  kind: PieceKind | null;
  status: "empty" | "filled" | "ghost" | "active";
  clearing: boolean;
};

export type LocalBest = {
  score: number;
  timeMs: number;
  lines: number;
  createdAt: string;
};

export type AssetLoadState = "loading" | "ready" | "error";
export type AudioAssetKey = "music" | "drop" | "lineBreak";
