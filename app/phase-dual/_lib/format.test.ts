import { describe, expect, it } from "vitest";

import { formatPhaseDualTime, normalizePhaseDualPlayerName } from "./format";

describe("phase dual formatting", () => {
  it("formats elapsed time as m:ss", () => {
    expect(formatPhaseDualTime(0)).toBe("0:00");
    expect(formatPhaseDualTime(65_200)).toBe("1:05");
  });

  it("normalizes player names for storage and submit", () => {
    expect(normalizePhaseDualPlayerName("  DOPT   Solver  ")).toBe("DOPT Solver");
    expect(normalizePhaseDualPlayerName("abcdefghijklmnopqrst")).toHaveLength(18);
  });
});
