import type { PhaseDualPuzzle } from "./engine";
import { generatePhaseDualCampaignPuzzles, generatePhaseDualDailyPuzzle } from "./puzzle-generator";

export const CAMPAIGN_PUZZLES: PhaseDualPuzzle[] = generatePhaseDualCampaignPuzzles();

export function getCampaignPuzzle(id: string): PhaseDualPuzzle | undefined {
  return CAMPAIGN_PUZZLES.find((puzzle) => puzzle.id === id);
}

function parseDailyPuzzleKey(id: string): string | null {
  const match = /^daily-(\d{4}-\d{2}-\d{2})$/.exec(id);
  return match?.[1] ?? null;
}

export function getDailyPuzzle(id: string): PhaseDualPuzzle | undefined {
  const dailyKey = parseDailyPuzzleKey(id);
  return dailyKey ? generatePhaseDualDailyPuzzle(dailyKey) : undefined;
}

export function getPuzzle(id: string): PhaseDualPuzzle | undefined {
  return getCampaignPuzzle(id) ?? getDailyPuzzle(id);
}

export function getDailyPuzzleByDate(date: Date): PhaseDualPuzzle {
  return generatePhaseDualDailyPuzzle(formatDailyKey(date));
}

export function formatDailyKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isPuzzleId(id: string): boolean {
  return /^campaign-\d{2}$/.test(id) || /^daily-\d{4}-\d{2}-\d{2}$/.test(id);
}
