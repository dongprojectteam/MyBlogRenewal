# TODO: Mind Map Studio

## Scaffolding

- [x] Create planning docs under `mockups/utilities/mindmap/`.
- [x] Create `app/mindmap/page.tsx`.
- [x] Create `app/mindmap/mindmap-client.tsx`.
- [x] Add `public/images/utilities/mindmap-preview.svg`.
- [x] Add Mind Map Studio to seeded visualizations.
- [x] Add `/mindmap` SEO metadata and structured data.

## Canvas And Editing

- [x] Build custom SVG mind map rendering.
- [x] Generate smooth connector paths from node coordinates.
- [x] Add balanced, left, and right layout modes.
- [x] Add compact, comfortable, and spacious density modes.
- [x] Add canvas focus mode.
- [x] Add pointer pan and mouse-wheel zoom.
- [x] Prevent page scroll while wheel zooming on the canvas.
- [x] Add node selection that does not snap back to the root.
- [x] Add node drag for manual positioning.
- [x] Add node drag/drop reparenting.
- [x] Add quick menu actions for sibling, child, and delete.
- [x] Add canvas double-click title editing.
- [x] Add outline selection, inline editing, delete button, and `Delete` key support.
- [x] Add hover overlay for note, tags, priority, progress, and children.
- [x] Keep hover overlay from covering the hovered node.

## Node Metadata

- [x] Add title, note, tags, priority, progress, color, and collapsed state.
- [x] Support multiple comma-separated tags with spaces.
- [x] Restrict progress editing to leaf nodes.
- [x] Auto-compute parent progress from descendant leaves.
- [x] Add concise parent progress copy.

## Templates And Storage

- [x] Add starter templates.
- [x] Add blank map creation.
- [x] Add current-map autosave.
- [x] Add Browser Library list.
- [x] Add named save, save as copy, load, and delete.

## Exchange

- [x] Add JSON import/export.
- [x] Add Markdown import/export.
- [x] Add OPML import/export.
- [x] Add FreeMind import/export.
- [x] Add Mermaid mindmap export.
- [x] Add CSV import/export.
- [x] Add SVG export.
- [x] Add PNG export.
- [x] Add file picker import.
- [x] Add file drag/drop import.
- [x] Position Exchange below the canvas.
- [x] Position Browser Library below Exchange.

## Verification

- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run build`.
- [x] Confirm `/mindmap` returns 200 locally.
- [x] Confirm drag/drop file import works.
- [x] Confirm SEO page route is included in sitemap.
