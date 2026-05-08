# TODO: Diagram Previewer

## Scaffolding
- [x] Create `app/diagram/page.tsx`.
- [x] Create `app/diagram/diagram-client.tsx`.
- [x] Create `app/api/plantuml/render/route.ts`.
- [x] Add Diagram Previewer to seeded visualizations.
- [x] Add `PLANTUML_SERVER_URL` to `.env.example`.

## Rendering Logic
- [x] Add render mode types and supported file extension validation.
- [x] Implement source engine detection for Markdown, Mermaid, and PlantUML.
- [x] Implement Mermaid dynamic import and SVG rendering.
- [x] Implement PlantUML API request handling in the client.
- [x] Implement PlantUML raw deflate URL encoding in the API route.
- [x] Implement Markdown tokenization for fenced code blocks.
- [x] Implement sanitized Markdown rendering for common Markdown syntax.
- [x] Render Mermaid and PlantUML fences independently inside Markdown mode.
- [x] Ignore stale async render results during rapid typing.
- [x] Implement browser-side SVG to PNG rasterization.
- [x] Export full Markdown preview instead of only the first diagram block.
- [x] Use a pure SVG document export for Markdown mode to avoid PNG failures from `foreignObject`.

## UI
- [x] Build intro panel with utility description and resolved mode status.
- [x] Build upload controls with supported file help text.
- [x] Add drag/drop file import to the upload control.
- [x] Build mode selector.
- [x] Build sample buttons for Markdown, Mermaid, and PlantUML.
- [x] Build source editor.
- [x] Build preview toolbar with zoom, fit, copy source, and SVG download.
- [x] Add PNG download control.
- [x] Make SVG/PNG download buttons export the full current preview.
- [x] Build empty, loading, ready, and error preview states.
- [x] Add privacy note for PlantUML server rendering.

## Styling
- [x] Add responsive split layout styles.
- [x] Add editor and preview surface styles.
- [x] Add Markdown content styles.
- [x] Add diagram error block styles.
- [x] Ensure mobile layout stacks cleanly.

## Verification
- [x] Run `npm run build`.
- [x] Confirm `/diagram` route compiles.
- [x] Confirm Mermaid sample renders.
- [x] Confirm PlantUML API route compiles.
- [x] Confirm Markdown sample renders embedded diagram blocks.
- [x] Confirm PNG download code compiles.
