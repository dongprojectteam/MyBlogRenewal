"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SelectedMode = "auto" | "markdown" | "mermaid" | "plantuml";
type RenderEngine = Exclude<SelectedMode, "auto">;
type RenderStatus = "idle" | "loading" | "ready" | "error";

type MarkdownToken =
  | {
      kind: "markdown";
      value: string;
    }
  | {
      kind: "fence";
      language: string;
      code: string;
    };

type PreviewSegment =
  | {
      id: string;
      kind: "markdown";
      html: string;
    }
  | {
      id: string;
      kind: "code";
      language: string;
      code: string;
    }
  | {
      id: string;
      kind: "diagram";
      engine: RenderEngine;
      source: string;
      status: "ready" | "error";
      svg?: string;
      error?: string;
    };

type RenderState = {
  status: RenderStatus;
  engine: RenderEngine | null;
  svg?: string;
  primarySvg?: string;
  segments?: PreviewSegment[];
  error?: string;
};

type PlantUmlResponse = {
  svg?: string;
  error?: string;
};

const STORAGE_KEY = "dopt-diagram-previewer-v1";
const HISTORY_STORAGE_KEY = "dopt-diagram-history-v1";
const MAX_HISTORY_ENTRIES = 40;
const MAX_HISTORY_COMMENT_LENGTH = 120;
const MAX_SOURCE_BYTES = 1024 * 1024;
const RENDER_DEBOUNCE_MS = 380;
const PLANTUML_TIMEOUT_MS = 16000;
const ZOOM_MIN = 50;
const ZOOM_MAX = 180;
const SOURCE_FONT_MIN = 11;
const SOURCE_FONT_MAX = 20;
const SOURCE_FONT_DEFAULT = 13;
const SOURCE_FONT_STEP = 1;
const WORKBENCH_SPLIT_MIN = 20;
const WORKBENCH_SPLIT_MAX = 72;
const WORKBENCH_SPLIT_DEFAULT = 20;
const WORKBENCH_SPLITTER_WIDTH = 12;

const MODE_OPTIONS: Array<{ value: SelectedMode; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "markdown", label: "Markdown" },
  { value: "mermaid", label: "Mermaid" },
  { value: "plantuml", label: "PlantUML" },
];

const ACCEPTED_EXTENSIONS = [
  ".md",
  ".markdown",
  ".mmd",
  ".mermaid",
  ".puml",
  ".plantuml",
  ".uml",
  ".iuml",
  ".txt",
];

const INITIAL_RENDER_STATE: RenderState = {
  status: "idle",
  engine: null,
};

type DiagramHistoryVersion = {
  version: number;
  source: string;
  selectedMode: SelectedMode;
  fileName: string;
  savedAt: string;
};

type DiagramHistoryEntry = {
  id: string;
  title: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  versions: DiagramHistoryVersion[];
};

function normalizeHistoryComment(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_HISTORY_COMMENT_LENGTH);
}

function createHistoryId() {
  return `history-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function getHistoryTitle(source: string, fileName: string) {
  if (fileName.trim()) {
    return fileName.trim();
  }

  const firstLine = source.split(/\r\n|\r|\n/).find((line) => line.trim());
  if (firstLine) {
    return firstLine.trim().slice(0, 80);
  }

  return "Untitled diagram";
}

function formatHistoryTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function readHistoryEntries(): DiagramHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry): DiagramHistoryEntry | null => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const candidate = entry as Partial<DiagramHistoryEntry>;
        if (typeof candidate.id !== "string" || typeof candidate.title !== "string") {
          return null;
        }

        const versions = Array.isArray(candidate.versions)
          ? candidate.versions
              .map((version): DiagramHistoryVersion | null => {
                if (!version || typeof version !== "object") {
                  return null;
                }

                const item = version as Partial<DiagramHistoryVersion>;
                if (
                  typeof item.version !== "number" ||
                  typeof item.source !== "string" ||
                  typeof item.savedAt !== "string"
                ) {
                  return null;
                }

                const mode = item.selectedMode;
                if (typeof mode !== "string" || !MODE_OPTIONS.some((option) => option.value === mode)) {
                  return null;
                }

                return {
                  version: item.version,
                  source: item.source,
                  selectedMode: mode as SelectedMode,
                  fileName: typeof item.fileName === "string" ? item.fileName : "",
                  savedAt: item.savedAt,
                };
              })
              .filter((version): version is DiagramHistoryVersion => Boolean(version))
              .sort((left, right) => left.version - right.version)
          : [];

        if (!versions.length) {
          return null;
        }

        return {
          id: candidate.id,
          title: candidate.title,
          comment:
            typeof candidate.comment === "string" ? normalizeHistoryComment(candidate.comment) : "",
          createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : versions[0].savedAt,
          updatedAt:
            typeof candidate.updatedAt === "string"
              ? candidate.updatedAt
              : versions[versions.length - 1].savedAt,
          versions,
        };
      })
      .filter((entry): entry is DiagramHistoryEntry => Boolean(entry))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  } catch {
    return [];
  }
}

function writeHistoryEntries(entries: DiagramHistoryEntry[]) {
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_ENTRIES)));
}

function getHistoryVersion(entry: DiagramHistoryEntry, version?: number) {
  if (typeof version === "number") {
    return entry.versions.find((item) => item.version === version) ?? null;
  }

  return entry.versions[entry.versions.length - 1] ?? null;
}

function isSameHistorySnapshot(
  left: Pick<DiagramHistoryVersion, "source" | "selectedMode" | "fileName">,
  right: Pick<DiagramHistoryVersion, "source" | "selectedMode" | "fileName">,
) {
  return left.source === right.source && left.selectedMode === right.selectedMode && left.fileName === right.fileName;
}

function getExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match?.[1] ?? "";
}

function getSourceByteLength(source: string) {
  return new TextEncoder().encode(source).length;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeHref(value: string) {
  const trimmed = value.replaceAll("&amp;", "&").trim();
  if (/^(https?:|mailto:|\/|#)/i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return "#";
}

function sanitizeSvg(svg: string) {
  return svg
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");
}

function renderInlineMarkdown(value: string) {
  let html = escapeHtml(value);

  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, label: string, href: string) => {
    return `<a href="${sanitizeHref(href)}" target="_blank" rel="noreferrer">${label}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>");

  return html;
}

function isHorizontalRule(line: string) {
  return /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line);
}

function isTableDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isMarkdownBlockStart(line: string, nextLine = "") {
  return (
    /^\s{0,3}#{1,6}\s+/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    /^\s*>\s?/.test(line) ||
    isHorizontalRule(line) ||
    (line.includes("|") && isTableDivider(nextLine))
  );
}

function renderMarkdownHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const nextLine = lines[index + 1] ?? "";

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(heading[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (isHorizontalRule(line)) {
      html.push("<hr />");
      index += 1;
      continue;
    }

    if (line.includes("|") && isTableDivider(nextLine)) {
      const headers = splitTableRow(line);
      index += 2;
      const rows: string[][] = [];

      while (index < lines.length && (lines[index] ?? "").includes("|") && (lines[index] ?? "").trim()) {
        rows.push(splitTableRow(lines[index] ?? ""));
        index += 1;
      }

      html.push(
        [
          "<div class=\"diagram-table-scroll\"><table>",
          `<thead><tr>${headers.map((header) => `<th>${renderInlineMarkdown(header)}</th>`).join("")}</tr></thead>`,
          `<tbody>${rows
            .map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join("")}</tr>`)
            .join("")}</tbody>`,
          "</table></div>",
        ].join(""),
      );
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index] ?? "")) {
        quoteLines.push((lines[index] ?? "").replace(/^\s*>\s?/, ""));
        index += 1;
      }
      html.push(`<blockquote>${quoteLines.map((item) => renderInlineMarkdown(item)).join("<br />")}</blockquote>`);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\s*[-*+]\s+/, ""));
        index += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\s*\d+\.\s+/, ""));
        index += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      (lines[index] ?? "").trim() &&
      !isMarkdownBlockStart(lines[index] ?? "", lines[index + 1] ?? "")
    ) {
      paragraphLines.push((lines[index] ?? "").trim());
      index += 1;
    }

    if (paragraphLines.length === 0) {
      paragraphLines.push(line.trim());
      index += 1;
    }

    html.push(`<p>${renderInlineMarkdown(paragraphLines.join(" "))}</p>`);
  }

  return html.join("\n");
}

function tokenizeMarkdown(source: string): MarkdownToken[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const tokens: MarkdownToken[] = [];
  const buffer: string[] = [];

  const flushMarkdown = () => {
    if (buffer.length === 0) return;
    tokens.push({ kind: "markdown", value: buffer.join("\n") });
    buffer.length = 0;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const fenceMatch = line.match(/^\s*```([^\s`]*)?.*$/);

    if (!fenceMatch) {
      buffer.push(line);
      continue;
    }

    flushMarkdown();

    const language = (fenceMatch[1] ?? "").toLowerCase();
    const codeLines: string[] = [];
    index += 1;

    while (index < lines.length && !/^\s*```\s*$/.test(lines[index] ?? "")) {
      codeLines.push(lines[index] ?? "");
      index += 1;
    }

    tokens.push({ kind: "fence", language, code: codeLines.join("\n") });
  }

  flushMarkdown();
  return tokens;
}

function isPlantUmlSource(source: string) {
  return /@start(?:uml|mindmap|wbs|gantt|json|yaml|salt|ditaa|dot|regex|ebnf|wire|chen|creole|latex)\b/i.test(source);
}

function isMermaidSource(source: string) {
  const firstMeaningfulLine = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("%%"));

  return Boolean(
    firstMeaningfulLine?.match(
      /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|journey|pie|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|c4Context|sankey-beta|xychart-beta|block-beta|packet-beta)\b/i,
    ),
  );
}

function looksLikeMarkdown(source: string) {
  return (
    /(^|\n)\s*```/.test(source) ||
    /(^|\n)\s{0,3}#{1,6}\s+/.test(source) ||
    /(^|\n)\s*[-*+]\s+/.test(source) ||
    /(^|\n)\s*\d+\.\s+/.test(source) ||
    /\[[^\]]+]\([^)]+\)/.test(source)
  );
}

function getFenceEngine(language: string, code: string): RenderEngine | null {
  const normalized = language.toLowerCase();
  if (normalized === "mermaid") return "mermaid";
  if (["plantuml", "puml", "uml"].includes(normalized)) return "plantuml";
  if (!normalized && isPlantUmlSource(code)) return "plantuml";
  if (!normalized && isMermaidSource(code)) return "mermaid";
  return null;
}

function resolveEngine(source: string, selectedMode: SelectedMode, fileName: string): RenderEngine {
  if (selectedMode !== "auto") return selectedMode;

  const extension = getExtension(fileName);
  if ([".md", ".markdown"].includes(extension)) return "markdown";
  if ([".puml", ".plantuml", ".uml", ".iuml"].includes(extension)) return "plantuml";
  if ([".mmd", ".mermaid"].includes(extension)) return "mermaid";

  if (isPlantUmlSource(source)) return "plantuml";
  if (looksLikeMarkdown(source)) return "markdown";
  if (isMermaidSource(source)) return "mermaid";

  return "markdown";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Render failed.";
}

async function renderMermaidSvg(source: string, idHint: string) {
  const mermaidModule = await import("mermaid");
  const mermaid = mermaidModule.default;
  const id = `dopt-diagram-${idHint}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "default",
    htmlLabels: false,
    flowchart: {
      htmlLabels: false,
      useMaxWidth: false,
    },
    sequence: {
      useMaxWidth: false,
    },
    er: {
      useMaxWidth: false,
    },
  });

  const result = await mermaid.render(id, source);
  return sanitizeSvg(result.svg);
}

async function renderPlantUmlSvg(source: string) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), PLANTUML_TIMEOUT_MS);

  try {
    const response = await fetch("/api/plantuml/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, format: "svg" }),
      signal: controller.signal,
    });

    const data = (await response.json()) as PlantUmlResponse;

    if (!response.ok || data.error || !data.svg) {
      throw new Error(data.error ?? "PlantUML render failed.");
    }

    return sanitizeSvg(data.svg);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function renderMarkdownDocument(source: string) {
  const tokens = tokenizeMarkdown(source);
  const plantUmlCache = new Map<string, Promise<string>>();

  const segments = await Promise.all(
    tokens.map(async (token, index): Promise<PreviewSegment | null> => {
      if (token.kind === "markdown") {
        const html = renderMarkdownHtml(token.value);
        return html.trim() ? { id: `md-${index}`, kind: "markdown", html } : null;
      }

      const engine = getFenceEngine(token.language, token.code);
      if (!engine) {
        return {
          id: `code-${index}`,
          kind: "code",
          language: token.language || "text",
          code: token.code,
        };
      }

      try {
        const svg =
          engine === "mermaid"
            ? await renderMermaidSvg(token.code, `md-${index}`)
            : await (plantUmlCache.get(token.code) ??
                plantUmlCache.set(token.code, renderPlantUmlSvg(token.code)).get(token.code)!);

        return {
          id: `diagram-${index}`,
          kind: "diagram",
          engine,
          source: token.code,
          status: "ready",
          svg,
        };
      } catch (error) {
        return {
          id: `diagram-${index}`,
          kind: "diagram",
          engine,
          source: token.code,
          status: "error",
          error: getErrorMessage(error),
        };
      }
    }),
  );

  return segments.filter((segment): segment is PreviewSegment => Boolean(segment));
}

async function renderSource(source: string, selectedMode: SelectedMode, fileName: string): Promise<RenderState> {
  if (!source.trim()) {
    return INITIAL_RENDER_STATE;
  }

  const sourceBytes = getSourceByteLength(source);
  if (sourceBytes > MAX_SOURCE_BYTES) {
    return {
      status: "error",
      engine: null,
      error: `소스가 너무 큽니다. 현재 ${formatBytes(sourceBytes)}이며 최대 1 MB까지 렌더링할 수 있습니다.`,
    };
  }

  const engine = resolveEngine(source, selectedMode, fileName);

  try {
    if (engine === "markdown") {
      const segments = await renderMarkdownDocument(source);
      const primarySvg = segments.find(
        (segment): segment is Extract<PreviewSegment, { kind: "diagram" }> =>
          segment.kind === "diagram" && Boolean(segment.svg),
      )?.svg;
      return { status: "ready", engine, segments, primarySvg };
    }

    const svg = engine === "mermaid" ? await renderMermaidSvg(source, "single") : await renderPlantUmlSvg(source);
    return { status: "ready", engine, svg, primarySvg: svg };
  } catch (error) {
    return {
      status: "error",
      engine,
      error: getErrorMessage(error),
    };
  }
}

function getEngineLabel(engine: RenderEngine | null) {
  if (!engine) return "Idle";
  if (engine === "markdown") return "Markdown";
  if (engine === "mermaid") return "Mermaid";
  return "PlantUML";
}

function getDownloadName(fileName: string, engine: RenderEngine | null, extension: "svg" | "png" | "pdf") {
  const base = fileName && getExtension(fileName) ? fileName.replace(/\.[^.]+$/, "") : engine || "diagram";
  return `${base || "diagram"}.${extension}`;
}

function escapeHtmlDocumentTitle(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseSvgSize(svg: string) {
  const fallback = { width: 1200, height: 800 };
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  const svgElement = parsed.documentElement;

  if (!svgElement || svgElement.nodeName.toLowerCase() !== "svg") {
    return fallback;
  }

  const viewBox = svgElement.getAttribute("viewBox");
  if (viewBox) {
    const [, , viewBoxWidth, viewBoxHeight] = viewBox
      .split(/[\s,]+/)
      .map((part) => Number.parseFloat(part))
      .filter((value) => Number.isFinite(value));

    if (viewBoxWidth > 0 && viewBoxHeight > 0) {
      return {
        width: Math.min(Math.ceil(viewBoxWidth), 8192),
        height: Math.min(Math.ceil(viewBoxHeight), 8192),
      };
    }
  }

  const width = Number.parseFloat(svgElement.getAttribute("width") ?? "");
  const height = Number.parseFloat(svgElement.getAttribute("height") ?? "");

  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return {
      width: Math.min(Math.ceil(width), 8192),
      height: Math.min(Math.ceil(height), 8192),
    };
  }

  return fallback;
}

const EMBEDDED_SVG_PADDING = 40;
const MARKDOWN_BLOCK_GAP = 18;
const MARKDOWN_EXPORT_PADDING = 40;
const PREVIEW_EXPORT_PADDING = 40;
const SVG_EXPORT_PAGE_WIDTH = 1200;

type MeasuredSvgContent = {
  viewBox: string;
  width: number;
  height: number;
};

function measureLiveSvgElement(svg: SVGSVGElement, padding = EMBEDDED_SVG_PADDING): MeasuredSvgContent {
  const bbox = svg.getBBox();
  const width = Math.max(1, Math.ceil(bbox.width + padding * 2));
  const height = Math.max(1, Math.ceil(bbox.height + padding * 2));

  return {
    viewBox: `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`,
    width,
    height,
  };
}

function getLiveDiagramSvg(previewRoot: HTMLElement | null, segmentId: string) {
  const wrap = previewRoot?.querySelector(`[data-diagram-id="${CSS.escape(segmentId)}"]`);
  const svg = wrap?.querySelector("svg");
  return svg instanceof SVGSVGElement ? svg : null;
}

function mountDiagramSvgString(svg: string) {
  const parsed = new DOMParser().parseFromString(normalizeSvgForImage(svg), "image/svg+xml");
  const root = parsed.documentElement;

  if (!(root instanceof SVGSVGElement)) {
    return null;
  }

  const probe = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  probe.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  probe.style.position = "fixed";
  probe.style.left = "-100000px";
  probe.style.top = "0";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.appendChild(root.cloneNode(true));
  document.body.appendChild(probe);

  const mounted = probe.querySelector("svg");
  if (!(mounted instanceof SVGSVGElement)) {
    document.body.removeChild(probe);
    return null;
  }

  return {
    svg: mounted,
    cleanup: () => {
      if (probe.parentNode) {
        document.body.removeChild(probe);
      }
    },
  };
}

function resolveDiagramSvgForExport(
  previewRoot: HTMLElement | null,
  segment: Extract<PreviewSegment, { kind: "diagram" }>,
) {
  const liveSvg = getLiveDiagramSvg(previewRoot, segment.id);
  if (liveSvg) {
    return { svg: liveSvg, cleanup: undefined };
  }

  if (!segment.svg) {
    return null;
  }

  return mountDiagramSvgString(segment.svg);
}

function svgUsesForeignObjectLabels(svg: SVGSVGElement | string) {
  const value = typeof svg === "string" ? svg : new XMLSerializer().serializeToString(svg);
  return /<foreignObject[\s>]/i.test(value);
}

async function resolveDiagramSvgForRaster(
  previewRoot: HTMLElement | null,
  segment: Extract<PreviewSegment, { kind: "diagram" }>,
) {
  const resolved = resolveDiagramSvgForExport(previewRoot, segment);
  if (!resolved) {
    return null;
  }

  if (segment.engine !== "mermaid" || !svgUsesForeignObjectLabels(resolved.svg)) {
    return resolved;
  }

  try {
    const freshSvg = await renderMermaidSvg(segment.source, `${segment.id}-export`);
    resolved.cleanup?.();
    return mountDiagramSvgString(freshSvg);
  } catch {
    return resolved;
  }
}

async function resolveStandaloneSvgForRaster(
  previewRoot: HTMLElement | null,
  engine: RenderEngine,
  source: string,
) {
  const liveSvg = previewRoot?.querySelector("svg");
  if (!(liveSvg instanceof SVGSVGElement)) {
    return null;
  }

  if (engine !== "mermaid" || !svgUsesForeignObjectLabels(liveSvg)) {
    return { svg: liveSvg, cleanup: undefined };
  }

  try {
    const freshSvg = await renderMermaidSvg(source, "single-export");
    return mountDiagramSvgString(freshSvg);
  } catch {
    return { svg: liveSvg, cleanup: undefined };
  }
}

function inlineSvgPresentationAttributes(sourceRoot: Element, targetRoot: Element) {
  if (!(sourceRoot instanceof Element) || !(targetRoot instanceof Element)) {
    return;
  }

  if (sourceRoot instanceof SVGElement && targetRoot instanceof SVGElement) {
    const computed = window.getComputedStyle(sourceRoot);
    const fill = computed.fill;
    const stroke = computed.stroke;
    const color = computed.color;

    if (fill && fill !== "none") {
      targetRoot.setAttribute("fill", fill);
    } else if (color && color !== "none") {
      targetRoot.setAttribute("fill", color);
    }

    if (stroke && stroke !== "none") {
      targetRoot.setAttribute("stroke", stroke);
    }

    const tagName = sourceRoot.tagName.toLowerCase();
    if (tagName === "text" || tagName === "tspan") {
      if (!targetRoot.getAttribute("fill") && color && color !== "none") {
        targetRoot.setAttribute("fill", color);
      }
      targetRoot.setAttribute("font-family", computed.fontFamily || "sans-serif");
      targetRoot.setAttribute("font-size", computed.fontSize || "14px");
      targetRoot.setAttribute("font-weight", computed.fontWeight || "400");
    }
  }

  Array.from(sourceRoot.children).forEach((sourceChild, index) => {
    const targetChild = targetRoot.children.item(index);
    if (targetChild) {
      inlineSvgPresentationAttributes(sourceChild, targetChild);
    }
  });
}

function prepareStandaloneDiagramSvg(svg: SVGSVGElement, sourceSvg?: SVGSVGElement) {
  const measured = measureLiveSvgElement(svg);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("x");
  clone.removeAttribute("y");
  clone.setAttribute("viewBox", measured.viewBox);
  clone.setAttribute("width", "100%");
  clone.removeAttribute("height");
  clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
  clone.setAttribute("overflow", "visible");

  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }

  if (sourceSvg) {
    inlineSvgPresentationAttributes(sourceSvg, clone);
  }

  return new XMLSerializer().serializeToString(clone);
}

function prepareStandaloneDiagramSvgForRaster(svg: SVGSVGElement, sourceSvg?: SVGSVGElement) {
  const measured = measureLiveSvgElement(svg);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("x");
  clone.removeAttribute("y");
  clone.setAttribute("viewBox", measured.viewBox);
  clone.setAttribute("width", String(measured.width));
  clone.setAttribute("height", String(measured.height));
  clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
  clone.setAttribute("overflow", "visible");

  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }

  if (sourceSvg) {
    inlineSvgPresentationAttributes(sourceSvg, clone);
  }

  return new XMLSerializer().serializeToString(clone);
}

function wrapDiagramSvgWithPadding(svg: string, padding = PREVIEW_EXPORT_PADDING) {
  const sizing = measureSvgContentSize(svg, padding);
  const parsed = new DOMParser().parseFromString(normalizeSvgForImage(svg), "image/svg+xml");
  const root = parsed.documentElement;

  if (!root || root.nodeName.toLowerCase() !== "svg") {
    return svg;
  }

  root.removeAttribute("x");
  root.removeAttribute("y");
  root.setAttribute("viewBox", sizing.viewBox);
  root.setAttribute("width", "100%");
  root.removeAttribute("height");
  root.setAttribute("preserveAspectRatio", "xMidYMid meet");
  root.setAttribute("overflow", "visible");

  return new XMLSerializer().serializeToString(root);
}

async function resolveDiagramMarkupForExport(
  previewRoot: HTMLElement | null,
  segment: Extract<PreviewSegment, { kind: "diagram" }>,
) {
  if (segment.engine === "mermaid") {
    try {
      return await renderMermaidSvg(segment.source, `${segment.id}-export`);
    } catch {
      // Fall back to cached or live SVG below.
    }
  }

  if (segment.engine === "plantuml") {
    try {
      return await renderPlantUmlSvg(segment.source);
    } catch {
      // Fall back to cached or live SVG below.
    }
  }

  const resolved = resolveDiagramSvgForExport(previewRoot, segment);
  try {
    if (resolved?.svg) {
      return new XMLSerializer().serializeToString(resolved.svg);
    }
    return segment.svg ?? null;
  } finally {
    resolved?.cleanup?.();
  }
}

function serializeDiagramMarkupForRaster(svgMarkup: string) {
  const measured = measureSvgContentSize(svgMarkup);
  const parsed = new DOMParser().parseFromString(normalizeSvgForImage(svgMarkup), "image/svg+xml");
  const root = parsed.documentElement;

  if (!root || root.nodeName.toLowerCase() !== "svg") {
    throw new Error("Diagram SVG를 읽지 못했습니다.");
  }

  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  root.setAttribute("viewBox", measured.viewBox);
  root.setAttribute("width", String(measured.width));
  root.setAttribute("height", String(measured.height));
  root.setAttribute("preserveAspectRatio", "xMidYMid meet");
  root.setAttribute("overflow", "visible");

  return {
    measured,
    serialized: new XMLSerializer().serializeToString(root),
  };
}

async function rasterizeDiagramMarkup(svgMarkup: string) {
  if (typeof document.fonts?.ready !== "undefined") {
    await document.fonts.ready;
  }

  const { measured, serialized } = serializeDiagramMarkupForRaster(svgMarkup);
  const scale = getRasterScale(measured.width, measured.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(measured.width * scale));
  canvas.height = Math.max(1, Math.ceil(measured.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas를 초기화하지 못했습니다.");
  }

  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, measured.width, measured.height);

  let rendered = false;
  const imageUrl = URL.createObjectURL(new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }));

  try {
    try {
      const image = await loadSvgImage(imageUrl);
      if (typeof image.decode === "function") {
        await image.decode();
      }
      context.drawImage(image, 0, 0, measured.width, measured.height);
      rendered = true;
    } catch {
      try {
        const image = await loadSvgImage(makeSvgDataUrl(serialized));
        if (typeof image.decode === "function") {
          await image.decode();
        }
        context.drawImage(image, 0, 0, measured.width, measured.height);
        rendered = true;
      } catch {
        rendered = false;
      }
    }
  } finally {
    URL.revokeObjectURL(imageUrl);
  }

  if (!rendered) {
    try {
      const { Canvg } = await import("canvg");
      const renderer = await Canvg.from(context, serialized, {
        ignoreMouse: true,
        ignoreAnimation: true,
        enableRedraw: false,
      });
      await renderer.ready();
      await renderer.render();
    } catch {
      throw new Error("Diagram PNG을 만들지 못했습니다.");
    }
  }

  return {
    dataUrl: await blobToDataUrl(await canvasToPngBlob(canvas)),
    width: measured.width,
    height: measured.height,
  };
}

async function rasterizeDiagramSegment(
  previewRoot: HTMLElement | null,
  segment: Extract<PreviewSegment, { kind: "diagram" }>,
) {
  const markup = await resolveDiagramMarkupForExport(previewRoot, segment);
  if (!markup) {
    throw new Error("Diagram SVG를 찾지 못했습니다.");
  }

  return rasterizeDiagramMarkup(markup);
}

function measureSvgContentSize(svg: string, padding = EMBEDDED_SVG_PADDING): MeasuredSvgContent {
  const fallbackSize = parseSvgSize(svg);
  const fallbackViewBox = `0 0 ${fallbackSize.width} ${fallbackSize.height}`;
  const normalized = normalizeSvgForImage(svg);
  const parsed = new DOMParser().parseFromString(normalized, "image/svg+xml");
  const root = parsed.documentElement;

  if (!root || root.nodeName.toLowerCase() !== "svg") {
    return { viewBox: fallbackViewBox, width: fallbackSize.width, height: fallbackSize.height };
  }

  const probe = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  probe.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  probe.style.position = "fixed";
  probe.style.left = "-100000px";
  probe.style.top = "0";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";

  const clone = root.cloneNode(true) as SVGSVGElement;
  probe.appendChild(clone);
  document.body.appendChild(probe);

  try {
    const bbox = clone.getBBox();
    if (bbox.width > 0 && bbox.height > 0) {
      const width = Math.ceil(bbox.width + padding * 2);
      const height = Math.ceil(bbox.height + padding * 2);
      return {
        viewBox: `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`,
        width,
        height,
      };
    }
  } catch {
    // Fall back to declared SVG dimensions when getBBox is unavailable.
  } finally {
    document.body.removeChild(probe);
  }

  return { viewBox: fallbackViewBox, width: fallbackSize.width, height: fallbackSize.height };
}

function normalizeSvgForImage(svg: string) {
  let normalized = svg.trim();

  if (/<svg[\s>]/i.test(normalized) && !/<svg[^>]+xmlns=/i.test(normalized)) {
    normalized = normalized.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  if (/\bxlink:href=/i.test(normalized) && !/<svg[^>]+xmlns:xlink=/i.test(normalized)) {
    normalized = normalized.replace(/<svg/i, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }

  return normalized;
}

function makeSvgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalizeSvgForImage(svg))}`;
}

const MAX_RASTER_SIDE = 8192;

function prepareSvgForRaster(svg: string) {
  return normalizeSvgForImage(svg).replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("PNG data URL을 만들지 못했습니다."));
    };
    reader.onerror = () => reject(new Error("PNG data URL을 만들지 못했습니다."));
    reader.readAsDataURL(blob);
  });
}

function getRasterScale(width: number, height: number) {
  const largestSide = Math.max(width, height, 1);
  return Math.min(2, MAX_RASTER_SIDE / largestSide);
}

type ExportTextSpan = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
};

type MarkdownExportBlock =
  | { kind: "text"; spans: ExportTextSpan[]; variant: string }
  | { kind: "rule" }
  | { kind: "table"; headers: ExportTextSpan[][]; rows: ExportTextSpan[][][] };

function getTextContent(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeSpans(spans: ExportTextSpan[]) {
  const merged: ExportTextSpan[] = [];

  for (const span of spans) {
    if (!span.text) continue;

    const last = merged[merged.length - 1];
    if (
      last &&
      Boolean(last.bold) === Boolean(span.bold) &&
      Boolean(last.italic) === Boolean(span.italic) &&
      Boolean(last.code) === Boolean(span.code)
    ) {
      last.text += span.text;
      continue;
    }

    merged.push({ ...span });
  }

  return merged;
}

function getInlineSpans(element: Element): ExportTextSpan[] {
  const spans: ExportTextSpan[] = [];

  const walk = (node: Node, style: Pick<ExportTextSpan, "bold" | "italic" | "code">) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text) {
        spans.push({ text, ...style });
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const tag = (node as Element).tagName.toLowerCase();

    if (tag === "strong" || tag === "b") {
      Array.from(node.childNodes).forEach((child) => walk(child, { ...style, bold: true }));
      return;
    }

    if (tag === "em" || tag === "i") {
      Array.from(node.childNodes).forEach((child) => walk(child, { ...style, italic: true }));
      return;
    }

    if (tag === "code") {
      Array.from(node.childNodes).forEach((child) => walk(child, { ...style, code: true }));
      return;
    }

    Array.from(node.childNodes).forEach((child) => walk(child, style));
  };

  walk(element, {});
  return normalizeSpans(spans);
}

function collapseSpansText(spans: ExportTextSpan[]) {
  return getTextContent(spans.map((span) => span.text).join(""));
}

function estimateTextWidth(text: string, size: number, bold = false) {
  const latinFactor = bold ? 0.58 : 0.52;
  let width = 0;

  for (const character of text) {
    width += character.charCodeAt(0) > 0x2e7f ? size : size * latinFactor;
  }

  return width;
}

function appendRichToken(line: ExportTextSpan[], token: ExportTextSpan, separator: string) {
  const last = line[line.length - 1];
  if (
    last &&
    Boolean(last.bold) === Boolean(token.bold) &&
    Boolean(last.italic) === Boolean(token.italic) &&
    Boolean(last.code) === Boolean(token.code)
  ) {
    last.text += separator + token.text;
    return;
  }

  line.push({ ...token });
}

function tokenNeedsLeadingSpace(previousText: string, nextText: string, fallbackSeparator: string) {
  if (!previousText || !nextText) {
    return fallbackSeparator;
  }

  if (fallbackSeparator) {
    return fallbackSeparator;
  }

  const previousChar = previousText.slice(-1);
  const nextChar = nextText[0];
  const previousIsAscii = /^[\u0000-\u007f]$/.test(previousChar);
  const nextIsAscii = /^[\u0000-\u007f]$/.test(nextChar);

  if (previousIsAscii !== nextIsAscii) {
    return " ";
  }

  return "";
}

function wrapRichTextLines(spans: ExportTextSpan[], maxWidth: number, size: number) {
  const normalized = normalizeSpans(spans.filter((span) => span.text.length > 0));
  if (!normalized.length) {
    return [[{ text: "" }]] as ExportTextSpan[][];
  }

  const lines: ExportTextSpan[][] = [];
  let currentLine: ExportTextSpan[] = [];
  let currentWidth = 0;

  const pushLine = () => {
    if (!currentLine.length) {
      return;
    }

    lines.push(normalizeSpans(currentLine));
    currentLine = [];
    currentWidth = 0;
  };

  const pushToken = (token: ExportTextSpan, wordSeparator = " ") => {
    const lastText = currentLine[currentLine.length - 1]?.text ?? "";
    const separator = currentLine.length ? tokenNeedsLeadingSpace(lastText, token.text, wordSeparator) : "";
    const tokenWidth = estimateTextWidth(token.text, size, token.bold);
    const separatorWidth = separator ? size * 0.3 : 0;

    if (currentLine.length && currentWidth + separatorWidth + tokenWidth > maxWidth) {
      pushLine();
    }

    if (tokenWidth > maxWidth) {
      pushLine();
      for (const character of token.text) {
        const charToken = { ...token, text: character };
        const charWidth = estimateTextWidth(character, size, token.bold);
        if (currentLine.length && currentWidth + charWidth > maxWidth) {
          pushLine();
        }
        appendRichToken(currentLine, charToken, "");
        currentWidth += charWidth;
      }
      return;
    }

    if (currentLine.length) {
      currentWidth += separatorWidth;
    }

    appendRichToken(currentLine, token, separator);
    currentWidth += tokenWidth;
  };

  for (const span of normalized) {
    let pendingSeparator = "";
    const chunks = span.text.split(/(\s+)/);

    for (const chunk of chunks) {
      if (!chunk) {
        continue;
      }

      if (/^\s+$/.test(chunk)) {
        pendingSeparator = " ";
        continue;
      }

      const fallbackSeparator = /^[\u0000-\u007f]+$/.test(chunk) ? " " : "";
      const separator = pendingSeparator || fallbackSeparator;
      pendingSeparator = "";
      pushToken({ ...span, text: chunk }, separator);
    }
  }

  pushLine();
  return lines.length ? lines : [[{ text: "" }]];
}

function wrapExportText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }

      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars));
      }
      continue;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [""];
}

function renderSvgTextLines(
  lines: string[],
  x: number,
  y: number,
  options: {
    color?: string;
    family?: string;
    size?: number;
    weight?: number;
    lineHeight?: number;
  } = {},
) {
  const color = options.color ?? "#111827";
  const family = options.family ?? "Segoe UI, Pretendard, Noto Sans KR, Arial, sans-serif";
  const size = options.size ?? 17;
  const weight = options.weight ?? 400;
  const lineHeight = options.lineHeight ?? Math.round(size * 1.55);

  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" fill="${color}" font-family="${escapeHtml(
          family,
        )}" font-size="${size}" font-weight="${weight}">${escapeHtml(line)}</text>`,
    )
    .join("");
}

function renderSvgRichTextLines(
  lines: ExportTextSpan[][],
  x: number,
  baselineY: number,
  options: {
    color?: string;
    family?: string;
    size?: number;
    weight?: number;
    lineHeight?: number;
  } = {},
) {
  const color = options.color ?? "#111827";
  const family = options.family ?? "Segoe UI, Pretendard, Noto Sans KR, Arial, sans-serif";
  const size = options.size ?? 17;
  const weight = options.weight ?? 400;
  const lineHeight = options.lineHeight ?? 1.72;
  const lineHeightPx = Math.round(size * lineHeight);

  return lines
    .map((spans, lineIndex) => {
      const lineY = baselineY + lineIndex * lineHeightPx;
      const normalized = normalizeSpans(spans.filter((span) => span.text.length > 0));

      if (!normalized.length) {
        return `<text x="${x}" y="${lineY}" fill="${color}" font-family="${escapeHtml(
          family,
        )}" font-size="${size}" font-weight="${weight}"></text>`;
      }

      if (
        normalized.length === 1 &&
        !normalized[0].bold &&
        !normalized[0].italic &&
        !normalized[0].code
      ) {
        return `<text x="${x}" y="${lineY}" fill="${color}" font-family="${escapeHtml(
          family,
        )}" font-size="${size}" font-weight="${weight}">${escapeHtml(normalized[0].text)}</text>`;
      }

      const tspans = normalized
        .map((span, spanIndex) => {
          const spanWeight = span.bold ? 700 : weight;
          const spanColor = span.code ? "#0f172a" : color;
          const fontStyle = span.italic ? ' font-style="italic"' : "";
          const attrs =
            spanIndex === 0
              ? ` fill="${spanColor}" font-weight="${spanWeight}"${fontStyle}`
              : ` fill="${spanColor}" font-weight="${spanWeight}"${fontStyle}`;

          return `<tspan${attrs}>${escapeHtml(span.text)}</tspan>`;
        })
        .join("");

      return `<text x="${x}" y="${lineY}" fill="${color}" font-family="${escapeHtml(
        family,
      )}" font-size="${size}">${tspans}</text>`;
    })
    .join("");
}

function getMarkdownExportBlocks(html: string) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const blocks: MarkdownExportBlock[] = [];

  const addRichText = (element: Element, variant: string, prefix = "") => {
    const spans = prefix
      ? normalizeSpans([{ text: prefix }, ...getInlineSpans(element)])
      : getInlineSpans(element);
    if (collapseSpansText(spans)) {
      blocks.push({ kind: "text", spans, variant });
    }
  };

  const getRowCellSpans = (row: Element) => Array.from(row.children).map((cell) => getInlineSpans(cell));

  const visit = (element: Element) => {
    const tagName = element.tagName.toLowerCase();

    if (/^h[1-6]$/.test(tagName)) {
      addRichText(element, tagName);
      return;
    }

    if (tagName === "p") {
      addRichText(element, "p");
      return;
    }

    if (tagName === "blockquote") {
      addRichText(element, "quote");
      return;
    }

    if (tagName === "hr") {
      blocks.push({ kind: "rule" });
      return;
    }

    if (tagName === "ul" || tagName === "ol") {
      Array.from(element.children).forEach((child, index) => {
        const marker = tagName === "ol" ? `${index + 1}. ` : "- ";
        addRichText(child, "li", marker);
      });
      return;
    }

    if (tagName === "table") {
      const headerRow = element.querySelector("thead tr");
      const headers = headerRow ? getRowCellSpans(headerRow) : [];
      const bodyRows = Array.from(element.querySelectorAll("tbody tr"))
        .map(getRowCellSpans)
        .filter((row) => row.some((cell) => collapseSpansText(cell)));
      const allRows = Array.from(element.querySelectorAll("tr"))
        .map(getRowCellSpans)
        .filter((row) => row.some((cell) => collapseSpansText(cell)));
      const fallbackHeaders = headers.length ? headers : allRows[0] ?? [];
      const rows = bodyRows.length ? bodyRows : allRows.slice(fallbackHeaders.length ? 1 : 0);

      if (fallbackHeaders.length || rows.length) {
        blocks.push({ kind: "table", headers: fallbackHeaders, rows });
      }
      return;
    }

    const table = element.querySelector(":scope > table");
    if (table) {
      visit(table);
      return;
    }

    if (element.children.length) {
      Array.from(element.children).forEach(visit);
      return;
    }

    addRichText(element, "p");
  };

  Array.from(parsed.body.children).forEach(visit);
  return blocks;
}

function getTextVariantStyle(variant: string) {
  if (variant === "h1") return { size: 30, weight: 700, color: "#0f172a", lineHeight: 1.25 };
  if (variant === "h2") return { size: 23, weight: 700, color: "#0f172a", lineHeight: 1.25 };
  if (variant === "h3") return { size: 20, weight: 700, color: "#111827", lineHeight: 1.25 };
  if (variant === "quote") return { size: 17, weight: 400, color: "#475569", lineHeight: 1.72 };
  if (variant === "li") return { size: 17, weight: 400, color: "#111827", lineHeight: 1.72 };
  return { size: 17, weight: 400, color: "#111827", lineHeight: 1.72 };
}

function positionEmbeddedSvg(
  svg: string,
  x: number,
  y: number,
  width: number,
  height: number,
  measured?: MeasuredSvgContent,
) {
  const sizing = measured ?? measureSvgContentSize(svg);
  const parsed = new DOMParser().parseFromString(normalizeSvgForImage(svg), "image/svg+xml");
  const root = parsed.documentElement;

  if (!root || root.nodeName.toLowerCase() !== "svg") {
    return "";
  }

  root.setAttribute("viewBox", sizing.viewBox);
  root.setAttribute("x", String(x));
  root.setAttribute("y", String(y));
  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));
  root.setAttribute("preserveAspectRatio", "xMidYMin meet");
  root.setAttribute("overflow", "visible");

  return new XMLSerializer().serializeToString(root);
}

type MarkdownExportOptions = {
  previewRoot?: HTMLElement | null;
  rasterizeDiagrams?: boolean;
};

type DiagramRaster = {
  dataUrl: string;
  width: number;
  height: number;
};

async function buildMarkdownExportSvg(segments: PreviewSegment[], options: MarkdownExportOptions = {}) {
  const diagramRasters = new Map<string, DiagramRaster>();

  if (options.rasterizeDiagrams && options.previewRoot) {
    const diagramSegments = segments.filter(
      (segment): segment is Extract<PreviewSegment, { kind: "diagram" }> =>
        segment.kind === "diagram" && segment.status === "ready",
    );

    await Promise.all(
      diagramSegments.map(async (segment) => {
        try {
          diagramRasters.set(segment.id, await rasterizeDiagramSegment(options.previewRoot ?? null, segment));
        } catch {
          // Fall back to vector embedding when rasterization fails.
        }
      }),
    );
  }
  const width = SVG_EXPORT_PAGE_WIDTH;
  const padding = MARKDOWN_EXPORT_PADDING;
  const contentWidth = width - padding * 2;
  const parts: string[] = [];
  let y = padding;

  const appendRichText = (spans: ExportTextSpan[], variant: string) => {
    const style = getTextVariantStyle(variant);
    const lineHeightPx = Math.round(style.size * style.lineHeight);
    const lines = wrapRichTextLines(spans, contentWidth, style.size);
    const blockHeight = lines.length * lineHeightPx;
    const textX = variant === "quote" ? padding + 18 : padding;

    if (variant === "quote") {
      parts.push(`<rect x="${padding}" y="${y}" width="3" height="${blockHeight}" fill="#2563eb" opacity="0.55" />`);
    }

    parts.push(
      renderSvgRichTextLines(lines, textX, y + style.size, {
        color: style.color,
        size: style.size,
        weight: style.weight,
        lineHeight: style.lineHeight,
      }),
    );
    y += blockHeight + MARKDOWN_BLOCK_GAP;
  };

  const appendRule = () => {
    parts.push(
      `<line x1="${padding}" y1="${y + 0.5}" x2="${width - padding}" y2="${y + 0.5}" stroke="#cbd5e1" stroke-width="1" />`,
    );
    y += 1 + MARKDOWN_BLOCK_GAP;
  };

  const appendCode = (code: string, language: string) => {
    const size = 15;
    const lineHeight = 24;
    const maxChars = Math.max(20, Math.floor((contentWidth - 32) / (size * 0.62)));
    const lines = code
      .replace(/\r\n/g, "\n")
      .split("\n")
      .flatMap((line) => wrapExportText(line || " ", maxChars));
    const title = language ? `${language} code` : "code";
    const blockHeight = lines.length * lineHeight + 54;

    parts.push(`<rect x="${padding}" y="${y}" width="${contentWidth}" height="${blockHeight}" rx="12" fill="#f8fafc" stroke="#cbd5e1" />`);
    parts.push(renderSvgTextLines([title], padding + 18, y + 26, { color: "#64748b", size: 13, weight: 700 }));
    parts.push(
      renderSvgTextLines(lines, padding + 18, y + 58, {
        color: "#111827",
        family: "Consolas, SFMono-Regular, Menlo, monospace",
        size,
        lineHeight,
      }),
    );
    y += blockHeight + 20;
  };

  const appendTable = (block: Extract<MarkdownExportBlock, { kind: "table" }>) => {
    const sourceRows = [
      ...(block.headers.length ? [{ cells: block.headers, isHeader: true }] : []),
      ...block.rows.map((row) => ({ cells: row, isHeader: false })),
    ];
    const columnCount = Math.max(1, ...sourceRows.map((row) => row.cells.length));
    const columnWidth = contentWidth / columnCount;
    const fontSize = 14;
    const lineHeight = 21;
    const cellPaddingX = 10;
    const cellPaddingY = 9;
    let rowY = y;

    const normalizeRow = (row: ExportTextSpan[][]) =>
      Array.from({ length: columnCount }, (_value, index) => row[index] ?? [{ text: " " }]);
    const tableRows = sourceRows
      .map((row) => ({ ...row, cells: normalizeRow(row.cells) }))
      .filter((row) => row.isHeader || row.cells.some((cell) => collapseSpansText(cell)));

    if (!tableRows.length) {
      return;
    }

    for (const row of tableRows) {
      const cellMaxWidth = columnWidth - cellPaddingX * 2;
      const wrappedCells = row.cells.map((cell) => wrapRichTextLines(cell, cellMaxWidth, fontSize));
      const rowHeight = Math.max(
        row.isHeader ? 42 : 38,
        Math.max(...wrappedCells.map((lines) => lines.length)) * lineHeight + cellPaddingY * 2,
      );

      wrappedCells.forEach((lines, columnIndex) => {
        const cellX = padding + columnIndex * columnWidth;
        const cellWidth = columnIndex === columnCount - 1 ? width - padding - cellX : columnWidth;
        parts.push(
          `<rect x="${cellX}" y="${rowY}" width="${cellWidth}" height="${rowHeight}" fill="${
            row.isHeader ? "#f1f5f9" : "#ffffff"
          }" stroke="#cbd5e1" />`,
        );
        parts.push(
          renderSvgRichTextLines(lines, cellX + cellPaddingX, rowY + cellPaddingY + fontSize, {
            color: row.isHeader ? "#0f172a" : "#111827",
            size: fontSize,
            weight: row.isHeader ? 700 : 400,
            lineHeight: lineHeight / fontSize,
          }),
        );
      });

      rowY += rowHeight;
    }

    y = rowY + MARKDOWN_BLOCK_GAP;
  };

  const appendDiagram = (segment: Extract<PreviewSegment, { kind: "diagram" }>) => {
    if (segment.status === "error") {
      const message = segment.error ?? "Diagram render failed.";
      const lines = wrapExportText(`${getEngineLabel(segment.engine)}: ${message}`, 92);
      const blockHeight = lines.length * 24 + 34;
      parts.push(`<rect x="${padding}" y="${y}" width="${contentWidth}" height="${blockHeight}" rx="12" fill="#fef2f2" stroke="#fca5a5" />`);
      parts.push(renderSvgTextLines(lines, padding + 18, y + 32, { color: "#991b1b", size: 16, lineHeight: 24 }));
      y += blockHeight + 20;
      return;
    }

    if (!segment.svg) {
      return;
    }

    const raster = diagramRasters.get(segment.id);
    if (raster) {
      const scale = Math.min(1, contentWidth / raster.width);
      const displayWidth = Math.max(1, Math.ceil(raster.width * scale));
      const displayHeight = Math.max(1, Math.ceil(raster.height * scale));
      const x = padding + Math.max(0, (contentWidth - displayWidth) / 2);
      const blockHeight = displayHeight + 28;

      parts.push(`<rect x="${padding}" y="${y}" width="${contentWidth}" height="${blockHeight}" rx="12" fill="#ffffff" stroke="#cbd5e1" />`);
      parts.push(
        `<image x="${x}" y="${y + 14}" width="${displayWidth}" height="${displayHeight}" href="${raster.dataUrl}" xlink:href="${raster.dataUrl}" preserveAspectRatio="xMidYMin meet" />`,
      );
      y += blockHeight + MARKDOWN_BLOCK_GAP;
      return;
    }

    const resolved = resolveDiagramSvgForExport(options.previewRoot ?? null, segment);

    try {
      const svgSource = resolved?.svg
        ? new XMLSerializer().serializeToString(resolved.svg)
        : segment.svg;
      if (!svgSource) {
        return;
      }

      const measured = resolved?.svg ? measureLiveSvgElement(resolved.svg) : measureSvgContentSize(svgSource);
      const scale = Math.min(1, contentWidth / measured.width);
      const displayWidth = Math.max(1, Math.ceil(measured.width * scale));
      const displayHeight = Math.max(1, Math.ceil(measured.height * scale));
      const x = padding + Math.max(0, (contentWidth - displayWidth) / 2);
      const blockHeight = displayHeight + 28;

      parts.push(`<rect x="${padding}" y="${y}" width="${contentWidth}" height="${blockHeight}" rx="12" fill="#ffffff" stroke="#cbd5e1" />`);
      parts.push(positionEmbeddedSvg(svgSource, x, y + 14, displayWidth, displayHeight, measured));
      y += blockHeight + MARKDOWN_BLOCK_GAP;
    } finally {
      resolved?.cleanup?.();
    }
  };

  for (const segment of segments) {
    if (segment.kind === "markdown") {
      for (const block of getMarkdownExportBlocks(segment.html)) {
        if (block.kind === "rule") {
          appendRule();
        } else if (block.kind === "table") {
          appendTable(block);
        } else {
          appendRichText(block.spans, block.variant);
        }
      }
      continue;
    }

    if (segment.kind === "code") {
      appendCode(segment.code, segment.language);
      continue;
    }

    appendDiagram(segment);
  }

  const height = Math.max(120, Math.ceil(y + padding));

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMin meet">`,
    `<rect width="100%" height="100%" fill="#ffffff" />`,
    ...parts,
    "</svg>",
  ].join("");
}

function copyComputedStyles(source: Element, target: Element) {
  const computed = window.getComputedStyle(source);
  const styleParts: string[] = [];

  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    styleParts.push(`${property}:${computed.getPropertyValue(property)};`);
  }

  target.setAttribute("style", styleParts.join(""));

  if (target.tagName.toLowerCase() === "svg" && !target.getAttribute("xmlns")) {
    target.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }

  Array.from(source.children).forEach((child, index) => {
    const targetChild = target.children.item(index);
    if (targetChild) {
      copyComputedStyles(child, targetChild);
    }
  });
}

function normalizeExportCloneForSvg(clone: HTMLElement) {
  clone.style.overflow = "visible";
  clone.style.overflowX = "visible";
  clone.style.overflowY = "visible";
  clone.style.maxHeight = "none";

  clone.querySelectorAll(".diagram-table-scroll").forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    node.style.overflow = "visible";
    node.style.overflowX = "visible";
    node.style.overflowY = "visible";
    node.style.maxHeight = "none";
  });
}

function applyPrintWrapStyles(element: HTMLElement, options?: { preservePre?: boolean }) {
  element.style.whiteSpace = options?.preservePre === false ? "normal" : "pre-wrap";
  element.style.overflowWrap = "anywhere";
  element.style.wordBreak = "break-word";
  element.style.overflow = "visible";
  element.style.overflowX = "visible";
  element.style.overflowY = "visible";
  element.style.maxWidth = "100%";
}

function normalizeExportCloneForPrint(clone: HTMLElement) {
  clone.querySelectorAll("pre, .diagram-code-block").forEach((node) => {
    if (node instanceof HTMLElement) {
      applyPrintWrapStyles(node);
    }
  });

  clone.querySelectorAll("pre code, .diagram-code-block code").forEach((node) => {
    if (node instanceof HTMLElement) {
      applyPrintWrapStyles(node);
    }
  });

  clone.querySelectorAll("code").forEach((node) => {
    if (!(node instanceof HTMLElement) || node.closest("pre, .diagram-code-block")) {
      return;
    }

    node.style.whiteSpace = "pre-wrap";
    node.style.overflowWrap = "anywhere";
    node.style.wordBreak = "break-word";
  });

  clone.querySelectorAll(".diagram-table-scroll").forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    node.style.overflow = "visible";
    node.style.overflowX = "visible";
    node.style.overflowY = "visible";
    node.style.maxHeight = "none";
  });

  clone.querySelectorAll("table").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.tableLayout = "fixed";
      node.style.width = "100%";
    }
  });

  clone.querySelectorAll("th, td").forEach((node) => {
    if (node instanceof HTMLElement) {
      applyPrintWrapStyles(node, { preservePre: false });
    }
  });

  clone.querySelectorAll("a, p, li, blockquote").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.overflowWrap = "anywhere";
      node.style.wordBreak = "break-word";
    }
  });
}

function buildPreviewExportSvg(element: HTMLElement) {
  const padding = PREVIEW_EXPORT_PADDING;
  const contentWidth = SVG_EXPORT_PAGE_WIDTH - padding * 2;
  const clone = element.cloneNode(true) as HTMLElement;
  copyComputedStyles(element, clone);

  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  clone.style.setProperty("--diagram-zoom", "1");
  clone.style.boxSizing = "border-box";
  clone.style.padding = "0";
  clone.style.margin = "0";
  clone.style.width = `${contentWidth}px`;
  clone.style.minWidth = "0";
  clone.style.maxWidth = "none";
  clone.style.height = "auto";
  clone.style.transform = "none";
  clone.style.transformOrigin = "top left";
  normalizeExportCloneForSvg(clone);

  const exportWidth = contentWidth + padding * 2;
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-100000px";
  wrapper.style.top = "0";
  wrapper.style.width = `${exportWidth}px`;
  wrapper.style.pointerEvents = "none";
  wrapper.style.opacity = "0";
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    const contentHeight = Math.max(1, Math.ceil(clone.scrollHeight || clone.getBoundingClientRect().height || 800));
    const exportHeight = contentHeight + padding * 2;
    const serialized = new XMLSerializer().serializeToString(clone);

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${exportWidth} ${exportHeight}" preserveAspectRatio="xMidYMin meet">`,
      `<rect width="100%" height="100%" fill="#ffffff" />`,
      `<foreignObject x="${padding}" y="${padding}" width="${contentWidth}" height="${contentHeight}">${serialized}</foreignObject>`,
      "</svg>",
    ].join("");
  } finally {
    document.body.removeChild(wrapper);
  }
}

const PRINT_PAGE_CSS = `
  @page {
    margin: 12mm;
    size: A4;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #111827;
  }

  html {
    font-size: 80%;
  }

  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .diagram-print-root {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
  }

  .diagram-print-root .diagram-markdown-document {
    line-height: 1.85;
    gap: 20px;
  }

  .diagram-print-root .diagram-preview-content {
    --diagram-zoom: 1 !important;
    width: auto !important;
    min-width: 0 !important;
    transform: none !important;
    transform-origin: top left !important;
  }

  .diagram-print-root .diagram-table-scroll {
    overflow: visible !important;
    overflow-x: visible !important;
    overflow-y: visible !important;
    max-height: none !important;
  }

  .diagram-print-root pre,
  .diagram-print-root .diagram-code-block,
  .diagram-print-root pre code,
  .diagram-print-root .diagram-code-block code {
    white-space: pre-wrap !important;
    overflow-wrap: anywhere !important;
    word-break: break-word !important;
    overflow: visible !important;
    overflow-x: visible !important;
    overflow-y: visible !important;
    max-width: 100% !important;
    line-height: 1.65 !important;
  }

  .diagram-print-root .diagram-markdown-document :not(pre) > code {
    white-space: pre-wrap !important;
    overflow-wrap: anywhere !important;
    word-break: break-word !important;
  }

  .diagram-print-root table {
    table-layout: fixed !important;
    width: 100% !important;
  }

  .diagram-print-root th,
  .diagram-print-root td {
    white-space: normal !important;
    overflow-wrap: anywhere !important;
    word-break: break-word !important;
    line-height: 1.75;
  }

  .diagram-print-root a,
  .diagram-print-root p,
  .diagram-print-root li,
  .diagram-print-root blockquote {
    overflow-wrap: anywhere !important;
    word-break: break-word !important;
    line-height: 1.85;
  }

  .diagram-print-root h1,
  .diagram-print-root h2,
  .diagram-print-root h3,
  .diagram-print-root h4,
  .diagram-print-root .diagram-svg-wrap,
  .diagram-print-root hr,
  .diagram-print-root .diagram-block-error {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .diagram-print-root pre,
  .diagram-print-root .diagram-code-block,
  .diagram-print-root table {
    break-inside: auto;
    page-break-inside: auto;
  }

  .diagram-print-root h1,
  .diagram-print-root h2,
  .diagram-print-root h3,
  .diagram-print-root h4 {
    break-after: avoid;
    page-break-after: avoid;
    line-height: 1.35;
  }

  .diagram-print-root h1 {
    margin-top: 0.37em !important;
    margin-bottom: 0.37em !important;
  }

  .diagram-print-root h2 {
    margin-top: 0.3em !important;
    margin-bottom: 0.3em !important;
  }

  .diagram-print-root h3 {
    margin-top: 0.25em !important;
    margin-bottom: 0.25em !important;
  }

  .diagram-print-root h4,
  .diagram-print-root h5,
  .diagram-print-root h6 {
    margin-top: 0.2em !important;
    margin-bottom: 0.2em !important;
  }

  .diagram-print-root p,
  .diagram-print-root li {
    orphans: 3;
    widows: 3;
  }

  .diagram-print-root .diagram-svg-wrap svg {
    display: block;
    max-width: 100%;
    height: auto;
  }

  .diagram-print-diagram {
    display: flex;
    justify-content: center;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .diagram-print-diagram svg {
    display: block;
    max-width: 100%;
    height: auto;
  }

  @media screen {
    body {
      padding: 20px 24px;
    }

    .diagram-print-root,
    .diagram-print-diagram {
      max-width: 210mm;
      margin: 0 auto;
    }
  }
`;

function collectPrintStylesheetLinks() {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((node) => {
      if (!(node instanceof HTMLLinkElement) || !node.href) {
        return "";
      }

      return `<link rel="stylesheet" href="${escapeHtml(node.href)}" />`;
    })
    .filter(Boolean)
    .join("\n    ");
}

function preparePrintPreviewClone(previewRoot: HTMLElement) {
  const clone = previewRoot.cloneNode(true) as HTMLElement;
  clone.style.setProperty("--diagram-zoom", "1");
  clone.style.transform = "none";
  clone.style.width = "auto";
  clone.style.minWidth = "0";
  normalizeExportCloneForSvg(clone);
  normalizeExportCloneForPrint(clone);
  return clone.outerHTML;
}

function buildPrintHtmlDocument(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    ${collectPrintStylesheetLinks()}
    <style>${PRINT_PAGE_CSS}</style>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>`;
}

async function waitForPrintWindowReady(printWindow: Window) {
  await new Promise<void>((resolve) => {
    if (printWindow.document.readyState === "complete") {
      resolve();
      return;
    }

    printWindow.addEventListener("load", () => resolve(), { once: true });
  });

  await Promise.all(
    Array.from(printWindow.document.querySelectorAll('link[rel="stylesheet"]')).map(
      (node) =>
        new Promise<void>((resolve) => {
          if (node instanceof HTMLLinkElement && node.sheet) {
            resolve();
            return;
          }

          node.addEventListener("load", () => resolve(), { once: true });
          node.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );

  if (printWindow.document.fonts?.ready) {
    await printWindow.document.fonts.ready;
  }
}

async function openPreviewHtmlDocument(html: string) {
  const previewWindow = window.open("", "_blank");
  if (!previewWindow) {
    throw new Error("Preview window blocked.");
  }

  previewWindow.document.open();
  previewWindow.document.write(html);
  previewWindow.document.close();
  await waitForPrintWindowReady(previewWindow);
  previewWindow.focus();

  return previewWindow;
}

async function openPrintHtmlDocument(html: string) {
  const printWindow = await openPreviewHtmlDocument(html);
  printWindow.print();
  printWindow.onafterprint = () => {
    printWindow.close();
  };

  return printWindow;
}

async function resolveStandalonePrintMarkup(
  engine: RenderEngine | null,
  source: string,
  cachedSvg: string | null,
) {
  if (engine === "mermaid" && source) {
    try {
      return await renderMermaidSvg(source, "print");
    } catch {
      // Fall back to cached SVG below.
    }
  }

  if (engine === "plantuml" && source) {
    try {
      return await renderPlantUmlSvg(source);
    } catch {
      // Fall back to cached SVG below.
    }
  }

  return cachedSvg;
}

function loadSvgImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("SVG image could not be loaded."));
    image.src = source;
  });
}

type SvgEmbeddedImage = {
  href: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function extractSvgEmbeddedImages(svg: string) {
  const parsed = new DOMParser().parseFromString(normalizeSvgForImage(svg), "image/svg+xml");
  const root = parsed.documentElement;

  if (!root || root.nodeName.toLowerCase() !== "svg") {
    return { svgWithoutImages: svg, images: [] as SvgEmbeddedImage[] };
  }

  const images: SvgEmbeddedImage[] = [];

  root.querySelectorAll("image").forEach((node) => {
    const href = node.getAttribute("href") ?? node.getAttribute("xlink:href");
    if (!href) {
      return;
    }

    images.push({
      href,
      x: Number.parseFloat(node.getAttribute("x") ?? "0"),
      y: Number.parseFloat(node.getAttribute("y") ?? "0"),
      width: Number.parseFloat(node.getAttribute("width") ?? "0"),
      height: Number.parseFloat(node.getAttribute("height") ?? "0"),
    });
    node.remove();
  });

  return {
    svgWithoutImages: new XMLSerializer().serializeToString(root),
    images,
  };
}

async function drawEmbeddedSvgImages(
  context: CanvasRenderingContext2D,
  images: SvgEmbeddedImage[],
) {
  for (const embedded of images) {
    if (embedded.width <= 0 || embedded.height <= 0) {
      continue;
    }

    try {
      const image = await loadSvgImage(embedded.href);
      if (typeof image.decode === "function") {
        await image.decode();
      }
      context.drawImage(image, embedded.x, embedded.y, embedded.width, embedded.height);
    } catch {
      // Skip broken embeds and keep the rest of the export.
    }
  }
}

async function rasterizeSvgMarkupViaBrowserImage(svg: string) {
  const normalizedSvg = normalizeSvgForImage(svg);
  const { width, height } = parseSvgSize(normalizedSvg);
  const scale = getRasterScale(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width * scale));
  canvas.height = Math.max(1, Math.ceil(height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas를 초기화하지 못했습니다.");
  }

  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  const imageUrl = URL.createObjectURL(new Blob([normalizedSvg], { type: "image/svg+xml;charset=utf-8" }));
  let image: HTMLImageElement;

  try {
    try {
      image = await loadSvgImage(imageUrl);
    } catch {
      image = await loadSvgImage(makeSvgDataUrl(normalizedSvg));
    }

    context.drawImage(image, 0, 0, width, height);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("PNG 파일을 만들지 못했습니다."));
      }
    }, "image/png");
  });
}

async function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("PNG 파일을 만들지 못했습니다."));
      }
    }, "image/png");
  });
}

async function drawSvgToCanvas(
  context: CanvasRenderingContext2D,
  svg: string,
  width: number,
  height: number,
) {
  const { Canvg } = await import("canvg");
  const renderer = await Canvg.from(context, svg, {
    ignoreMouse: true,
    ignoreAnimation: true,
    enableRedraw: false,
  });

  renderer.resize(width, height, true);
  await renderer.ready();
  await renderer.render();
}

async function svgToPngBlob(svg: string, options: { stripForeignObject?: boolean } = {}) {
  const stripForeignObject = options.stripForeignObject ?? true;
  const normalizedInput = stripForeignObject ? prepareSvgForRaster(svg) : normalizeSvgForImage(svg);
  const { svgWithoutImages, images } = extractSvgEmbeddedImages(normalizedInput);

  if (images.length === 0) {
    try {
      return await rasterizeSvgMarkupViaBrowserImage(svgWithoutImages);
    } catch {
      // Continue with the Canvg-based pipeline below.
    }
  }

  const normalizedSvg = svgWithoutImages;
  const { width, height } = parseSvgSize(normalizedSvg);
  const scale = getRasterScale(width, height);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width * scale));
  canvas.height = Math.max(1, Math.ceil(height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas를 초기화하지 못했습니다.");
  }

  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  try {
    await drawSvgToCanvas(context, normalizedSvg, width, height);
  } catch {
    const imageUrl = URL.createObjectURL(new Blob([normalizedSvg], { type: "image/svg+xml;charset=utf-8" }));
    let image: HTMLImageElement;

    try {
      try {
        image = await loadSvgImage(imageUrl);
      } catch {
        image = await loadSvgImage(makeSvgDataUrl(normalizedSvg));
      }

      context.setTransform(scale, 0, 0, scale, 0, 0);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  await drawEmbeddedSvgImages(context, images);

  return canvasToPngBlob(canvas);
}

async function svgToPdfBlob(svg: string) {
  const normalizedSvg = prepareSvgForRaster(normalizeSvgForImage(svg));
  const { width, height } = parseSvgSize(normalizedSvg);
  const pngBlob = await svgToPngBlob(svg);
  const dataUrl = await blobToDataUrl(pngBlob);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "pt",
    format: [width, height],
    compress: true,
  });

  pdf.addImage(dataUrl, "PNG", 0, 0, width, height, undefined, "SLOW");
  return pdf.output("blob");
}

function usePreviewStyle(zoom: number) {
  return useMemo(
    () =>
      ({
        "--diagram-zoom": String(zoom / 100),
      }) as React.CSSProperties,
    [zoom],
  );
}

function useSourceEditorStyle(fontSize: number) {
  return useMemo(
    () =>
      ({
        "--diagram-source-font-size": `${fontSize}px`,
      }) as React.CSSProperties,
    [fontSize],
  );
}

export function DiagramClient() {
  const [source, setSource] = useState("");
  const [selectedMode, setSelectedMode] = useState<SelectedMode>("auto");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [renderState, setRenderState] = useState<RenderState>(INITIAL_RENDER_STATE);
  const [zoom, setZoom] = useState(100);
  const [sourceFontSize, setSourceFontSize] = useState(() => {
    if (typeof window === "undefined") {
      return SOURCE_FONT_DEFAULT;
    }

    return window.matchMedia("(max-width: 1060px)").matches ? 15 : SOURCE_FONT_DEFAULT;
  });
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [pngState, setPngState] = useState<"idle" | "working" | "failed">("idle");
  const [pdfState, setPdfState] = useState<"idle" | "working" | "failed">("idle");
  const [printState, setPrintState] = useState<"idle" | "working" | "failed">("idle");
  const [previewTabState, setPreviewTabState] = useState<"idle" | "working" | "failed">("idle");
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [isWideWorkbench, setIsWideWorkbench] = useState(false);
  const [workbenchSplitPercent, setWorkbenchSplitPercent] = useState(WORKBENCH_SPLIT_DEFAULT);
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<DiagramHistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [activeHistoryVersion, setActiveHistoryVersion] = useState<number | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [historyMessage, setHistoryMessage] = useState("");
  const [historyComment, setHistoryComment] = useState("");
  const [historyCommentDrafts, setHistoryCommentDrafts] = useState<Record<string, string>>({});
  const renderIdRef = useRef(0);
  const fileDropRef = useRef<HTMLLabelElement | null>(null);
  const previewContentRef = useRef<HTMLDivElement | null>(null);
  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const previewStyle = usePreviewStyle(zoom);
  const sourceEditorStyle = useSourceEditorStyle(sourceFontSize);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          source?: unknown;
          selectedMode?: unknown;
          fileName?: unknown;
          wideWorkbench?: unknown;
          workbenchSplit?: unknown;
          activeHistoryId?: unknown;
          activeHistoryVersion?: unknown;
          sourceFontSize?: unknown;
        };

        if (typeof parsed.source === "string") setSource(parsed.source);
        if (
          typeof parsed.selectedMode === "string" &&
          MODE_OPTIONS.some((option) => option.value === parsed.selectedMode)
        ) {
          setSelectedMode(parsed.selectedMode as SelectedMode);
        }
        if (typeof parsed.fileName === "string") setFileName(parsed.fileName);
        if (typeof parsed.wideWorkbench === "boolean") setIsWideWorkbench(parsed.wideWorkbench);
        if (typeof parsed.workbenchSplit === "number" && Number.isFinite(parsed.workbenchSplit)) {
          setWorkbenchSplitPercent(
            Math.min(WORKBENCH_SPLIT_MAX, Math.max(WORKBENCH_SPLIT_MIN, parsed.workbenchSplit)),
          );
        }
        if (typeof parsed.activeHistoryId === "string") {
          setActiveHistoryId(parsed.activeHistoryId);
        }
        if (typeof parsed.activeHistoryVersion === "number" && Number.isFinite(parsed.activeHistoryVersion)) {
          setActiveHistoryVersion(parsed.activeHistoryVersion);
        }
        if (typeof parsed.sourceFontSize === "number" && Number.isFinite(parsed.sourceFontSize)) {
          setSourceFontSize(
            Math.min(SOURCE_FONT_MAX, Math.max(SOURCE_FONT_MIN, Math.round(parsed.sourceFontSize))),
          );
        }
      }

      setHistoryEntries(readHistoryEntries());
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHasLoadedStorage(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        source,
        selectedMode,
        fileName,
        wideWorkbench: isWideWorkbench,
        workbenchSplit: workbenchSplitPercent,
        activeHistoryId,
        activeHistoryVersion,
        sourceFontSize,
      }),
    );
  }, [
    activeHistoryId,
    activeHistoryVersion,
    fileName,
    hasLoadedStorage,
    isWideWorkbench,
    selectedMode,
    source,
    sourceFontSize,
    workbenchSplitPercent,
  ]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const renderId = renderIdRef.current + 1;
      renderIdRef.current = renderId;
      setRenderState({ status: "loading", engine: resolveEngine(source, selectedMode, fileName) });

      void renderSource(source, selectedMode, fileName).then((nextState) => {
        if (renderIdRef.current === renderId) {
          setRenderState(nextState);
        }
      });
    }, RENDER_DEBOUNCE_MS);

    return () => window.clearTimeout(timerId);
  }, [fileName, selectedMode, source]);

  const updateWorkbenchSplit = useCallback((clientX: number) => {
    const workbench = workbenchRef.current;
    if (!workbench) {
      return;
    }

    const rect = workbench.getBoundingClientRect();
    const usableWidth = Math.max(1, rect.width - WORKBENCH_SPLITTER_WIDTH);
    const nextPercent = ((clientX - rect.left) / usableWidth) * 100;
    setWorkbenchSplitPercent(Math.min(WORKBENCH_SPLIT_MAX, Math.max(WORKBENCH_SPLIT_MIN, nextPercent)));
  }, []);

  const handleSplitterPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizingSplit(true);
    updateWorkbenchSplit(event.clientX);
  }, [updateWorkbenchSplit]);

  const handleSplitterPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isResizingSplit) {
        return;
      }

      updateWorkbenchSplit(event.clientX);
    },
    [isResizingSplit, updateWorkbenchSplit],
  );

  const handleSplitterPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsResizingSplit(false);
  }, []);

  const activeHistoryEntry = useMemo(
    () => historyEntries.find((entry) => entry.id === activeHistoryId) ?? null,
    [activeHistoryId, historyEntries],
  );

  const activeHistorySnapshot = useMemo(() => {
    if (!activeHistoryEntry || activeHistoryVersion === null) {
      return null;
    }

    return getHistoryVersion(activeHistoryEntry, activeHistoryVersion);
  }, [activeHistoryEntry, activeHistoryVersion]);

  useEffect(() => {
    setHistoryComment(activeHistoryEntry?.comment ?? "");
  }, [activeHistoryEntry?.comment, activeHistoryEntry?.id]);

  const historyHasChanges = useMemo(() => {
    if (!activeHistorySnapshot) {
      return Boolean(source.trim());
    }

    return !isSameHistorySnapshot(activeHistorySnapshot, { source, selectedMode, fileName });
  }, [activeHistorySnapshot, fileName, selectedMode, source]);

  const persistHistoryEntries = useCallback((entries: DiagramHistoryEntry[]) => {
    const nextEntries = entries.slice(0, MAX_HISTORY_ENTRIES);
    writeHistoryEntries(nextEntries);
    setHistoryEntries(nextEntries);
  }, []);

  const showHistoryMessage = useCallback((message: string) => {
    setHistoryMessage(message);
    window.setTimeout(() => setHistoryMessage(""), 2200);
  }, []);

  const loadHistorySnapshot = useCallback(
    (entry: DiagramHistoryEntry, version: DiagramHistoryVersion) => {
      setSource(version.source);
      setSelectedMode(version.selectedMode);
      setFileName(version.fileName);
      setFileError("");
      setActiveHistoryId(entry.id);
      setActiveHistoryVersion(version.version);
      showHistoryMessage(`${entry.title} v${version.version}을 불러왔습니다.`);
    },
    [showHistoryMessage],
  );

  const saveToHistory = useCallback(() => {
    if (!source.trim()) {
      showHistoryMessage("저장할 소스가 없습니다.");
      return;
    }

    const now = new Date().toISOString();
    const snapshot = {
      source,
      selectedMode,
      fileName,
      savedAt: now,
    };

    if (activeHistoryId && activeHistoryEntry) {
      const latestVersion = activeHistoryEntry.versions[activeHistoryEntry.versions.length - 1];
      if (
        activeHistorySnapshot &&
        isSameHistorySnapshot(activeHistorySnapshot, { source, selectedMode, fileName })
      ) {
        showHistoryMessage("변경 사항이 없습니다.");
        return;
      }

      const nextVersionNumber = (latestVersion?.version ?? 0) + 1;
      const nextVersion: DiagramHistoryVersion = {
        version: nextVersionNumber,
        ...snapshot,
      };
      const nextEntry: DiagramHistoryEntry = {
        ...activeHistoryEntry,
        title: getHistoryTitle(source, fileName),
        comment: normalizeHistoryComment(historyComment),
        updatedAt: now,
        versions: [...activeHistoryEntry.versions, nextVersion],
      };
      const nextEntries = [
        nextEntry,
        ...historyEntries.filter((entry) => entry.id !== activeHistoryEntry.id),
      ];

      persistHistoryEntries(nextEntries);
      setActiveHistoryVersion(nextVersionNumber);
      showHistoryMessage(`${nextEntry.title} v${nextVersionNumber}을 저장했습니다.`);
      return;
    }

    const id = createHistoryId();
    const title = getHistoryTitle(source, fileName);
    const nextEntry: DiagramHistoryEntry = {
      id,
      title,
      comment: normalizeHistoryComment(historyComment),
      createdAt: now,
      updatedAt: now,
      versions: [{ version: 1, ...snapshot }],
    };

    persistHistoryEntries([nextEntry, ...historyEntries]);
    setActiveHistoryId(id);
    setActiveHistoryVersion(1);
    showHistoryMessage(`${title} v1을 저장했습니다.`);
  }, [
    activeHistoryEntry,
    activeHistoryId,
    activeHistorySnapshot,
    fileName,
    historyComment,
    historyEntries,
    persistHistoryEntries,
    selectedMode,
    showHistoryMessage,
    source,
  ]);

  const loadHistoryEntry = useCallback(
    (entryId: string, version?: number) => {
      const entry = historyEntries.find((item) => item.id === entryId);
      if (!entry) {
        showHistoryMessage("이력을 찾지 못했습니다.");
        return;
      }

      const targetVersion = getHistoryVersion(entry, version);
      if (!targetVersion) {
        showHistoryMessage("버전을 찾지 못했습니다.");
        return;
      }

      loadHistorySnapshot(entry, targetVersion);
    },
    [historyEntries, loadHistorySnapshot, showHistoryMessage],
  );

  const updateHistoryComment = useCallback(
    (entryId: string, comment: string) => {
      const normalized = normalizeHistoryComment(comment);
      const target = historyEntries.find((entry) => entry.id === entryId);
      if (!target || (target.comment ?? "") === normalized) {
        return;
      }

      persistHistoryEntries(
        historyEntries.map((entry) =>
          entry.id === entryId ? { ...entry, comment: normalized } : entry,
        ),
      );
      setHistoryCommentDrafts((current) => {
        if (!(entryId in current)) {
          return current;
        }

        const next = { ...current };
        delete next[entryId];
        return next;
      });

      if (activeHistoryId === entryId) {
        setHistoryComment(normalized);
      }

      showHistoryMessage("메모를 저장했습니다.");
    },
    [activeHistoryId, historyEntries, persistHistoryEntries, showHistoryMessage],
  );

  const getHistoryCommentInputValue = useCallback(
    (entry: DiagramHistoryEntry) => {
      if (entry.id in historyCommentDrafts) {
        return historyCommentDrafts[entry.id];
      }

      return entry.comment ?? "";
    },
    [historyCommentDrafts],
  );

  const commitHistoryCommentDraft = useCallback(
    (entryId: string) => {
      const entry = historyEntries.find((item) => item.id === entryId);
      if (!entry) {
        return;
      }

      updateHistoryComment(entryId, getHistoryCommentInputValue(entry));
    },
    [getHistoryCommentInputValue, historyEntries, updateHistoryComment],
  );

  const deleteHistoryEntry = useCallback(
    (entryId: string) => {
      const target = historyEntries.find((entry) => entry.id === entryId);
      if (!target) {
        return;
      }

      if (!window.confirm(`"${target.title}" 이력과 모든 버전을 삭제할까요?`)) {
        return;
      }

      persistHistoryEntries(historyEntries.filter((entry) => entry.id !== entryId));
      if (activeHistoryId === entryId) {
        setActiveHistoryId(null);
        setActiveHistoryVersion(null);
      }
      if (expandedHistoryId === entryId) {
        setExpandedHistoryId(null);
      }
      showHistoryMessage(`"${target.title}" 이력을 삭제했습니다.`);
    },
    [activeHistoryId, expandedHistoryId, historyEntries, persistHistoryEntries, showHistoryMessage],
  );

  const startNewDraft = useCallback(() => {
    setSource("");
    setFileName("");
    setFileError("");
    setSelectedMode("auto");
    setActiveHistoryId(null);
    setActiveHistoryVersion(null);
    setExpandedHistoryId(null);
    setHistoryComment("");
    showHistoryMessage("새 초안을 시작했습니다.");
  }, [showHistoryMessage]);

  const canDownloadPreview =
    renderState.status === "ready" &&
    (Boolean(renderState.svg) || Boolean(renderState.segments?.length));
  const exportBusy =
    pngState === "working" ||
    pdfState === "working" ||
    printState === "working" ||
    previewTabState === "working";
  const canDownloadRaster = canDownloadPreview && !exportBusy;
  const resolvedLabel = getEngineLabel(renderState.engine);
  const selectedModeLabel = selectedMode === "auto" ? "Auto" : getEngineLabel(selectedMode);
  const modeStatusLabel =
    selectedMode === "auto" ? `Auto: ${renderState.engine ? resolvedLabel : "No input"}` : `Mode: ${selectedModeLabel}`;
  const sourceSizeLabel = formatBytes(getSourceByteLength(source));
  const sourceLineCount = useMemo(() => {
    if (!source) return 0;
    return source.split(/\r\n|\r|\n/).length;
  }, [source]);
  const sourceMetaLabel = useMemo(() => {
    const parts: string[] = [];

    if (activeHistoryEntry && activeHistoryVersion !== null) {
      const commentLabel = activeHistoryEntry.comment ? ` · ${activeHistoryEntry.comment}` : "";
      parts.push(`${activeHistoryEntry.title}${commentLabel} · v${activeHistoryVersion}`);
    } else if (fileName) {
      parts.push(fileName);
    }

    parts.push(`${sourceLineCount} lines`, sourceSizeLabel);
    return parts.join(" · ");
  }, [activeHistoryEntry, activeHistoryVersion, fileName, sourceLineCount, sourceSizeLabel]);
  const previewMetaLabel =
    renderState.status === "idle"
      ? "소스를 입력하면 렌더 결과가 표시됩니다."
      : `${resolvedLabel}${renderState.engine === "markdown" && renderState.segments ? ` · ${renderState.segments.length} blocks` : ""}`;
  const renderStatusClass =
    renderState.status === "ready"
      ? "success"
      : renderState.status === "loading"
        ? "accent"
        : renderState.status === "error"
          ? "danger"
          : "neutral";

  const loadFile = useCallback(async (file: File) => {
    const extension = getExtension(file.name);
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setFileError("지원하지 않는 파일 형식입니다.");
      return;
    }

    if (file.size > MAX_SOURCE_BYTES) {
      setFileError(`파일이 너무 큽니다. ${formatBytes(file.size)} / 최대 1 MB`);
      return;
    }

    try {
      const text = await file.text();
      setSource(text);
      setFileName(file.name);
      setFileError("");
      setActiveHistoryId(null);
      setActiveHistoryVersion(null);
    } catch {
      setFileError("파일을 읽지 못했습니다.");
    }
  }, []);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    try {
      if (file) await loadFile(file);
    } finally {
      event.target.value = "";
    }
  }

  useEffect(() => {
    const dropZone = fileDropRef.current;
    if (!dropZone) return;
    const dropZoneElement = dropZone;

    function isDropZoneEvent(event: DragEvent) {
      const target = event.target;
      return target instanceof Node && dropZoneElement.contains(target);
    }

    function handleDragEnter(event: DragEvent) {
      if (!isDropZoneEvent(event)) return;
      event.preventDefault();
      setIsFileDragging(true);
    }

    function handleDragOver(event: DragEvent) {
      if (!isDropZoneEvent(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      setIsFileDragging(true);
    }

    function handleDragLeave(event: DragEvent) {
      if (!isDropZoneEvent(event)) return;
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && dropZoneElement.contains(nextTarget)) return;
      setIsFileDragging(false);
    }

    function handleDrop(event: DragEvent) {
      if (!isDropZoneEvent(event)) return;
      event.preventDefault();
      setIsFileDragging(false);

      const file = event.dataTransfer?.files[0];
      if (file) void loadFile(file);
    }

    window.addEventListener("dragenter", handleDragEnter, true);
    window.addEventListener("dragover", handleDragOver, true);
    window.addEventListener("dragleave", handleDragLeave, true);
    window.addEventListener("drop", handleDrop, true);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter, true);
      window.removeEventListener("dragover", handleDragOver, true);
      window.removeEventListener("dragleave", handleDragLeave, true);
      window.removeEventListener("drop", handleDrop, true);
    };
  }, [loadFile]);

  async function copySource() {
    try {
      await window.navigator.clipboard.writeText(source);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  function extractPreviewSvgFromDom() {
    const svg = previewContentRef.current?.querySelector("svg");
    if (!(svg instanceof SVGSVGElement)) {
      return null;
    }

    return new XMLSerializer().serializeToString(svg);
  }

  async function getExportSvg() {
    if (renderState.engine === "markdown" && renderState.segments?.length) {
      return buildMarkdownExportSvg(renderState.segments, {
        previewRoot: previewContentRef.current,
        rasterizeDiagrams: false,
      });
    }

    if (renderState.engine !== "markdown" && renderState.svg) {
      const liveSvg = previewContentRef.current?.querySelector("svg");
      if (liveSvg instanceof SVGSVGElement) {
        return prepareStandaloneDiagramSvg(liveSvg, liveSvg);
      }

      return wrapDiagramSvgWithPadding(renderState.svg);
    }

    if (previewContentRef.current) {
      return buildPreviewExportSvg(previewContentRef.current);
    }

    return null;
  }

  async function resolveStandaloneMarkupForRaster() {
    if (!renderState.svg) {
      return null;
    }

    let markup = renderState.svg;

    if (renderState.engine === "mermaid") {
      try {
        markup = await renderMermaidSvg(source, "raster-export");
      } catch {
        // Keep the cached SVG when a fresh render fails.
      }
    } else if (renderState.engine === "plantuml") {
      try {
        markup = await renderPlantUmlSvg(source);
      } catch {
        // Keep the cached SVG when a fresh render fails.
      }
    }

    return markup;
  }

  async function getRasterExportSvg() {
    if (renderState.engine !== "markdown" && renderState.svg) {
      const markup = await resolveStandaloneMarkupForRaster();
      if (!markup) {
        return null;
      }

      return serializeDiagramMarkupForRaster(markup).serialized;
    }

    const previewSvg = extractPreviewSvgFromDom();
    return previewSvg ? serializeDiagramMarkupForRaster(previewSvg).serialized : null;
  }

  async function getDownloadRasterSvg() {
    if (renderState.engine === "markdown" && renderState.segments?.length) {
      return buildMarkdownExportSvg(renderState.segments, {
        previewRoot: previewContentRef.current,
        rasterizeDiagrams: true,
      });
    }

    return getRasterExportSvg();
  }

  async function downloadSvg() {
    const exportSvg = await getExportSvg();
    if (!exportSvg) return;

    const blob = new Blob([exportSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = getDownloadName(fileName, renderState.engine, "svg");
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPng() {
    setPngState("working");

    try {
      const exportSvg = await getDownloadRasterSvg();
      if (!exportSvg) {
        setPngState("idle");
        return;
      }

      const blob = await svgToPngBlob(exportSvg);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = getDownloadName(fileName, renderState.engine, "png");
      anchor.click();
      URL.revokeObjectURL(url);
      setPngState("idle");
    } catch {
      setPngState("failed");
      window.setTimeout(() => setPngState("idle"), 2200);
    }
  }

  async function downloadPdf() {
    setPdfState("working");

    try {
      const exportSvg = await getDownloadRasterSvg();
      if (!exportSvg) {
        setPdfState("idle");
        return;
      }

      const blob = await svgToPdfBlob(exportSvg);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = getDownloadName(fileName, renderState.engine, "pdf");
      anchor.click();
      URL.revokeObjectURL(url);
      setPdfState("idle");
    } catch {
      setPdfState("failed");
      window.setTimeout(() => setPdfState("idle"), 2200);
    }
  }

  async function buildPreviewExportBodyHtml() {
    if (renderState.engine === "markdown" && previewContentRef.current) {
      return `<div class="diagram-print-root">${preparePrintPreviewClone(previewContentRef.current)}</div>`;
    }

    const standaloneMarkup = await resolveStandalonePrintMarkup(
      renderState.engine,
      source,
      renderState.svg ?? null,
    );

    if (standaloneMarkup) {
      return `<div class="diagram-print-diagram">${standaloneMarkup}</div>`;
    }

    if (previewContentRef.current) {
      return `<div class="diagram-print-root">${preparePrintPreviewClone(previewContentRef.current)}</div>`;
    }

    return null;
  }

  async function openPreviewInNewTab() {
    setPreviewTabState("working");

    try {
      const documentTitle = escapeHtmlDocumentTitle(
        getDownloadName(fileName, renderState.engine, "png").replace(/\.png$/i, ""),
      );
      const bodyHtml = await buildPreviewExportBodyHtml();
      if (!bodyHtml) {
        setPreviewTabState("idle");
        return;
      }

      await openPreviewHtmlDocument(buildPrintHtmlDocument(documentTitle, bodyHtml));
      setPreviewTabState("idle");
    } catch {
      setPreviewTabState("failed");
      window.setTimeout(() => setPreviewTabState("idle"), 2200);
    }
  }

  async function printPreview() {
    setPrintState("working");

    let printWindow: Window | null = null;

    try {
      const documentTitle = escapeHtmlDocumentTitle(
        getDownloadName(fileName, renderState.engine, "png").replace(/\.png$/i, ""),
      );
      const bodyHtml = await buildPreviewExportBodyHtml();
      if (!bodyHtml) {
        setPrintState("idle");
        return;
      }

      printWindow = await openPrintHtmlDocument(buildPrintHtmlDocument(documentTitle, bodyHtml));
      setPrintState("idle");
    } catch {
      printWindow?.close();
      setPrintState("failed");
      window.setTimeout(() => setPrintState("idle"), 2200);
    }
  }

  function renderPreview() {
    if (renderState.status === "idle") {
      return (
        <div className="diagram-empty-state">
          <div className="tag neutral">Ready</div>
          <p>Mermaid, PlantUML, Markdown 파일을 열 수 있습니다.</p>
        </div>
      );
    }

    if (renderState.status === "loading") {
      return <div className="loading-inline">렌더링 중입니다.</div>;
    }

    if (renderState.status === "error") {
      return (
        <div className="notice notice-error">
          <strong>{resolvedLabel}</strong>
          <p>{renderState.error}</p>
        </div>
      );
    }

    if (renderState.engine === "markdown" && renderState.segments) {
      return (
        <div ref={previewContentRef} className="diagram-preview-content diagram-markdown-document" style={previewStyle}>
          {renderState.segments.map((segment) => {
            if (segment.kind === "markdown") {
              return <div key={segment.id} dangerouslySetInnerHTML={{ __html: segment.html }} />;
            }

            if (segment.kind === "code") {
              return (
                <pre key={segment.id} className="diagram-code-block">
                  <code>{segment.code}</code>
                </pre>
              );
            }

            if (segment.status === "error") {
              return (
                <div key={segment.id} className="diagram-block-error">
                  <div className="tag neutral">{getEngineLabel(segment.engine)}</div>
                  <p>{segment.error}</p>
                </div>
              );
            }

            return (
              <div
                key={segment.id}
                className="diagram-svg-wrap"
                data-diagram-id={segment.id}
                dangerouslySetInnerHTML={{ __html: segment.svg ?? "" }}
              />
            );
          })}
        </div>
      );
    }

    return (
      <div ref={previewContentRef} className="diagram-preview-content" style={previewStyle}>
        <div className="diagram-svg-wrap" dangerouslySetInnerHTML={{ __html: renderState.svg ?? "" }} />
      </div>
    );
  }

  return (
    <>
      <section className="panel stack diagram-hero">
        <div className="diagram-hero-top">
          <div className="diagram-hero-copy">
            <div className="eyebrow">utility / diagram</div>
            <h1 className="diagram-hero-title">Diagram Previewer</h1>
            <p className="diagram-hero-lead muted">
              Mermaid, PlantUML, Markdown 문서를 브라우저에서 바로 렌더링하고 SVG·PNG로 내보냅니다.
            </p>
            <ul className="diagram-hero-formats" aria-label="Supported formats">
              <li className="diagram-format-pill diagram-format-pill-mermaid">Mermaid</li>
              <li className="diagram-format-pill diagram-format-pill-plantuml">PlantUML</li>
              <li className="diagram-format-pill diagram-format-pill-markdown">Markdown</li>
            </ul>
          </div>

          <div className="diagram-hero-mark" aria-hidden="true">
            <svg className="diagram-hero-graphic" viewBox="0 0 132 96" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="10" width="44" height="28" rx="8" stroke="currentColor" strokeWidth="1.5" />
              <rect x="80" y="4" width="44" height="28" rx="8" stroke="currentColor" strokeWidth="1.5" />
              <rect x="8" y="58" width="44" height="28" rx="8" stroke="currentColor" strokeWidth="1.5" />
              <rect x="80" y="58" width="44" height="28" rx="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M52 24H68L80 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M30 38V46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
              <path d="M30 46H68L80 52" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M52 72H68" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="diagram-hero-deck">
          <div className="diagram-hero-card diagram-hero-card-mode">
            <div className="diagram-hero-card-row">
              <span className="label">Mode</span>
              <div className="segmented-control diagram-mode-control" role="group" aria-label="Render mode">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`segment${selectedMode === option.value ? " active" : ""}`}
                    onClick={() => setSelectedMode(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="diagram-hero-card diagram-hero-card-file">
            <span className="label">Source file</span>
            <label
              ref={fileDropRef}
              className={`file-drop-zone diagram-file-drop-zone diagram-hero-drop-zone${isFileDragging ? " is-dragging" : ""}`}
            >
              <span className="file-drop-title">{isFileDragging ? "Drop to open" : "Open or drop a file"}</span>
              <span className="file-drop-hint">{fileName || "MD / Mermaid / PlantUML / TXT"}</span>
              <input
                className="file-drop-input"
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(",")}
                aria-label="Choose diagram source file"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <div className="diagram-hero-card diagram-hero-card-status" aria-live="polite">
            <span className="label">Session</span>
            <div className="diagram-hero-status-row">
              <span className="tag neutral diagram-tag-compact">{modeStatusLabel}</span>
              <span className={`tag ${renderStatusClass} diagram-tag-compact`}>{renderState.status}</span>
              <span className="tag neutral diagram-tag-compact">{sourceSizeLabel}</span>
            </div>
          </div>
        </div>
      </section>

      <section
        className={`diagram-workbench-shell section${isWideWorkbench ? " is-wide" : ""}${isResizingSplit ? " is-resizing-split" : ""}`}
      >
        <div className="diagram-workbench-bar">
          <button
            type="button"
            className={`ghost-button diagram-compact-button diagram-wide-toggle${isWideWorkbench ? " is-active" : ""}`}
            aria-pressed={isWideWorkbench}
            onClick={() => setIsWideWorkbench((previous) => !previous)}
          >
            {isWideWorkbench ? "기본 너비" : "넓게 보기"}
          </button>
        </div>

        <div
          ref={workbenchRef}
          className={`diagram-workbench${isResizingSplit ? " is-resizing" : ""}`}
          style={{ "--diagram-source-size": `${workbenchSplitPercent}%` } as React.CSSProperties}
        >
          <div className="panel stack diagram-editor-panel" style={sourceEditorStyle}>
            <div className="diagram-panel-header diagram-panel-header-tools">
              <div className="diagram-panel-heading">
                <h2 className="diagram-panel-title">Source</h2>
                <p className="diagram-panel-meta muted">{sourceMetaLabel}</p>
              </div>
              <div className="diagram-source-header-actions">
                <div className="diagram-source-font-controls" aria-label="Source font size">
                  <button
                    type="button"
                    className="ghost-button diagram-compact-button diagram-icon-button"
                    onClick={() =>
                      setSourceFontSize((prev) => Math.max(SOURCE_FONT_MIN, prev - SOURCE_FONT_STEP))
                    }
                    disabled={sourceFontSize <= SOURCE_FONT_MIN}
                    aria-label="Decrease source font size"
                  >
                    -
                  </button>
                  <span className="diagram-source-font-value">{sourceFontSize}px</span>
                  <button
                    type="button"
                    className="ghost-button diagram-compact-button diagram-icon-button"
                    onClick={() =>
                      setSourceFontSize((prev) => Math.min(SOURCE_FONT_MAX, prev + SOURCE_FONT_STEP))
                    }
                    disabled={sourceFontSize >= SOURCE_FONT_MAX}
                    aria-label="Increase source font size"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="ghost-button diagram-compact-button"
                    onClick={() => setSourceFontSize(SOURCE_FONT_DEFAULT)}
                    disabled={sourceFontSize === SOURCE_FONT_DEFAULT}
                  >
                    Default
                  </button>
                </div>
                <button
                  type="button"
                  className="ghost-button diagram-compact-button"
                  onClick={copySource}
                  disabled={!source.trim()}
                >
                  {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy source"}
                </button>
              </div>
            </div>

            {fileError ? <div className="notice notice-error">{fileError}</div> : null}

            <label className="field diagram-source-field">
              <textarea
                className="textarea diagram-textarea"
                value={source}
                spellCheck={false}
                aria-label="Diagram source editor"
                onChange={(event) => setSource(event.target.value)}
                placeholder="Mermaid, PlantUML, Markdown 소스를 입력하세요"
              />
            </label>
          </div>

          <div
            className="diagram-workbench-splitter"
            role="separator"
            aria-orientation="vertical"
            aria-valuemin={WORKBENCH_SPLIT_MIN}
            aria-valuemax={WORKBENCH_SPLIT_MAX}
            aria-valuenow={Math.round(workbenchSplitPercent)}
            aria-label="Source와 Preview 너비 조절"
            onPointerDown={handleSplitterPointerDown}
            onPointerMove={handleSplitterPointerMove}
            onPointerUp={handleSplitterPointerUp}
            onPointerCancel={handleSplitterPointerUp}
          />

          <div className="panel stack diagram-preview-panel">
            <div className="diagram-panel-header diagram-panel-header-tools">
              <div className="diagram-panel-heading">
                <h2 className="diagram-panel-title">Preview</h2>
                <p className="diagram-panel-meta muted">{previewMetaLabel}</p>
              </div>
              <div className="diagram-panel-actions" aria-label="Preview controls">
                <div className="diagram-zoom-controls" aria-label="Preview zoom">
                  <button
                    type="button"
                    className="ghost-button diagram-compact-button diagram-icon-button"
                    onClick={() => setZoom((prev) => Math.max(ZOOM_MIN, prev - 10))}
                    disabled={zoom <= ZOOM_MIN}
                    aria-label="Zoom out"
                  >
                    -
                  </button>
                  <span className="diagram-zoom-value">{zoom}%</span>
                  <button
                    type="button"
                    className="ghost-button diagram-compact-button diagram-icon-button"
                    onClick={() => setZoom((prev) => Math.min(ZOOM_MAX, prev + 10))}
                    disabled={zoom >= ZOOM_MAX}
                    aria-label="Zoom in"
                  >
                    +
                  </button>
                  <button type="button" className="ghost-button diagram-compact-button" onClick={() => setZoom(100)}>
                    Fit
                  </button>
                </div>
                <div className="diagram-export-actions">
                  <button
                    type="button"
                    className="button diagram-compact-button"
                    onClick={downloadSvg}
                    disabled={!canDownloadPreview || exportBusy}
                  >
                    SVG
                  </button>
                  <button
                    type="button"
                    className="button diagram-compact-button"
                    onClick={downloadPng}
                    disabled={!canDownloadRaster}
                  >
                    {pngState === "working" ? "PNG…" : pngState === "failed" ? "PNG failed" : "PNG"}
                  </button>
                  <button
                    type="button"
                    className="button diagram-compact-button"
                    onClick={downloadPdf}
                    disabled={!canDownloadRaster}
                  >
                    {pdfState === "working" ? "PDF…" : pdfState === "failed" ? "PDF failed" : "PDF"}
                  </button>
                  <button
                    type="button"
                    className="ghost-button diagram-compact-button"
                    onClick={openPreviewInNewTab}
                    disabled={!canDownloadRaster}
                  >
                    {previewTabState === "working"
                      ? "새 탭…"
                      : previewTabState === "failed"
                        ? "새 탭 실패"
                        : "새 탭 보기"}
                  </button>
                  <button
                    type="button"
                    className="ghost-button diagram-compact-button"
                    onClick={printPreview}
                    disabled={!canDownloadRaster}
                  >
                    {printState === "working" ? "Print…" : printState === "failed" ? "Print failed" : "Print"}
                  </button>
                </div>
              </div>
            </div>

            <div className="diagram-preview-surface" aria-live="polite">
              {renderPreview()}
            </div>
          </div>
        </div>
      </section>

      <section className="panel stack diagram-history-panel section">
        <div className="diagram-panel-header diagram-panel-header-tools">
          <div className="diagram-panel-heading">
            <h2 className="diagram-panel-title">History</h2>
            <p className="diagram-panel-meta muted">브라우저 localStorage에 저장됩니다. 불러온 뒤 수정하면 v2, v3…으로 버전이 쌓입니다. 메모는 파일 구분용 한 줄 설명입니다.</p>
          </div>
          <div className="diagram-history-save-bar">
            <label className="diagram-history-comment-field">
              <span className="diagram-history-comment-label">메모</span>
              <input
                type="text"
                className="diagram-history-comment-input"
                value={historyComment}
                maxLength={MAX_HISTORY_COMMENT_LENGTH}
                placeholder="예: SKU 프레임워크 초안 README"
                onChange={(event) => setHistoryComment(event.target.value)}
                onBlur={(event) => {
                  const normalized = normalizeHistoryComment(event.target.value);
                  setHistoryComment(normalized);
                  if (activeHistoryId) {
                    updateHistoryComment(activeHistoryId, normalized);
                  }
                }}
              />
            </label>
            <div className="diagram-history-actions">
            <button
              type="button"
              className="button diagram-compact-button"
              onClick={saveToHistory}
              disabled={!historyHasChanges}
            >
              {activeHistoryEntry
                ? `v${(activeHistoryEntry.versions[activeHistoryEntry.versions.length - 1]?.version ?? 0) + 1} 저장`
                : "이력 저장"}
            </button>
            <button type="button" className="ghost-button diagram-compact-button" onClick={startNewDraft}>
              새 초안
            </button>
            </div>
          </div>
        </div>

        {historyMessage ? <div className="diagram-history-message">{historyMessage}</div> : null}

        {activeHistoryEntry && activeHistoryVersion !== null ? (
          <div className="diagram-history-active">
            <span className="tag accent diagram-tag-compact">
              편집 중 · {activeHistoryEntry.title}
              {activeHistoryEntry.comment ? ` · ${activeHistoryEntry.comment}` : ""} v{activeHistoryVersion}
            </span>
          </div>
        ) : null}

        {historyEntries.length ? (
          <ul className="diagram-history-list">
            {historyEntries.map((entry) => {
              const latestVersion = entry.versions[entry.versions.length - 1];
              const isExpanded = expandedHistoryId === entry.id;
              const isActive = activeHistoryId === entry.id;

              return (
                <li
                  key={entry.id}
                  className={`diagram-history-item${isActive ? " is-active" : ""}${isExpanded ? " is-expanded" : ""}`}
                >
                  <div className="diagram-history-item-main">
                    <div className="diagram-history-item-copy">
                      <div className="diagram-history-item-heading">
                        <strong className="diagram-history-item-title">{entry.title}</strong>
                        <input
                          type="text"
                          className="diagram-history-comment-input diagram-history-comment-input-inline"
                          value={getHistoryCommentInputValue(entry)}
                          maxLength={MAX_HISTORY_COMMENT_LENGTH}
                          placeholder="한 줄 메모"
                          aria-label={`${entry.title} 메모`}
                          onChange={(event) =>
                            setHistoryCommentDrafts((current) => ({
                              ...current,
                              [entry.id]: event.target.value,
                            }))
                          }
                          onBlur={() => commitHistoryCommentDraft(entry.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.currentTarget.blur();
                            }
                          }}
                        />
                      </div>
                      <span className="diagram-history-item-meta muted">
                        수정 {formatHistoryTimestamp(entry.updatedAt)} · v{latestVersion.version} ·{" "}
                        {entry.versions.length} versions
                      </span>
                    </div>
                    <div className="diagram-history-item-actions">
                      <button
                        type="button"
                        className="ghost-button diagram-compact-button"
                        onClick={() => loadHistoryEntry(entry.id)}
                      >
                        최신 불러오기
                      </button>
                      <button
                        type="button"
                        className="ghost-button diagram-compact-button"
                        onClick={() => setExpandedHistoryId(isExpanded ? null : entry.id)}
                      >
                        {isExpanded ? "버전 닫기" : "버전"}
                      </button>
                      <button
                        type="button"
                        className="ghost-button diagram-compact-button"
                        onClick={() => deleteHistoryEntry(entry.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <ul className="diagram-history-version-list">
                      {[...entry.versions].reverse().map((version) => (
                        <li key={`${entry.id}-${version.version}`} className="diagram-history-version-item">
                          <div className="diagram-history-version-copy">
                            <span className="diagram-history-version-label">v{version.version}</span>
                            <span className="muted">{formatHistoryTimestamp(version.savedAt)}</span>
                          </div>
                          <button
                            type="button"
                            className="ghost-button diagram-compact-button"
                            onClick={() => loadHistoryEntry(entry.id, version.version)}
                          >
                            불러오기
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="diagram-history-empty muted">저장된 이력이 없습니다. 소스를 작성한 뒤 이력 저장을 눌러주세요.</p>
        )}
      </section>
    </>
  );
}
