import type { Visualization, VisualizationCategory } from "@/types";

export const visualizationCategoryLabels: Record<VisualizationCategory, string> = {
  utility: "Utilities",
  game: "Games",
};

const fallbackGameUrls = new Set(["/tetris", "/sudoku", "/animal-merge"]);

export function normalizeVisualizationCategory(value: FormDataEntryValue | string | null | undefined): VisualizationCategory {
  return value === "game" ? "game" : "utility";
}

export function getVisualizationCategory(item: Pick<Visualization, "url"> & { category?: string | null }): VisualizationCategory {
  if (fallbackGameUrls.has(item.url)) return "game";
  if (item.category === "game" || item.category === "utility") return item.category;
  return "utility";
}
