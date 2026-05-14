import { describe, expect, it } from "vitest";

import { TETRIS_AUDIO_ASSETS } from "./audio-assets";

describe("TETRIS_AUDIO_ASSETS", () => {
  it("declares the music and lock effect assets used by the loader", () => {
    expect(TETRIS_AUDIO_ASSETS).toEqual([
      expect.objectContaining({
        key: "music",
        src: "/game_assets/tetris/music/tetris.mp3",
        loop: true,
      }),
      expect.objectContaining({
        key: "drop",
        src: "/game_assets/tetris/audio/drop.ogg",
      }),
      expect.objectContaining({
        key: "lineBreak",
        src: "/game_assets/tetris/audio/break.ogg",
      }),
    ]);
  });
});
