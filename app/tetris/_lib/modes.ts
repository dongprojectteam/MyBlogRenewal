import type { PieceKind } from "tetris-toolkit";

import type { TetrisMode } from "@/types";

import type { ModeConfig } from "../_types";

export const MODES: ModeConfig[] = [
  {
    id: "marathon",
    title: "Marathon",
    badge: "Classic",
    accentA: "#8affc7",
    accentB: "#7ad8ff",
    subtitle: "점수를 쌓으며 오래 버티는 기본 모드",
    engineMode: "marathon",
    startLevel: 1,
  },
  {
    id: "sprint",
    title: "Sprint 40",
    badge: "40 Lines",
    accentA: "#ffd54a",
    accentB: "#ff8f6d",
    subtitle: "40라인을 가장 빠르게 클리어",
    engineMode: "sprint",
  },
  {
    id: "ultra",
    title: "Ultra 2:00",
    badge: "2 Min",
    accentA: "#7ad8ff",
    accentB: "#d6b3ff",
    subtitle: "2분 동안 최대 점수 경쟁",
    engineMode: "ultra",
    durationMs: 120_000,
  },
  {
    id: "survival",
    title: "Survival",
    badge: "Lv 8",
    accentA: "#f5686a",
    accentB: "#ffd54a",
    subtitle: "빠른 중력으로 버티는 고난도 모드",
    engineMode: "marathon",
    startLevel: 8,
  },
  {
    id: "daily",
    title: "Daily",
    badge: "Seeded",
    accentA: "#8affc7",
    accentB: "#f2ff8a",
    subtitle: "오늘의 고정 시드로 전세계 경쟁",
    engineMode: "marathon",
    startLevel: 3,
  },
];

export const PIECE_COLORS: Record<PieceKind, string> = {
  I: "#38d5f5",
  O: "#facc15",
  T: "#c084fc",
  S: "#4ade80",
  Z: "#fb7185",
  J: "#60a5fa",
  L: "#fb923c",
};

export function getModeConfig(mode: TetrisMode) {
  return MODES.find((item) => item.id === mode) ?? MODES[0];
}
