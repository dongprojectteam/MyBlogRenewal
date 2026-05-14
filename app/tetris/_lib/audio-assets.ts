import type { AudioAssetKey } from "../_types";

export const TETRIS_MUSIC_SRC = "/game_assets/tetris/music/tetris.mp3";
export const TETRIS_DROP_SOUND_SRC = "/game_assets/tetris/audio/drop.ogg";
export const TETRIS_BREAK_SOUND_SRC = "/game_assets/tetris/audio/break.ogg";

export const TETRIS_AUDIO_ASSETS: ReadonlyArray<{
  key: AudioAssetKey;
  src: string;
  volume: number;
  playbackRate?: number;
  loop?: boolean;
}> = [
  { key: "music", src: TETRIS_MUSIC_SRC, volume: 0.46, loop: true },
  { key: "drop", src: TETRIS_DROP_SOUND_SRC, volume: 0.46, playbackRate: 0.72 },
  { key: "lineBreak", src: TETRIS_BREAK_SOUND_SRC, volume: 0.78, playbackRate: 1.08 },
];
