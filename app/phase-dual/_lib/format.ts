export function formatPhaseDualTime(ms: number) {
  const safeMs = Math.max(0, Math.trunc(ms));
  const minutes = Math.floor(safeMs / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function normalizePhaseDualPlayerName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 18);
}
