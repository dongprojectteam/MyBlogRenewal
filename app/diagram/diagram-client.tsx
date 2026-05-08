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
const MAX_SOURCE_BYTES = 1024 * 1024;
const RENDER_DEBOUNCE_MS = 380;
const PLANTUML_TIMEOUT_MS = 16000;
const ZOOM_MIN = 50;
const ZOOM_MAX = 180;

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

const MARKDOWN_SAMPLE = [
  "# 로그인 흐름",
  "",
  "Markdown 안에 Mermaid와 PlantUML을 함께 둘 수 있습니다.",
  "",
  "```mermaid",
  "sequenceDiagram",
  "  actor User",
  "  participant Web",
  "  participant API",
  "  User->>Web: Login",
  "  Web->>API: POST /login",
  "  API-->>Web: token",
  "  Web-->>User: dashboard",
  "```",
  "",
  "## 서버 구성",
  "",
  "```puml",
  "@startuml",
  "skinparam backgroundColor transparent",
  "actor User",
  "node Web",
  "database DB",
  "User --> Web",
  "Web --> DB",
  "@enduml",
  "```",
].join("\n");

const MERMAID_SAMPLE = [
  "flowchart LR",
  "  A[Idea] --> B{Useful?}",
  "  B -->|Yes| C[Build utility]",
  "  B -->|No| D[Archive note]",
  "  C --> E[Preview]",
].join("\n");

const PLANTUML_SAMPLE = [
  "@startuml",
  "skinparam backgroundColor transparent",
  "Alice -> Bob: Authentication Request",
  "Bob --> Alice: Authentication Response",
  "@enduml",
].join("\n");

const INITIAL_RENDER_STATE: RenderState = {
  status: "idle",
  engine: null,
};

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
    flowchart: {
      useMaxWidth: true,
      htmlLabels: false,
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

function getDownloadName(fileName: string, engine: RenderEngine | null, extension: "svg" | "png") {
  const base = fileName && getExtension(fileName) ? fileName.replace(/\.[^.]+$/, "") : engine || "diagram";
  return `${base || "diagram"}.${extension}`;
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

function normalizeSvgForImage(svg: string) {
  if (/<svg[\s>]/i.test(svg) && !/<svg[^>]+xmlns=/i.test(svg)) {
    return svg.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return svg;
}

function getTextContent(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
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

function getMarkdownExportBlocks(html: string) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const blocks: Array<{ kind: "text"; text: string; variant: string } | { kind: "rule" }> = [];

  const addText = (text: string, variant: string) => {
    const normalized = getTextContent(text);
    if (normalized) {
      blocks.push({ kind: "text", text: normalized, variant });
    }
  };

  const visit = (element: Element) => {
    const tagName = element.tagName.toLowerCase();

    if (/^h[1-6]$/.test(tagName)) {
      addText(element.textContent, tagName);
      return;
    }

    if (tagName === "p") {
      addText(element.textContent, "p");
      return;
    }

    if (tagName === "blockquote") {
      addText(element.textContent, "quote");
      return;
    }

    if (tagName === "hr") {
      blocks.push({ kind: "rule" });
      return;
    }

    if (tagName === "ul" || tagName === "ol") {
      Array.from(element.children).forEach((child, index) => {
        const marker = tagName === "ol" ? `${index + 1}.` : "-";
        addText(`${marker} ${child.textContent ?? ""}`, "li");
      });
      return;
    }

    if (tagName === "table") {
      Array.from(element.querySelectorAll("tr")).forEach((row) => {
        const cells = Array.from(row.children)
          .map((cell) => getTextContent(cell.textContent))
          .filter(Boolean);
        if (cells.length) {
          addText(cells.join(" | "), "table");
        }
      });
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

    addText(element.textContent, "p");
  };

  Array.from(parsed.body.children).forEach(visit);
  return blocks;
}

function getTextVariantStyle(variant: string) {
  if (variant === "h1") return { size: 34, weight: 700, color: "#0f172a", gap: 18 };
  if (variant === "h2") return { size: 27, weight: 700, color: "#0f172a", gap: 16 };
  if (variant === "h3") return { size: 22, weight: 700, color: "#111827", gap: 14 };
  if (variant === "quote") return { size: 17, weight: 400, color: "#475569", gap: 12 };
  if (variant === "li") return { size: 17, weight: 400, color: "#111827", gap: 8 };
  if (variant === "table") return { size: 15, weight: 400, color: "#374151", gap: 6 };
  return { size: 17, weight: 400, color: "#111827", gap: 12 };
}

function positionEmbeddedSvg(svg: string, x: number, y: number, width: number, height: number) {
  const parsed = new DOMParser().parseFromString(normalizeSvgForImage(svg), "image/svg+xml");
  const root = parsed.documentElement;

  if (!root || root.nodeName.toLowerCase() !== "svg") {
    return "";
  }

  if (!root.getAttribute("viewBox")) {
    const size = parseSvgSize(svg);
    root.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
  }

  root.setAttribute("x", String(x));
  root.setAttribute("y", String(y));
  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));
  root.setAttribute("preserveAspectRatio", "xMidYMin meet");
  root.setAttribute("overflow", "visible");

  return new XMLSerializer().serializeToString(root);
}

function buildMarkdownExportSvg(segments: PreviewSegment[]) {
  const width = 1200;
  const padding = 42;
  const contentWidth = width - padding * 2;
  const parts: string[] = [];
  let y = padding;

  const appendText = (text: string, variant: string) => {
    const style = getTextVariantStyle(variant);
    const maxChars = Math.max(20, Math.floor(contentWidth / (style.size * 0.55)));
    const lines = wrapExportText(text, maxChars);
    const lineHeight = Math.round(style.size * 1.55);
    const textX = variant === "quote" ? padding + 18 : padding;

    if (variant === "quote") {
      const blockHeight = lines.length * lineHeight + 8;
      parts.push(`<rect x="${padding}" y="${y - style.size}" width="3" height="${blockHeight}" fill="#2563eb" opacity="0.55" />`);
    }

    parts.push(
      renderSvgTextLines(lines, textX, y, {
        color: style.color,
        size: style.size,
        weight: style.weight,
        lineHeight,
      }),
    );
    y += lines.length * lineHeight + style.gap;
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

    const size = parseSvgSize(segment.svg);
    const scale = Math.min(1, contentWidth / size.width);
    const displayWidth = Math.max(1, Math.ceil(size.width * scale));
    const displayHeight = Math.max(1, Math.ceil(size.height * scale));
    const x = padding + Math.max(0, (contentWidth - displayWidth) / 2);
    const blockHeight = displayHeight + 28;

    parts.push(`<rect x="${padding}" y="${y}" width="${contentWidth}" height="${blockHeight}" rx="12" fill="#ffffff" stroke="#cbd5e1" />`);
    parts.push(positionEmbeddedSvg(segment.svg, x, y + 14, displayWidth, displayHeight));
    y += blockHeight + 22;
  };

  for (const segment of segments) {
    if (segment.kind === "markdown") {
      for (const block of getMarkdownExportBlocks(segment.html)) {
        if (block.kind === "rule") {
          parts.push(`<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#cbd5e1" />`);
          y += 22;
        } else {
          appendText(block.text, block.variant);
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
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
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

function getPreviewExportWidth(element: HTMLElement) {
  const surface = element.closest(".diagram-preview-surface");

  if (surface instanceof HTMLElement) {
    const surfaceStyle = window.getComputedStyle(surface);
    const horizontalPadding =
      Number.parseFloat(surfaceStyle.paddingLeft || "0") + Number.parseFloat(surfaceStyle.paddingRight || "0");
    const contentWidth = surface.clientWidth - horizontalPadding;

    if (contentWidth > 0) {
      return Math.ceil(contentWidth);
    }
  }

  const rect = element.getBoundingClientRect();
  return Math.max(320, Math.ceil(rect.width || element.scrollWidth || 1200));
}

function buildPreviewExportSvg(element: HTMLElement) {
  const width = getPreviewExportWidth(element);
  const clone = element.cloneNode(true) as HTMLElement;
  copyComputedStyles(element, clone);

  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  clone.style.setProperty("--diagram-zoom", "1");
  clone.style.width = `${width}px`;
  clone.style.minWidth = "0";
  clone.style.maxWidth = "none";
  clone.style.height = "auto";
  clone.style.transform = "none";
  clone.style.transformOrigin = "top left";

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-100000px";
  wrapper.style.top = "0";
  wrapper.style.width = `${width}px`;
  wrapper.style.pointerEvents = "none";
  wrapper.style.opacity = "0";
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    const height = Math.max(1, Math.ceil(clone.scrollHeight || clone.getBoundingClientRect().height || 800));
    const serialized = new XMLSerializer().serializeToString(clone);

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<rect width="100%" height="100%" fill="#ffffff" />`,
      `<foreignObject width="100%" height="100%">${serialized}</foreignObject>`,
      "</svg>",
    ].join("");
  } finally {
    document.body.removeChild(wrapper);
  }
}

async function svgToPngBlob(svg: string) {
  const { width, height } = parseSvgSize(svg);
  const largestSide = Math.max(width, height);
  const scale = Math.max(1, Math.min(2, 8192 / largestSide));
  const imageUrl = URL.createObjectURL(new Blob([normalizeSvgForImage(svg)], { type: "image/svg+xml;charset=utf-8" }));

  try {
    const image = new Image();
    image.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("SVG를 PNG로 변환하지 못했습니다."));
      image.src = imageUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(width * scale));
    canvas.height = Math.max(1, Math.ceil(height * scale));

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas를 초기화하지 못했습니다.");
    }

    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.drawImage(image, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("PNG 파일을 만들지 못했습니다."));
        }
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
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

export function DiagramClient() {
  const [source, setSource] = useState(MARKDOWN_SAMPLE);
  const [selectedMode, setSelectedMode] = useState<SelectedMode>("auto");
  const [fileName, setFileName] = useState("markdown-sample.md");
  const [fileError, setFileError] = useState("");
  const [renderState, setRenderState] = useState<RenderState>(INITIAL_RENDER_STATE);
  const [zoom, setZoom] = useState(100);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [pngState, setPngState] = useState<"idle" | "working" | "failed">("idle");
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const renderIdRef = useRef(0);
  const fileDropRef = useRef<HTMLLabelElement | null>(null);
  const previewContentRef = useRef<HTMLDivElement | null>(null);
  const previewStyle = usePreviewStyle(zoom);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          source?: unknown;
          selectedMode?: unknown;
          fileName?: unknown;
        };

        if (typeof parsed.source === "string") setSource(parsed.source);
        if (
          typeof parsed.selectedMode === "string" &&
          MODE_OPTIONS.some((option) => option.value === parsed.selectedMode)
        ) {
          setSelectedMode(parsed.selectedMode as SelectedMode);
        }
        if (typeof parsed.fileName === "string") setFileName(parsed.fileName);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHasLoadedStorage(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ source, selectedMode, fileName }));
  }, [fileName, hasLoadedStorage, selectedMode, source]);

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

  const canDownloadPreview =
    renderState.status === "ready" &&
    (Boolean(renderState.svg) || Boolean(renderState.segments?.length));
  const canDownloadPng = canDownloadPreview && pngState !== "working";
  const resolvedLabel = getEngineLabel(renderState.engine);
  const sourceSizeLabel = formatBytes(getSourceByteLength(source));

  function loadSample(nextSource: string, nextFileName: string) {
    setSource(nextSource);
    setFileName(nextFileName);
    setSelectedMode("auto");
    setFileError("");
    setCopyState("idle");
    setPngState("idle");
  }

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

  function getExportSvg() {
    if (renderState.engine !== "markdown" && renderState.svg) {
      return renderState.svg;
    }

    if (renderState.engine === "markdown" && renderState.segments?.length) {
      return buildMarkdownExportSvg(renderState.segments);
    }

    if (previewContentRef.current) {
      return buildPreviewExportSvg(previewContentRef.current);
    }

    return null;
  }

  function downloadSvg() {
    const exportSvg = getExportSvg();
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
    const exportSvg = getExportSvg();
    if (!exportSvg) return;

    setPngState("working");

    try {
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
              <div key={segment.id} className="diagram-svg-wrap" dangerouslySetInnerHTML={{ __html: segment.svg ?? "" }} />
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
      <section className="panel stack">
        <div className="eyebrow">utility / diagram</div>
        <div className="diagram-title-row">
          <div>
            <h1 style={{ marginBottom: 8 }}>Diagram Previewer</h1>
            <p className="muted" style={{ marginTop: 0, marginBottom: 0 }}>
              Mermaid, PlantUML, Markdown 문서를 바로 렌더링합니다.
            </p>
          </div>
          <div className="diagram-status-tags" aria-live="polite">
            <span className="tag neutral">{resolvedLabel}</span>
            <span className="tag neutral">{renderState.status}</span>
            <span className="tag neutral">{sourceSizeLabel}</span>
          </div>
        </div>
      </section>

      <section className="diagram-workbench section">
        <div className="panel stack diagram-editor-panel">
          <div className="diagram-control-bar">
            <div className="field diagram-file-field">
              <span className="label">File</span>
              <label
                ref={fileDropRef}
                className={`file-drop-zone diagram-file-drop-zone${isFileDragging ? " is-dragging" : ""}`}
              >
                <span className="file-drop-title">{isFileDragging ? "Drop to load" : "Drop or choose file"}</span>
                <span className="file-drop-hint">Markdown, Mermaid, PlantUML, TXT</span>
                <input
                  className="file-drop-input"
                  type="file"
                  accept={ACCEPTED_EXTENSIONS.join(",")}
                  aria-label="Choose diagram source file"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div className="field">
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

          {fileError ? <div className="notice notice-error">{fileError}</div> : null}

          <div className="diagram-samples">
            <button type="button" className="ghost-button" onClick={() => loadSample(MARKDOWN_SAMPLE, "markdown-sample.md")}>
              Markdown sample
            </button>
            <button type="button" className="ghost-button" onClick={() => loadSample(MERMAID_SAMPLE, "mermaid-sample.mmd")}>
              Mermaid sample
            </button>
            <button type="button" className="ghost-button" onClick={() => loadSample(PLANTUML_SAMPLE, "plantuml-sample.puml")}>
              PlantUML sample
            </button>
          </div>

          <label className="field">
            <span className="label">Source {fileName ? `- ${fileName}` : ""}</span>
            <textarea
              className="textarea diagram-textarea"
              value={source}
              spellCheck={false}
              onChange={(event) => setSource(event.target.value)}
              placeholder="Mermaid, PlantUML, Markdown 소스를 입력하세요"
            />
          </label>
        </div>

        <div className="panel stack diagram-preview-panel">
          <div className="diagram-preview-toolbar">
            <div className="diagram-zoom-controls" aria-label="Preview zoom">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setZoom((prev) => Math.max(ZOOM_MIN, prev - 10))}
                disabled={zoom <= ZOOM_MIN}
              >
                -
              </button>
              <span>{zoom}%</span>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setZoom((prev) => Math.min(ZOOM_MAX, prev + 10))}
                disabled={zoom >= ZOOM_MAX}
              >
                +
              </button>
              <button type="button" className="ghost-button" onClick={() => setZoom(100)}>
                Fit
              </button>
            </div>

            <div className="actions">
              <button type="button" className="ghost-button" onClick={copySource}>
                {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy source"}
              </button>
              <button type="button" className="button" onClick={downloadSvg} disabled={!canDownloadPreview}>
                Download SVG
              </button>
              <button type="button" className="button" onClick={downloadPng} disabled={!canDownloadPng}>
                {pngState === "working" ? "Rendering PNG" : pngState === "failed" ? "PNG failed" : "Download PNG"}
              </button>
            </div>
          </div>

          <div className="diagram-preview-surface" aria-live="polite">
            {renderPreview()}
          </div>
        </div>
      </section>

      <section className="panel stack section">
        <div className="tag neutral">PlantUML</div>
        <p className="muted" style={{ margin: 0 }}>
          PlantUML 렌더링은 서버 라우트를 통해 구성된 PlantUML 서버로 소스를 보내 SVG를 받아옵니다.
        </p>
      </section>
    </>
  );
}
