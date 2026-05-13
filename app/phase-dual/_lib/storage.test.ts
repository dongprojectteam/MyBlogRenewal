import { beforeEach, describe, expect, it } from "vitest";

import {
  PHASE_DUAL_DEFAULT_PLAYER_NAME,
  readPhaseDualBestMap,
  readPhaseDualDailySubmitted,
  readPhaseDualPlayerName,
  readPhaseDualProgress,
  readPhaseDualSeenRules,
  writePhaseDualBest,
  writePhaseDualDailySubmitted,
  writePhaseDualPlayerName,
  writePhaseDualProgress,
  writePhaseDualSeenRule,
} from "./storage";

describe("phase dual storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("uses a stable default player name", () => {
    expect(readPhaseDualPlayerName()).toBe(PHASE_DUAL_DEFAULT_PLAYER_NAME);
    writePhaseDualPlayerName("Linker");
    expect(readPhaseDualPlayerName()).toBe("Linker");
  });

  it("keeps only better local best scores", () => {
    writePhaseDualBest("campaign-01", { score: 1200, moves: 5, timeMs: 50_000, undos: 1, solvedAt: "a" });
    writePhaseDualBest("campaign-01", { score: 1100, moves: 4, timeMs: 40_000, undos: 0, solvedAt: "b" });
    writePhaseDualBest("campaign-01", { score: 1300, moves: 4, timeMs: 40_000, undos: 0, solvedAt: "c" });

    expect(readPhaseDualBestMap()["campaign-01"].score).toBe(1300);
  });

  it("round-trips progress, seen rules, and daily submission flags", () => {
    writePhaseDualProgress({ unlockedIds: ["campaign-01", "campaign-02"], clearedIds: ["campaign-01"] });
    expect(readPhaseDualProgress()).toEqual({
      unlockedIds: ["campaign-01", "campaign-02"],
      clearedIds: ["campaign-01"],
    });

    writePhaseDualSeenRule("mirror_h");
    expect(readPhaseDualSeenRules().has("mirror_h")).toBe(true);

    expect(readPhaseDualDailySubmitted("2026-05-12")).toBe(false);
    writePhaseDualDailySubmitted("2026-05-12", {
      puzzleId: "daily-23",
      score: 1500,
      moves: 4,
      timeMs: 40_000,
    });
    expect(readPhaseDualDailySubmitted("2026-05-12")).toBe(true);
  });
});
