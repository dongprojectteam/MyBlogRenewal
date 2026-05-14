"use client";

import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from "react";

type SourceKind = "auto" | "csv" | "tsv" | "json";
type ChartType = "bar3d" | "line3d";
type PaletteId = "aurora" | "editorial" | "citrus" | "velvet";

type ChartSeries = {
  name: string;
  values: Array<number | null>;
};

type ChartDataset = {
  categories: string[];
  series: ChartSeries[];
  warnings: string[];
};

type ChartParseResult = {
  detected: Exclude<SourceKind, "auto">;
  dataset: ChartDataset | null;
  error: string;
  warnings: string[];
};

type ChartSettings = {
  chartType: ChartType;
  title: string;
  xLabel: string;
  yLabel: string;
  paletteId: PaletteId;
  depth: number;
  perspective: number;
  glow: number;
  showLegend: boolean;
  showValueLabels: boolean;
  showGrid: boolean;
  smoothLines: boolean;
  showPoints: boolean;
};

type Palette = {
  id: PaletteId;
  name: string;
  colors: string[];
};

type PlotBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
};

type Point = {
  x: number;
  y: number;
};

const MAX_FILE_BYTES = 2 * 1024 * 1024;

const SOURCE_OPTIONS: Array<{ value: SourceKind; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "csv", label: "CSV" },
  { value: "tsv", label: "TSV" },
  { value: "json", label: "JSON" },
];

const CHART_OPTIONS: Array<{ value: ChartType; label: string }> = [
  { value: "bar3d", label: "3D Bar" },
  { value: "line3d", label: "3D Line" },
];

const PALETTES: Palette[] = [
  {
    id: "aurora",
    name: "Aurora",
    colors: ["#40c9a2", "#f8d66d", "#f76f8e", "#76a9ff", "#b08cff", "#ff9f4a", "#65d6ff", "#a7f070"],
  },
  {
    id: "editorial",
    name: "Editorial",
    colors: ["#f97316", "#14b8a6", "#eab308", "#3b82f6", "#ef4444", "#22c55e", "#a855f7", "#f43f5e"],
  },
  {
    id: "citrus",
    name: "Citrus",
    colors: ["#facc15", "#22c55e", "#06b6d4", "#fb7185", "#f97316", "#84cc16", "#38bdf8", "#c084fc"],
  },
  {
    id: "velvet",
    name: "Velvet",
    colors: ["#c084fc", "#fb7185", "#f59e0b", "#2dd4bf", "#60a5fa", "#a3e635", "#f472b6", "#fcd34d"],
  },
];

const SAMPLE_DATASETS = [
  {
    id: "growth",
    label: "Studio Growth",
    chartType: "line3d" as const,
    source: [
      "Quarter,Design,Engineering,Marketing",
      "Q1,42,35,28",
      "Q2,58,46,34",
      "Q3,74,63,51",
      "Q4,96,81,66",
      "Q5,124,104,79",
      "Q6,148,132,94",
    ].join("\n"),
  },
  {
    id: "portfolio",
    label: "Portfolio Mix",
    chartType: "bar3d" as const,
    source: [
      "Category,Revenue,Margin,Reach",
      "Utilities,128,48,82",
      "Games,94,39,76",
      "Docs,68,28,55",
      "Creative,116,51,88",
      "Research,73,35,61",
    ].join("\n"),
  },
  {
    id: "json",
    label: "JSON Sample",
    chartType: "line3d" as const,
    source: JSON.stringify(
      [
        { month: "Jan", active: 22, returning: 12, trial: 7 },
        { month: "Feb", active: 34, returning: 19, trial: 11 },
        { month: "Mar", active: 49, returning: 26, trial: 16 },
        { month: "Apr", active: 61, returning: 38, trial: 22 },
        { month: "May", active: 79, returning: 44, trial: 31 },
      ],
      null,
      2,
    ),
  },
];

const INITIAL_SOURCE = SAMPLE_DATASETS[0].source;

function detectSourceKind(source: string): Exclude<SourceKind, "auto"> {
  const trimmed = source.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return "json";
  const tabCount = (source.match(/\t/g) ?? []).length;
  const commaCount = (source.match(/,/g) ?? []).length;
  return tabCount > commaCount ? "tsv" : "csv";
}

function parseDelimited(source: string, delimiter: "," | "\t") {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && character === delimiter) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  if (quoted) {
    throw new Error("Quoted cell is not closed.");
  }

  row.push(cell.trim());
  rows.push(row);

  return rows.filter((item) => item.some((cellValue) => cellValue.length > 0));
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const isWrappedNegative = /^\(.+\)$/.test(trimmed);
  const cleaned = trimmed
    .replace(/,/g, "")
    .replace(/[^\d.+\-eE]/g, "")
    .replace(/(?!^)-/g, "");

  if (!cleaned || cleaned === "." || cleaned === "-" || cleaned === "+") return null;

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return isWrappedNegative ? -Math.abs(parsed) : parsed;
}

function makeUniqueName(value: string, index: number, used: Set<string>) {
  const base = value.trim() || `Series ${index + 1}`;
  let candidate = base;
  let suffix = 2;

  while (used.has(candidate)) {
    candidate = `${base} ${suffix}`;
    suffix += 1;
  }

  used.add(candidate);
  return candidate;
}

function rowsToDataset(rows: string[][]): ChartDataset {
  const warnings: string[] = [];
  if (rows.length < 2) {
    throw new Error("Add a header row and at least one data row.");
  }

  const width = Math.max(...rows.map((row) => row.length));
  const normalizedRows = rows.map((row, index) => {
    if (row.length !== width) {
      warnings.push(`Row ${index + 1} has ${row.length} cells; padded to ${width}.`);
    }
    return Array.from({ length: width }, (_, cellIndex) => row[cellIndex] ?? "");
  });

  const header = normalizedRows[0];
  if (header.length < 2) {
    throw new Error("The first row needs one category column and at least one numeric series column.");
  }

  const dataRows = normalizedRows.slice(1).filter((row) => row.some((cell) => cell.trim()));
  if (dataRows.length === 0) {
    throw new Error("No data rows found.");
  }

  const categories = dataRows.map((row, index) => row[0]?.trim() || `Row ${index + 1}`);
  const usedNames = new Set<string>();
  const rawSeries = header.slice(1).map((name, index) => ({
    name: makeUniqueName(name, index, usedNames),
    values: dataRows.map((row, rowIndex) => {
      const rawValue = row[index + 1] ?? "";
      const value = normalizeNumber(rawValue);
      if (value === null && rawValue.trim()) {
        warnings.push(`Cell ${rowIndex + 2}:${index + 2} is not numeric and will be treated as a gap.`);
      }
      return value;
    }),
  }));

  const series = rawSeries.filter((item) => {
    const hasValue = item.values.some((value) => value !== null);
    if (!hasValue) {
      warnings.push(`${item.name} was removed because it has no numeric values.`);
    }
    return hasValue;
  });

  if (series.length === 0) {
    throw new Error("No numeric series found. Keep the first column as labels and add numeric values after it.");
  }

  if (categories.length > 40) {
    warnings.push("Large datasets render, but labels are thinned for readability.");
  }

  if (series.length > 8) {
    warnings.push("More than 8 series can make the chart crowded.");
  }

  return {
    categories,
    series,
    warnings: Array.from(new Set(warnings)),
  };
}

function valueLooksNumeric(value: unknown) {
  return normalizeNumber(value) !== null;
}

function objectRowsToDataset(items: Array<Record<string, unknown>>): ChartDataset {
  const keys = Array.from(
    items.reduce((set, item) => {
      Object.keys(item).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  if (keys.length < 2) {
    throw new Error("JSON objects need one label key and at least one numeric key.");
  }

  const preferredLabelKeys = ["category", "label", "name", "month", "date", "quarter", "x"];
  const categoryKey =
    preferredLabelKeys.find((key) => keys.includes(key)) ??
    keys.find((key) => items.some((item) => !valueLooksNumeric(item[key]) && item[key] !== undefined)) ??
    keys[0];

  const numericKeys = keys.filter(
    (key) => key !== categoryKey && items.some((item) => valueLooksNumeric(item[key])),
  );

  if (numericKeys.length === 0) {
    throw new Error("JSON objects did not include numeric series keys.");
  }

  const rows = [
    [categoryKey, ...numericKeys],
    ...items.map((item, index) => [
      String(item[categoryKey] ?? `Row ${index + 1}`),
      ...numericKeys.map((key) => String(item[key] ?? "")),
    ]),
  ];

  return rowsToDataset(rows);
}

function arrayRowsToDataset(items: unknown[][]): ChartDataset {
  if (items.length < 1) {
    throw new Error("JSON array is empty.");
  }

  const rows = items.map((row) => row.map((cell) => String(cell ?? "")));
  const firstRow = rows[0] ?? [];
  const restRows = rows.slice(1);
  const firstLooksLikeHeader =
    firstRow.length > 1 &&
    firstRow.slice(1).every((cell) => normalizeNumber(cell) === null) &&
    restRows.some((row) => row.slice(1).some((cell) => normalizeNumber(cell) !== null));

  if (firstLooksLikeHeader) return rowsToDataset(rows);

  const maxWidth = Math.max(...rows.map((row) => row.length));
  const headers = ["Category", ...Array.from({ length: Math.max(1, maxWidth - 1) }, (_, index) => `Series ${index + 1}`)];
  return rowsToDataset([headers, ...rows]);
}

function parseJsonData(source: string): ChartDataset {
  const parsed = JSON.parse(source) as unknown;
  const data =
    typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) && Array.isArray(Reflect.get(parsed, "data"))
      ? Reflect.get(parsed, "data")
      : parsed;

  if (!Array.isArray(data)) {
    throw new Error("JSON input must be an array, or an object with a data array.");
  }

  if (data.length === 0) {
    throw new Error("JSON array is empty.");
  }

  if (data.every((item) => Array.isArray(item))) {
    return arrayRowsToDataset(data as unknown[][]);
  }

  if (data.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))) {
    return objectRowsToDataset(data as Array<Record<string, unknown>>);
  }

  throw new Error("JSON rows must be all objects or all arrays.");
}

function parseChartData(source: string, sourceKind: SourceKind): ChartParseResult {
  const detected = sourceKind === "auto" ? detectSourceKind(source) : sourceKind;

  if (!source.trim()) {
    return {
      detected,
      dataset: null,
      error: "Enter chart data or import a CSV, TSV, or JSON file.",
      warnings: [],
    };
  }

  try {
    const dataset =
      detected === "json"
        ? parseJsonData(source)
        : rowsToDataset(parseDelimited(source, detected === "tsv" ? "\t" : ","));

    return {
      detected,
      dataset,
      error: "",
      warnings: dataset.warnings,
    };
  } catch (error) {
    return {
      detected,
      dataset: null,
      error: error instanceof Error ? error.message : "Unable to parse data.",
      warnings: [],
    };
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized.length === 3 ? normalized.replace(/(.)/g, "$1$1") : normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgba(hex: string, alpha: number) {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function shade(hex: string, amount: number) {
  const rgb = hexToRgb(hex);
  const next = {
    r: clamp(rgb.r + amount, 0, 255),
    g: clamp(rgb.g + amount, 0, 255),
    b: clamp(rgb.b + amount, 0, 255),
  };
  return `rgb(${next.r}, ${next.g}, ${next.b})`;
}

function formatValue(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (abs % 1 !== 0) return value.toFixed(1);
  return String(value);
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(1, maxLength - 1))}...`;
}

function makeRange(dataset: ChartDataset) {
  const values = dataset.series.flatMap((series) => series.values).filter((value): value is number => value !== null);
  if (values.length === 0) return { min: 0, max: 1 };

  let min = Math.min(0, ...values);
  let max = Math.max(0, ...values);

  if (min === max) {
    if (min === 0) return { min: 0, max: 1 };
    const pad = Math.abs(min) * 0.2;
    return { min: min - pad, max: max + pad };
  }

  const pad = (max - min) * 0.1;
  min = min < 0 ? min - pad : 0;
  max += pad;

  return { min, max };
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawEmptyState(ctx: CanvasRenderingContext2D, width: number, height: number, message: string) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#07111f");
  gradient.addColorStop(1, "#131b2f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, 28, 28, width - 56, height - 56, 20);
  ctx.stroke();

  ctx.fillStyle = "#e5eef8";
  ctx.font = "700 24px Segoe UI, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Chart preview", width / 2, height / 2 - 14);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px Segoe UI, Arial, sans-serif";
  ctx.fillText(truncate(message, 76), width / 2, height / 2 + 18);
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  fillStyle: string | CanvasGradient | CanvasPattern,
  strokeStyle?: string,
) {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
}

function drawPath(ctx: CanvasRenderingContext2D, points: Point[], smooth: boolean) {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (!smooth || points.length < 3) {
    points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    return;
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;
    const control1 = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    };
    const control2 = {
      x: next.x - (afterNext.x - current.x) / 6,
      y: next.y - (afterNext.y - current.y) / 6,
    };
    ctx.bezierCurveTo(control1.x, control1.y, control2.x, control2.y, next.x, next.y);
  }
}

function getPlotBox(width: number, height: number, settings: ChartSettings): PlotBox {
  const compact = width < 760;
  const left = compact ? 58 : 82;
  const right = compact ? 32 : settings.showLegend ? 178 : 42;
  const top = compact ? 84 : 92;
  const bottom = compact ? (settings.showLegend ? 128 : 94) : 90;

  return {
    left,
    right: width - right,
    top,
    bottom: height - bottom,
    width: Math.max(40, width - left - right),
    height: Math.max(40, height - top - bottom),
  };
}

function drawChartSurface(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  plot: PlotBox,
  settings: ChartSettings,
  range: { min: number; max: number },
) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#07111f");
  gradient.addColorStop(0.52, "#101827");
  gradient.addColorStop(1, "#172033");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const depthX = settings.depth;
  const depthY = -settings.depth * (settings.perspective / 100);

  const floorGradient = ctx.createLinearGradient(plot.left, plot.bottom, plot.right + depthX, plot.bottom + depthY);
  floorGradient.addColorStop(0, "rgba(20, 184, 166, 0.14)");
  floorGradient.addColorStop(0.5, "rgba(59, 130, 246, 0.09)");
  floorGradient.addColorStop(1, "rgba(244, 114, 182, 0.12)");
  drawPolygon(
    ctx,
    [
      { x: plot.left, y: plot.bottom },
      { x: plot.right, y: plot.bottom },
      { x: plot.right + depthX, y: plot.bottom + depthY },
      { x: plot.left + depthX, y: plot.bottom + depthY },
    ],
    floorGradient,
    "rgba(148, 163, 184, 0.22)",
  );

  if (settings.showGrid) {
    ctx.strokeStyle = "rgba(203, 213, 225, 0.14)";
    ctx.lineWidth = 1;
    const tickCount = 5;
    for (let index = 0; index <= tickCount; index += 1) {
      const ratio = index / tickCount;
      const y = plot.bottom - ratio * plot.height;
      ctx.beginPath();
      ctx.moveTo(plot.left, y);
      ctx.lineTo(plot.right, y);
      ctx.lineTo(plot.right + depthX, y + depthY);
      ctx.stroke();

      const value = range.min + (range.max - range.min) * ratio;
      ctx.fillStyle = "rgba(203, 213, 225, 0.72)";
      ctx.font = "12px Segoe UI, Arial, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(formatValue(value), plot.left - 10, y);
    }
  }

  ctx.strokeStyle = "rgba(226, 232, 240, 0.65)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(plot.left, plot.top);
  ctx.lineTo(plot.left, plot.bottom);
  ctx.lineTo(plot.right, plot.bottom);
  ctx.stroke();

  const zeroY = plot.bottom - ((0 - range.min) / (range.max - range.min)) * plot.height;
  if (zeroY > plot.top && zeroY < plot.bottom) {
    ctx.strokeStyle = "rgba(248, 214, 109, 0.45)";
    ctx.beginPath();
    ctx.moveTo(plot.left, zeroY);
    ctx.lineTo(plot.right, zeroY);
    ctx.stroke();
  }
}

function drawLabelsAndLegend(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  plot: PlotBox,
  dataset: ChartDataset,
  palette: Palette,
  settings: ChartSettings,
) {
  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 22px Segoe UI, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(truncate(settings.title || "Untitled chart", width < 620 ? 28 : 48), width / 2, 24);

  ctx.fillStyle = "rgba(203, 213, 225, 0.82)";
  ctx.font = "12px Segoe UI, Arial, sans-serif";
  ctx.fillText(settings.xLabel, (plot.left + plot.right) / 2, height - 36);

  ctx.save();
  ctx.translate(24, (plot.top + plot.bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText(settings.yLabel, 0, 0);
  ctx.restore();

  const maxLabels = width < 700 ? 6 : 10;
  const step = Math.max(1, Math.ceil(dataset.categories.length / maxLabels));
  const barCategoryStep = plot.width / Math.max(1, dataset.categories.length);

  ctx.fillStyle = "rgba(203, 213, 225, 0.82)";
  ctx.font = "12px Segoe UI, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  dataset.categories.forEach((category, index) => {
    if (index % step !== 0 && index !== dataset.categories.length - 1) return;
    const x =
      settings.chartType === "line3d"
        ? plot.left +
          (dataset.categories.length <= 1 ? plot.width / 2 : (plot.width * index) / (dataset.categories.length - 1))
        : plot.left + barCategoryStep * index + barCategoryStep / 2;
    ctx.fillText(truncate(category, width < 700 ? 8 : 12), x, plot.bottom + 18);
  });

  if (!settings.showLegend) return;

  const compact = width < 760;
  const legendX = compact ? plot.left : plot.right + 28;
  const legendY = compact ? height - 88 : plot.top + 8;
  const columnWidth = compact ? Math.max(120, (plot.right - plot.left) / 2) : 132;

  ctx.font = "12px Segoe UI, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  dataset.series.forEach((series, index) => {
    const row = compact ? Math.floor(index / 2) : index;
    const col = compact ? index % 2 : 0;
    const x = legendX + col * columnWidth;
    const y = legendY + row * 22;
    ctx.fillStyle = palette.colors[index % palette.colors.length];
    drawRoundedRect(ctx, x, y - 5, 18, 10, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(226, 232, 240, 0.86)";
    ctx.fillText(truncate(series.name, compact ? 14 : 18), x + 26, y);
  });
}

function drawBar3d(
  ctx: CanvasRenderingContext2D,
  dataset: ChartDataset,
  palette: Palette,
  settings: ChartSettings,
  plot: PlotBox,
  range: { min: number; max: number },
) {
  const categoryCount = dataset.categories.length;
  const seriesCount = dataset.series.length;
  const categoryStep = plot.width / Math.max(1, categoryCount);
  const groupWidth = categoryStep * 0.66;
  const slotWidth = groupWidth / Math.max(1, seriesCount);
  const barWidth = clamp(slotWidth * 0.72, 5, 34);
  const depthX = settings.depth * 0.72;
  const depthY = -settings.depth * (settings.perspective / 100);
  const zeroY = plot.bottom - ((0 - range.min) / (range.max - range.min)) * plot.height;
  const bars: Array<{ seriesIndex: number; categoryIndex: number; x: number; y: number; height: number; color: string; value: number }> = [];

  dataset.categories.forEach((_category, categoryIndex) => {
    dataset.series.forEach((series, seriesIndex) => {
      const value = series.values[categoryIndex] ?? 0;
      const valueY = plot.bottom - ((value - range.min) / (range.max - range.min)) * plot.height;
      const topY = Math.min(valueY, zeroY);
      const bottomY = Math.max(valueY, zeroY);
      const x =
        plot.left +
        categoryStep * categoryIndex +
        (categoryStep - groupWidth) / 2 +
        slotWidth * seriesIndex +
        (slotWidth - barWidth) / 2;

      bars.push({
        seriesIndex,
        categoryIndex,
        x,
        y: topY,
        height: Math.max(1, bottomY - topY),
        color: palette.colors[seriesIndex % palette.colors.length],
        value,
      });
    });
  });

  bars
    .sort((a, b) => a.categoryIndex - b.categoryIndex || a.seriesIndex - b.seriesIndex)
    .forEach((bar) => {
      const { x, y, height, color } = bar;
      const frontGradient = ctx.createLinearGradient(x, y, x + barWidth, y + height);
      frontGradient.addColorStop(0, shade(color, 18));
      frontGradient.addColorStop(1, shade(color, -34));

      ctx.save();
      if (settings.glow > 0) {
        ctx.shadowColor = rgba(color, settings.glow / 100);
        ctx.shadowBlur = settings.glow * 0.32;
      }

      drawPolygon(
        ctx,
        [
          { x: x + barWidth, y },
          { x: x + barWidth + depthX, y: y + depthY },
          { x: x + barWidth + depthX, y: y + height + depthY },
          { x: x + barWidth, y: y + height },
        ],
        shade(color, -48),
        "rgba(15, 23, 42, 0.36)",
      );

      drawPolygon(
        ctx,
        [
          { x, y },
          { x: x + depthX, y: y + depthY },
          { x: x + barWidth + depthX, y: y + depthY },
          { x: x + barWidth, y },
        ],
        shade(color, 36),
        "rgba(255, 255, 255, 0.22)",
      );

      ctx.fillStyle = frontGradient;
      ctx.fillRect(x, y, barWidth, height);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.strokeRect(x, y, barWidth, height);
      ctx.restore();

      if (settings.showValueLabels && categoryCount * seriesCount <= 96) {
        ctx.fillStyle = "rgba(248, 250, 252, 0.88)";
        ctx.font = "11px Segoe UI, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(formatValue(bar.value), x + barWidth / 2 + depthX * 0.25, y - 6 + depthY * 0.2);
      }
    });
}

function drawLine3d(
  ctx: CanvasRenderingContext2D,
  dataset: ChartDataset,
  palette: Palette,
  settings: ChartSettings,
  plot: PlotBox,
  range: { min: number; max: number },
) {
  const categoryCount = dataset.categories.length;
  const xStep = categoryCount <= 1 ? 0 : plot.width / (categoryCount - 1);
  const seriesPoints = dataset.series.map((series, seriesIndex) => ({
    series,
    color: palette.colors[seriesIndex % palette.colors.length],
    points: series.values.map((value, index) => {
      if (value === null) return null;
      return {
        x: plot.left + (categoryCount <= 1 ? plot.width / 2 : xStep * index),
        y: plot.bottom - ((value - range.min) / (range.max - range.min)) * plot.height,
      };
    }),
  }));

  seriesPoints.forEach(({ color, points }) => {
    const segments: Point[][] = [];
    let current: Point[] = [];
    points.forEach((point) => {
      if (!point) {
        if (current.length) segments.push(current);
        current = [];
        return;
      }
      current.push(point);
    });
    if (current.length) segments.push(current);

    segments.forEach((segment) => {
      if (segment.length < 2) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = rgba(color, 0.16);
      ctx.lineWidth = 18;
      drawPath(ctx, segment, settings.smoothLines);
      ctx.stroke();
      ctx.restore();
    });
  });

  seriesPoints.forEach(({ series, color, points }) => {
    const segments: Point[][] = [];
    let current: Point[] = [];
    points.forEach((point) => {
      if (!point) {
        if (current.length) segments.push(current);
        current = [];
        return;
      }
      current.push(point);
    });
    if (current.length) segments.push(current);

    segments.forEach((segment) => {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (settings.glow > 0) {
        ctx.shadowColor = rgba(color, settings.glow / 85);
        ctx.shadowBlur = settings.glow * 0.45;
      }

      ctx.strokeStyle = rgba(color, 0.22);
      ctx.lineWidth = 12;
      drawPath(ctx, segment, settings.smoothLines);
      ctx.stroke();

      ctx.strokeStyle = shade(color, 28);
      ctx.lineWidth = 4;
      drawPath(ctx, segment, settings.smoothLines);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.64)";
      ctx.lineWidth = 1;
      drawPath(ctx, segment, settings.smoothLines);
      ctx.stroke();
      ctx.restore();
    });

    if (settings.showPoints) {
      points.forEach((point, index) => {
        if (!point) return;
        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = "rgba(248, 250, 252, 0.82)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        if (settings.showValueLabels && categoryCount * dataset.series.length <= 80) {
          const value = series.values[index];
          if (value === null) return;
          ctx.fillStyle = "rgba(248, 250, 252, 0.88)";
          ctx.font = "11px Segoe UI, Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(formatValue(value), point.x, point.y - 10);
        }
      });
    }
  });
}

function drawChart(
  canvas: HTMLCanvasElement,
  dataset: ChartDataset | null,
  settings: ChartSettings,
  error: string,
  cssWidth: number,
  cssHeight: number,
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(320, Math.floor(cssWidth));
  const height = Math.max(360, Math.floor(cssHeight));
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  if (!dataset) {
    drawEmptyState(ctx, width, height, error);
    return;
  }

  const palette = PALETTES.find((item) => item.id === settings.paletteId) ?? PALETTES[0];
  const plot = getPlotBox(width, height, settings);
  const range = makeRange(dataset);
  drawChartSurface(ctx, width, height, plot, settings, range);

  if (settings.chartType === "bar3d") {
    drawBar3d(ctx, dataset, palette, settings, plot, range);
  } else {
    drawLine3d(ctx, dataset, palette, settings, plot, range);
  }

  drawLabelsAndLegend(ctx, width, height, plot, dataset, palette, settings);
}

function fileKindFromName(fileName: string): SourceKind {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".tsv") || lower.endsWith(".tab")) return "tsv";
  if (lower.endsWith(".csv")) return "csv";
  return "auto";
}

function downloadCanvasPng(canvas: HTMLCanvasElement, title: string) {
  const anchor = document.createElement("a");
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 44);
  anchor.href = canvas.toDataURL("image/png");
  anchor.download = `${slug || "chart-studio"}.png`;
  anchor.click();
}

export function ChartStudioClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [canvasBox, setCanvasBox] = useState({ width: 720, height: 520 });
  const [source, setSource] = useState(INITIAL_SOURCE);
  const [sourceKind, setSourceKind] = useState<SourceKind>("auto");
  const [chartType, setChartType] = useState<ChartType>("line3d");
  const [paletteId, setPaletteId] = useState<PaletteId>("aurora");
  const [title, setTitle] = useState("Studio Growth Curve");
  const [xLabel, setXLabel] = useState("Period");
  const [yLabel, setYLabel] = useState("Value");
  const [depth, setDepth] = useState(34);
  const [perspective, setPerspective] = useState(48);
  const [glow, setGlow] = useState(40);
  const [showLegend, setShowLegend] = useState(true);
  const [showValueLabels, setShowValueLabels] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [smoothLines, setSmoothLines] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [fileStatus, setFileStatus] = useState("");
  const [downloadState, setDownloadState] = useState<"idle" | "done" | "failed">("idle");

  const parseResult = useMemo(() => parseChartData(source, sourceKind), [source, sourceKind]);
  const settings = useMemo<ChartSettings>(
    () => ({
      chartType,
      title,
      xLabel,
      yLabel,
      paletteId,
      depth,
      perspective,
      glow,
      showLegend,
      showValueLabels,
      showGrid,
      smoothLines,
      showPoints,
    }),
    [chartType, depth, glow, paletteId, perspective, showGrid, showLegend, showPoints, showValueLabels, smoothLines, title, xLabel, yLabel],
  );

  useEffect(() => {
    const wrapper = canvasWrapRef.current;
    if (!wrapper) return;

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      setCanvasBox({
        width: Math.max(320, Math.round(rect.width)),
        height: Math.max(420, Math.round(rect.height)),
      });
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const frame = window.requestAnimationFrame(() => {
      drawChart(canvas, parseResult.dataset, settings, parseResult.error, canvasBox.width, canvasBox.height);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [canvasBox.height, canvasBox.width, parseResult.dataset, parseResult.error, settings]);

  async function importFile(file: File | null) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileStatus("File is larger than 2 MB.");
      return;
    }

    try {
      const text = await file.text();
      const nextKind = fileKindFromName(file.name);
      setSource(text);
      if (nextKind !== "auto") setSourceKind(nextKind);
      setFileStatus(`Imported ${file.name}.`);
    } catch {
      setFileStatus("Unable to read this file.");
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void importFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void importFile(event.dataTransfer.files?.[0] ?? null);
  }

  function applySample(sample: (typeof SAMPLE_DATASETS)[number]) {
    setSource(sample.source);
    setSourceKind(sample.id === "json" ? "json" : "auto");
    setChartType(sample.chartType);
    setFileStatus(`Loaded ${sample.label}.`);
  }

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas || !parseResult.dataset) return;

    try {
      downloadCanvasPng(canvas, title);
      setDownloadState("done");
    } catch {
      setDownloadState("failed");
    }

    window.setTimeout(() => setDownloadState("idle"), 1800);
  }

  const dataset = parseResult.dataset;
  const dataPointCount = dataset ? dataset.categories.length * dataset.series.length : 0;
  const warnings = [...parseResult.warnings];

  return (
    <>
      <section className="panel stack chart-studio-hero">
        <div className="eyebrow">utility / chart studio</div>
        <div className="utility-title-row">
          <div>
            <h1 style={{ marginBottom: 8 }}>Chart Studio</h1>
            <p className="muted" style={{ margin: 0 }}>
              Shape manual data, CSV, TSV, or JSON into presentation-ready 3D bar and line charts.
            </p>
          </div>
          <div className="utility-status-tags" aria-live="polite">
            <span className="tag neutral">{parseResult.detected.toUpperCase()}</span>
            <span className="tag neutral">{dataset ? `${dataset.categories.length} categories` : "No dataset"}</span>
            <span className="tag neutral">{dataset ? `${dataset.series.length} series` : "0 series"}</span>
          </div>
        </div>
      </section>

      <section className="chart-studio-layout section">
        <div className="chart-studio-control-stack">
          <div className="panel stack">
            <div className="list-item-header">
              <h2 style={{ margin: 0 }}>Data</h2>
              <div className="segmented-control chart-studio-compact-control" role="group" aria-label="Input format">
                {SOURCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`segment${sourceKind === option.value ? " active" : ""}`}
                    onClick={() => setSourceKind(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              <span className="label">Manual editor</span>
              <textarea
                className="textarea mono-textarea chart-studio-data-input"
                value={source}
                spellCheck={false}
                onChange={(event) => setSource(event.target.value)}
              />
            </label>

            <div
              className={`chart-studio-drop-zone${isDragging ? " is-dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.tab,.json,text/csv,text/tab-separated-values,application/json"
                onChange={handleFileChange}
                hidden
              />
              <div>
                <strong>Drop CSV, TSV, or JSON</strong>
                <span>{fileStatus || "Files stay local in your browser."}</span>
              </div>
              <button type="button" className="ghost-button" onClick={() => fileInputRef.current?.click()}>
                Choose file
              </button>
            </div>

            <div className="chart-studio-sample-row" aria-label="Sample datasets">
              {SAMPLE_DATASETS.map((sample) => (
                <button key={sample.id} type="button" className="ghost-button" onClick={() => applySample(sample)}>
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          <div className="panel stack">
            <div className="list-item-header">
              <h2 style={{ margin: 0 }}>Style</h2>
              <div className="segmented-control chart-studio-compact-control" role="group" aria-label="Chart type">
                {CHART_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`segment${chartType === option.value ? " active" : ""}`}
                    onClick={() => setChartType(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="utility-control-grid">
              <label className="field">
                <span className="label">Title</span>
                <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <div className="field">
                <span className="label">Palette</span>
                <div className="chart-studio-palette-grid" role="radiogroup" aria-label="Palette">
                  {PALETTES.map((palette) => (
                    <button
                      key={palette.id}
                      type="button"
                      className={`chart-studio-palette-button${paletteId === palette.id ? " is-active" : ""}`}
                      onClick={() => setPaletteId(palette.id)}
                      aria-pressed={paletteId === palette.id}
                    >
                      <span>{palette.name}</span>
                      <span className="chart-studio-swatch-row" aria-hidden="true">
                        {palette.colors.slice(0, 4).map((color) => (
                          <span key={color} style={{ background: color }} />
                        ))}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <label className="field">
                <span className="label">X axis label</span>
                <input className="input" value={xLabel} onChange={(event) => setXLabel(event.target.value)} />
              </label>
              <label className="field">
                <span className="label">Y axis label</span>
                <input className="input" value={yLabel} onChange={(event) => setYLabel(event.target.value)} />
              </label>
            </div>

            <div className="chart-studio-slider-grid">
              <label className="chart-studio-slider">
                <span>Depth {depth}px</span>
                <input type="range" min="12" max="74" value={depth} onChange={(event) => setDepth(Number(event.target.value))} />
              </label>
              <label className="chart-studio-slider">
                <span>Perspective {perspective}%</span>
                <input
                  type="range"
                  min="18"
                  max="82"
                  value={perspective}
                  onChange={(event) => setPerspective(Number(event.target.value))}
                />
              </label>
              <label className="chart-studio-slider">
                <span>Glow {glow}%</span>
                <input type="range" min="0" max="100" value={glow} onChange={(event) => setGlow(Number(event.target.value))} />
              </label>
            </div>

            <div className="chart-studio-toggle-grid">
              <label>
                <input type="checkbox" checked={showLegend} onChange={(event) => setShowLegend(event.target.checked)} />
                Legend
              </label>
              <label>
                <input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} />
                Grid floor
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showValueLabels}
                  onChange={(event) => setShowValueLabels(event.target.checked)}
                />
                Value labels
              </label>
              <label>
                <input type="checkbox" checked={smoothLines} onChange={(event) => setSmoothLines(event.target.checked)} />
                Smooth lines
              </label>
              <label>
                <input type="checkbox" checked={showPoints} onChange={(event) => setShowPoints(event.target.checked)} />
                Point markers
              </label>
            </div>
          </div>
        </div>

        <div className="chart-studio-preview-stack">
          <div className="panel stack chart-studio-preview-panel">
            <div className="list-item-header">
              <div>
                <h2 style={{ margin: 0 }}>Preview</h2>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {dataset ? `${dataPointCount} plotted values` : "Waiting for valid data"}
                </p>
              </div>
              <button type="button" className="button" onClick={exportPng} disabled={!dataset}>
                {downloadState === "done" ? "Downloaded" : downloadState === "failed" ? "Export failed" : "Download PNG"}
              </button>
            </div>

            <div ref={canvasWrapRef} className="chart-studio-canvas-wrap">
              <canvas
                ref={canvasRef}
                className="chart-studio-canvas"
                aria-label="Rendered 3D chart preview canvas"
              />
            </div>
          </div>

          <div className="panel stack">
            <div className="list-item-header">
              <h2 style={{ margin: 0 }}>Dataset summary</h2>
              <span className="tag neutral">{chartType === "bar3d" ? "3D Bar" : "3D Line"}</span>
            </div>

            {parseResult.error ? <div className="notice notice-error">{parseResult.error}</div> : null}

            <div className="utility-fact-grid">
              <div className="utility-fact">
                <span>Categories</span>
                <strong>{dataset?.categories.length ?? 0}</strong>
              </div>
              <div className="utility-fact">
                <span>Series</span>
                <strong>{dataset?.series.length ?? 0}</strong>
              </div>
              <div className="utility-fact">
                <span>Format</span>
                <strong>{parseResult.detected.toUpperCase()}</strong>
              </div>
              <div className="utility-fact">
                <span>Warnings</span>
                <strong>{warnings.length}</strong>
              </div>
            </div>

            {warnings.length ? (
              <div className="chart-studio-warning-list">
                {warnings.slice(0, 5).map((warning) => (
                  <div key={warning} className="notice">
                    {warning}
                  </div>
                ))}
                {warnings.length > 5 ? <p className="muted">Showing 5 of {warnings.length} warnings.</p> : null}
              </div>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Clean data. The chart is ready to export.
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
