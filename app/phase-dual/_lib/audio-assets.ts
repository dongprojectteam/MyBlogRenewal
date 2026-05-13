import type { PhaseDualAudioAssetKey } from "../_types";

export const PHASE_DUAL_DROP_SOUND_SRC = "/game_assets/phase-dual/audio/drop.ogg";
export const PHASE_DUAL_BREAK_SOUND_SRC = "/game_assets/phase-dual/audio/break.ogg";
export const PHASE_DUAL_BLOCK_SOUND_SRC = "/game_assets/phase-dual/audio/block.ogg";

export const PHASE_DUAL_AUDIO_ASSETS: ReadonlyArray<{
  key: PhaseDualAudioAssetKey;
  src: string;
  volume: number;
  playbackRate?: number;
}> = [
  { key: "drop", src: PHASE_DUAL_DROP_SOUND_SRC, volume: 0.42, playbackRate: 0.9 },
  { key: "break", src: PHASE_DUAL_BREAK_SOUND_SRC, volume: 0.68, playbackRate: 1.05 },
  { key: "block", src: PHASE_DUAL_BLOCK_SOUND_SRC, volume: 0.5, playbackRate: 0.95 },
];
