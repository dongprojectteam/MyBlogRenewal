import { describe, expect, it } from "vitest";

import { PHASE_DUAL_AUDIO_ASSETS } from "./audio-assets";

describe("PHASE_DUAL_AUDIO_ASSETS", () => {
  it("declares the movement, solved-piece, and blocked-move sounds", () => {
    expect(PHASE_DUAL_AUDIO_ASSETS).toEqual([
      expect.objectContaining({
        key: "drop",
        src: "/game_assets/phase-dual/audio/drop.ogg",
      }),
      expect.objectContaining({
        key: "break",
        src: "/game_assets/phase-dual/audio/break.ogg",
      }),
      expect.objectContaining({
        key: "block",
        src: "/game_assets/phase-dual/audio/block.ogg",
      }),
    ]);
  });
});
