import { describe, expect, it } from "vitest";

import { getBestStorageKey, isBetterBest } from "./storage";
import type { LocalBest } from "../_types";

describe("tetris storage helpers", () => {
  const previous: LocalBest = {
    score: 10_000,
    timeMs: 120_000,
    lines: 20,
    createdAt: "2026-05-12T00:00:00.000Z",
  };

  it("uses the daily key only when present", () => {
    expect(getBestStorageKey("marathon", null)).toBe("dopt-tetris-best-marathon");
    expect(getBestStorageKey("daily", "2026-05-12")).toBe("dopt-tetris-best-daily-2026-05-12");
  });

  it("prefers higher scores outside sprint mode", () => {
    expect(isBetterBest("marathon", { ...previous, score: 10_001 }, previous)).toBe(true);
    expect(isBetterBest("marathon", { ...previous, score: 9_999 }, previous)).toBe(false);
  });

  it("prefers lower positive times in sprint mode", () => {
    expect(isBetterBest("sprint", { ...previous, timeMs: 119_000 }, previous)).toBe(true);
    expect(isBetterBest("sprint", { ...previous, timeMs: 0 }, previous)).toBe(false);
    expect(isBetterBest("sprint", { ...previous, timeMs: 121_000 }, previous)).toBe(false);
  });
});
