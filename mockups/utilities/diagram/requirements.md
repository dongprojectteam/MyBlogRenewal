# Requirements: Diagram Previewer

## Overview
- Utility name: Diagram Previewer
- Slug: `diagram`
- Route: `/diagram`
- Goal: Render Mermaid, PlantUML, and Markdown documents that contain Mermaid or PlantUML code blocks from pasted text or uploaded files.
- Primary use case: Quickly preview architecture notes, sequence diagrams, flowcharts, and mixed Markdown design documents without leaving the browser.

## User Goals
- Paste Mermaid or PlantUML source and see the rendered diagram automatically.
- Upload or drag/drop `.mmd`, `.mermaid`, `.puml`, `.plantuml`, `.uml`, `.iuml`, `.md`, `.markdown`, or `.txt` files.
- Preview Markdown as a readable document while rendering embedded diagram code blocks inline.
- Switch rendering mode manually when automatic detection guesses incorrectly.
- Understand syntax or rendering failures without losing the rest of the preview.
- Copy the current source or download the full rendered preview as SVG/PNG when available.
- Continue from the last edited source after a page refresh.

## Core Features
- A vertical layout with the source editor above and the live preview below.
- File picker and drag/drop import that read supported text files into the editor.
- Render mode control: `Auto`, `Markdown`, `Mermaid`, and `PlantUML`.
- Automatic render engine detection from file extension and source content.
- Debounced live rendering while the user types.
- Markdown rendering with inline Mermaid and PlantUML code block replacement.
- Per-block error handling for Markdown documents with multiple diagrams.
- Preview toolbar with zoom, fit, source copy, sample loading, and SVG/PNG download.
- Local persistence of source, selected mode, and latest file name.

## Detailed Behaviors
- File handling:
  - Accept supported text-like extensions only.
  - Reject files larger than 1 MB with a visible error.
  - Decode uploaded files as UTF-8 text.
  - File picker and drag/drop share the same validation and loading path.
  - Use extension hints to set the suggested mode while preserving the user's explicit mode choice when possible.
- Mode detection:
  - Markdown is detected from `.md` and `.markdown` extensions or heading/prose plus fenced diagram blocks.
  - PlantUML is detected from `@startuml`, `@startmindmap`, `@startgantt`, `@startjson`, `@startyaml`, `@startsalt`, or related `@start...` blocks.
  - Mermaid is detected from common diagram starts such as `flowchart`, `graph`, `sequenceDiagram`, `classDiagram`, `stateDiagram`, `erDiagram`, `gantt`, `journey`, `pie`, `mindmap`, `timeline`, `gitGraph`, and `quadrantChart`.
  - If Auto cannot decide, prefer Markdown when fenced blocks or Markdown structure exists; otherwise prefer Mermaid for short diagram-like text.
- Mermaid rendering:
  - Render directly in the browser.
  - Use strict security settings by default.
  - Show parse/render errors in the preview panel.
- PlantUML rendering:
  - Render through a Next.js API route that proxies to a configurable PlantUML server.
  - Return SVG for preview and download.
  - Use bounded request size and timeout handling.
  - Explain that PlantUML source is sent to the configured PlantUML server.
- Markdown rendering:
  - Render standard headings, paragraphs, emphasis, lists, blockquotes, inline code, fenced code, links, tables, and horizontal rules.
  - Sanitize rendered Markdown output before inserting into the page.
  - Replace fenced `mermaid` blocks with Mermaid diagrams.
  - Replace fenced `plantuml`, `puml`, or `uml` blocks with PlantUML diagrams.
  - Leave all other code fences as code blocks.
  - If one diagram fails, show an error panel in that block and keep the rest of the document visible.
- Preview controls:
  - Zoom in and out between 50% and 180%.
  - Fit resets zoom and lets the diagram/document use available panel width.
  - Copy source writes the editor content to the clipboard.
  - Download SVG and Download PNG are enabled when the current preview is ready.
  - In Markdown mode, downloads include the full rendered document, including Markdown text, code blocks, Mermaid diagrams, and PlantUML diagrams.
  - PNG download rasterizes the exported SVG in the browser and preserves the preview's white document background.
  - Sample buttons load Markdown, Mermaid, and PlantUML examples.

## Edge Cases
- Empty editor: show a quiet empty state with supported formats.
- Invalid syntax: show a readable error without crashing the route.
- Multiple diagrams in Markdown: render each block independently and preserve document order.
- Unsupported file extension: reject before reading.
- Large source: prevent render and explain the size limit.
- Rapid typing: only the latest render result should be displayed.
- Slow PlantUML response: show loading and timeout error.
- Very wide diagrams: keep preview scroll-safe and zoomable.
- Raw HTML in Markdown: sanitize or escape unsafe content.
- Preview should use a white document background with dark readable text by default.

## Accessibility
- File input, editor, mode selector, and buttons have visible labels.
- Preview state changes are announced with `aria-live`.
- Controls are keyboard accessible.
- Error messages include text, not color alone.
- Zoom and download controls use clear button labels.
- Rendered Markdown maintains semantic heading and list structure where possible.

## Performance/Quality Constraints
- Debounce live rendering to avoid work on every keystroke.
- Keep source limit at 1 MB for predictable browser and server behavior.
- Avoid server-side rendering for browser-only rendering engines.
- Cache repeated PlantUML block requests per source during a render pass when practical.
- Do not block the rest of Markdown rendering on a single failed diagram.
- Follow existing Next.js app-router patterns and shared global styles.

## Acceptance Criteria
- `/diagram` renders a Diagram Previewer page.
- The editor accepts pasted Mermaid, PlantUML, and Markdown source.
- Uploading or dropping supported text files populates the editor.
- Auto mode selects a reasonable render engine for Mermaid, PlantUML, and Markdown examples.
- Markdown preview renders regular Markdown and embedded Mermaid/PlantUML code blocks.
- Mermaid diagrams render in the browser.
- PlantUML diagrams render through `/api/plantuml/render`.
- Invalid Mermaid or PlantUML source displays an error state.
- One failed Markdown diagram block does not break the whole document preview.
- The full rendered preview can be downloaded as SVG and PNG.
- Source, mode, and filename persist across reloads.
- The utility appears in the seeded public utilities list.
- Build/type checks pass.
