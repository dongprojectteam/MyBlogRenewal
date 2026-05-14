import { createEngine, gravityMsPerRow, type Engine } from "tetris-toolkit";

import type { TetrisMode } from "@/types";

import type { SessionInfo } from "../_types";
import { getModeConfig } from "./modes";
import { getTodayKey, randomSeed, seedFromString } from "./seed";

export const INITIAL_STATE = createEngine({ seed: 1 }).getSnapshot();

export function createModeEngine(mode: TetrisMode, seed: number) {
  if (mode !== "survival") {
    return createEngine({ seed });
  }

  return createEngine({
    seed,
    gravity: (level) => {
      const guideline = gravityMsPerRow(level);
      if (guideline <= 0) return 0;
      return Math.max(18, guideline * 0.52 - Math.max(0, level - 8) * 4);
    },
  });
}

export function createPreparedEngine(mode: TetrisMode): { engine: Engine; session: SessionInfo } {
  const dailyKey = mode === "daily" ? getTodayKey() : null;
  const seed = dailyKey ? seedFromString(`dopt-tetris-${dailyKey}`) : randomSeed();
  const engine = createModeEngine(mode, seed);

  engine.configure({
    dasMs: 145,
    arrMs: 38,
    softDropFactor: 22,
  });

  return {
    engine,
    session: {
      seed,
      dailyKey,
      startedAt: 0,
    },
  };
}

export function startPreparedEngine(engine: Engine, mode: TetrisMode, session: SessionInfo): SessionInfo {
  const config = getModeConfig(mode);

  engine.startGame({
    mode: config.engineMode,
    startLevel: config.startLevel,
    durationMs: config.durationMs,
    seed: session.seed,
  });

  return {
    ...session,
    startedAt: Date.now(),
  };
}
