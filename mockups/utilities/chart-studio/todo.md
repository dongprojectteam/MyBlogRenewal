# TODO: Chart Studio

## Scaffolding

- [x] Create `app/chart-studio/page.tsx`.
- [x] Create `app/chart-studio/chart-studio-client.tsx`.
- [x] Create `public/images/utilities/chart-studio-preview.svg`.
- [x] Add home seed entry for `/chart-studio`.
- [x] Add home SEO description entry for `/chart-studio`.

## Data Parsing

- [x] Implement CSV/TSV parser with quoted cell handling.
- [x] Implement JSON array-of-objects and array-of-arrays parsing.
- [x] Implement input format detection.
- [x] Implement numeric normalization and warnings.
- [x] Implement validation for categories and numeric series.

## UI

- [x] Build intro/status panel.
- [x] Build manual data editor.
- [x] Build file picker and drag/drop import.
- [x] Build sample dataset buttons.
- [x] Build chart type segmented control.
- [x] Build palette selector.
- [x] Build title and axis label fields.
- [x] Build depth, perspective, and glow controls.
- [x] Build rendering toggles.
- [x] Build parse summary and warnings.
- [x] Build canvas preview and PNG export action.

## Rendering

- [x] Implement responsive high-DPI canvas sizing.
- [x] Implement shared chart surface, title, axes, grid, labels, and legend drawing.
- [x] Implement 3D bar renderer.
- [x] Implement 3D line renderer.
- [x] Implement value labels.
- [x] Implement empty/error preview states.

## Polish

- [x] Add chart-specific CSS with responsive layout.
- [x] Keep text and controls readable on mobile.
- [x] Ensure visual palette is not a one-note theme.
- [x] Make the default chart presentation-ready.

## Verification

- [x] Run TypeScript/build checks where feasible.
- [x] Start the local dev server.
- [x] Verify `/chart-studio` renders.
- [x] Verify chart canvas is nonblank.
- [x] Verify CSV, TSV, and JSON import paths.
- [x] Verify PNG export path.
