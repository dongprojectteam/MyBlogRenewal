# Requirements: Mind Map Studio

## Overview

- Utility name: Mind Map Studio
- Slug: `mindmap`
- Route: `/mindmap`
- Goal: Provide a browser-only mind mapping workspace for brainstorming, planning, outlining, importing, exporting, and locally saving maps.
- Implementation note: The mind map renderer is custom React + SVG logic, not a third-party mind map library.

## User Goals

- Start from a template or a blank root node.
- Create sibling and child nodes quickly without leaving the canvas.
- Drag nodes to adjust manual positions or change hierarchy.
- Pan and zoom the canvas with pointer and wheel controls.
- Edit node titles directly on the canvas or from the outline.
- Add notes, tags, priority, color, collapsed state, and progress information.
- See important node details as a hover overlay without opening the side editor.
- Save maps in the browser and reopen them later.
- Import and export common mind map and outline formats.
- Export a visual snapshot as SVG or PNG.

## Core Features

- Custom SVG canvas with Bezier connector paths.
- Balanced, left, and right layout modes.
- Compact, comfortable, and spacious density modes with visibly different spacing and node sizing.
- Canvas focus mode for a larger working area.
- Pointer pan, mouse-wheel zoom, zoom reset, and viewport reset.
- Node drag for manual positioning.
- Node drag/drop hierarchy change with invalid target protection.
- Quick menu near selected node for sibling, child, and delete actions.
- Double-click title editing on canvas nodes.
- Outline tree with selection, double-click title editing, delete buttons, and `Delete` key support.
- Hover overlay for notes, tags, priority, progress, and child count. Overlay placement must avoid covering the hovered node when possible.
- Leaf-only progress editing. Parent node progress is computed automatically from descendant leaves.
- Multi-tag editing with comma-separated tags and spaces inside tag names.
- Browser autosave plus a Browser Library for named saved maps.
- Blank map button and starter templates.
- Import from pasted text, file picker, or file drag/drop.
- Export text formats and downloadable visual formats.

## Import/Export Formats

- JSON:
  - Native DOPT mind map document format.
  - Preserves layout, node metadata, offsets, collapsed state, and computed progress inputs.
- Markdown:
  - Hierarchical heading/list outline import and export for readable text workflows.
- OPML:
  - Outline import/export for interoperability with outliner tools.
- FreeMind `.mm`:
  - Basic FreeMind XML import/export for legacy mind map exchange.
- Mermaid:
  - Mermaid `mindmap` export for documentation and diagram workflows.
- CSV:
  - Flat parent/child row exchange for spreadsheets.
- SVG:
  - Visual export of the current rendered map.
- PNG:
  - Rasterized visual export generated locally from the SVG.

## Detailed Behaviors

- Selection:
  - Left-click selects the exact clicked node and must not snap back to the root.
  - Right-click may select a node and open contextual browser behavior should not break selection state.
  - Canvas background clicks should clear inline editing but keep the selected node stable unless another node is selected.
- Dragging:
  - Small pointer movement should not be treated as a click.
  - Dropping onto a descendant or itself is invalid.
  - Dropping a node onto another valid node reparents it as a child.
  - Manual offsets affect node position while connector paths recompute from current coordinates.
- Inline title editing:
  - Canvas double-click opens a small input over the node.
  - `Enter` commits, `Escape` cancels, blur commits.
  - Outline double-click or rapid second click opens title editing for that row.
- Progress:
  - Leaf nodes have editable progress.
  - Parent nodes show automatic progress derived from descendant leaf progress.
  - Parent progress input is read-only/disabled with concise explanatory copy.
- Tags:
  - Tags can contain spaces.
  - Commas split multiple tags.
  - Empty tags are removed on blur/commit.
- Hover overlay:
  - Overlay appears near the hovered node.
  - Overlay must prefer a non-overlapping placement on top, bottom, left, or right.
  - Center/root nodes should still place the overlay beside the node, not directly on top of it.
- Storage:
  - Current working map autosaves to localStorage.
  - Browser Library supports named save, save as copy, load, and delete.
  - Saved maps should show title, node count, and last updated time.
- File import:
  - File picker and drag/drop must share the same validation and parsing path.
  - Files larger than 2 MB are rejected.
  - Dropped files should populate the import text area and import immediately.

## Edge Cases

- Empty import text.
- Unsupported or malformed JSON/XML/CSV.
- Very deep trees and very wide maps.
- Deleting selected nodes, focused root nodes, or nodes currently being edited.
- Root node cannot be deleted.
- Collapsed children should remain in data and reappear when expanded.
- Parent progress should update after leaf edits, imports, deletes, and hierarchy changes.
- Storage quota errors should show a readable status.
- Export should still work after manual drag offsets.

## Accessibility

- Toolbar controls, quick actions, outline buttons, inputs, and file import controls have labels or text.
- Error and status messages use text, not color alone.
- Keyboard title editing supports `Enter`, `Escape`, and `Delete`.
- Disabled parent progress state is visually and semantically disabled.
- Canvas controls retain visible focus behavior from shared styles where applicable.

## Performance/Quality Constraints

- Keep rendering local to the browser.
- Avoid introducing a mind map layout dependency unless a future requirement demands advanced graph layout.
- Recompute connector paths from the view model instead of storing SVG path strings in persisted data.
- Keep imports/exports deterministic where possible.
- Maintain strict TypeScript compatibility and Next.js app-router conventions.

## Acceptance Criteria

- `/mindmap` renders inside the existing app shell.
- A user can create, select, edit, drag, reparent, collapse, and delete nodes.
- Quick menu, canvas double-click editing, and outline editing work.
- Wheel zoom does not scroll the page while the pointer is over the canvas.
- Hover overlays avoid covering their node.
- Leaf progress is editable and parent progress is automatically computed.
- Tags support comma-separated multi-tag input with spaces.
- Browser Library saves, loads, lists, and deletes local maps.
- Blank map and templates are available.
- Text import/export supports JSON, Markdown, OPML, FreeMind, Mermaid, and CSV.
- File import supports picker and drag/drop.
- SVG and PNG downloads work.
- Page metadata, JSON-LD, sitemap visibility, home seed data, and preview image are covered.
- `npx tsc --noEmit` and `npm run build` pass.
