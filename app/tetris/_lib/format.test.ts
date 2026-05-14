import { describe, expect, it } from "vitest";

import { formatNumber, formatTime, normalizePlayerName } from "./format";

describe("tetris format helpers", () => {
  it("formats numbers for Korean locale", () => {
    expect(formatNumber(125400)).toBe("125,400");
  });

  it("formats milliseconds as m:ss.cc", () => {
    expect(formatTime(0)).toBe("0:00.00");
    expect(formatTime(65_432)).toBe("1:05.43");
    expect(formatTime(-100)).toBe("0:00.00");
  });

  it("normalizes player names for score submission", () => {
    expect(normalizePlayerName("  DOPT   Player  ")).toBe("DOPT Player");
    expect(normalizePlayerName("abcdefghijklmnopqrstuvwxyz")).toHaveLength(18);
  });
});
