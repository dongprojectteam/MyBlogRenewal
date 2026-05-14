import { describe, expect, it } from "vitest";

import { MODES, getModeConfig } from "./modes";

describe("tetris mode config", () => {
  it("exposes the expected game modes", () => {
    expect(MODES.map((mode) => mode.id)).toEqual(["marathon", "sprint", "ultra", "survival", "daily"]);
  });

  it("falls back to marathon for unknown mode values", () => {
    expect(getModeConfig("daily").title).toBe("Daily");
    expect(getModeConfig("unknown" as never).id).toBe("marathon");
  });
});
