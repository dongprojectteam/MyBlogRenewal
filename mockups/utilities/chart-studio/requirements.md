# Requirements: Chart Studio

## Overview

- Utility name: Chart Studio
- Slug: `chart-studio`
- Route: `/chart-studio`
- Goal: Provide a browser-only workspace for manually entering or importing data and turning it into polished 3D-style charts.
- Initial renderer: custom React + Canvas 2D for fixed-view 3D-style bar and line charts.
- Design priority: charts should feel presentation-ready, not merely functional.

## User Goals

- Enter chart data manually in a simple table-like text area.
- Upload CSV, TSV, or JSON data files without sending data to a server.
- Switch between 3D bar and 3D line chart views.
- Create beautiful charts quickly with palettes, depth, perspective, labels, legend, and glow settings.
- Compare multiple series in one chart.
- Preview parse errors and data summaries before exporting.
- Export the final chart as a PNG image.

## Core Features

- Manual data editor with CSV-style rows.
- File picker and drag/drop import.
- Supported imports:
  - CSV
  - TSV
  - JSON array of objects
  - JSON array of arrays
- Chart types:
  - 3D Bar
  - 3D Line
- Multi-series support.
- Configurable:
  - Chart title
  - X axis label
  - Y axis label
  - Palette
  - Depth amount
  - Perspective angle
  - Value labels
  - Legend
  - Smooth line rendering
  - Point markers
  - Grid floor
  - Glow/highlight intensity
- Built-in sample datasets.
- PNG download from the current canvas.

## Detailed Behaviors

- Manual input format:
  - First row is the header.
  - First column is the category/x label.
  - Remaining columns are numeric series.
  - Example: `Month,Revenue,Profit`.
- CSV parsing:
  - Handles quoted cells, escaped quotes, commas, tabs, and line breaks inside quotes where reasonable.
  - Empty rows are ignored.
  - Numeric cells may include commas, percent signs, and currency symbols.
- JSON object parsing:
  - Uses the first string-like key as category when possible.
  - Uses numeric keys as series.
  - Falls back to the first key as category.
- JSON array parsing:
  - First row can be a header row.
  - Object rows are preferred for named series.
- Validation:
  - Requires at least one category and one numeric series.
  - Non-numeric cells become gaps for line charts and zero-height bars for bar charts with a warning.
  - Entirely empty numeric series are removed with a warning.
- Chart rendering:
  - 3D bar charts render each bar with front, side, and top faces.
  - 3D line charts render each series along a depth lane with shadow trails, point markers, and optional smoothing.
  - Axes, floor grid, legend, title, and labels remain readable on desktop and mobile.
- Import:
  - File size over 2 MB is rejected.
  - Drag/drop and file picker share the same import path.
  - Imported text replaces the manual editor and re-renders immediately.
- Export:
  - PNG export downloads exactly what is visible in the canvas at high device-pixel-ratio resolution.

## Edge Cases

- Empty editor input.
- Header without data rows.
- Data rows with different widths.
- All values zero.
- Negative values.
- Very large numbers.
- Very long category labels.
- Many categories or many series.
- Malformed CSV or JSON.
- Unsupported file extension.
- Canvas unavailable.
- Device pixel ratio changes after resize.

## Accessibility

- All controls have visible text labels or aria labels.
- File drop zone has keyboard-accessible file picker fallback.
- Parse status and warnings are rendered as text.
- Buttons expose disabled states.
- Canvas has an aria label and the parsed data summary is available in text.
- Color is not the only channel for identifying series; legend labels remain visible.

## Performance/Quality Constraints

- Keep all rendering and parsing local to the browser.
- Avoid adding a heavy charting dependency for the first version.
- Keep Canvas rendering deterministic and isolated from React layout.
- Resize canvas responsively with stable dimensions.
- Target smooth interaction for datasets up to roughly 40 categories and 8 series.
- Keep TypeScript strict-compatible.
- Follow existing Next.js app router and shared CSS patterns.

## Acceptance Criteria

- `/chart-studio` renders inside the existing app shell.
- A user can paste sample data, edit it manually, and see a chart update.
- A user can upload or drag/drop CSV, TSV, and JSON files.
- 3D Bar and 3D Line chart modes both render.
- Multi-series line charts are supported.
- Palette, title, labels, depth, perspective, legend, labels, smoothing, markers, grid, and glow settings affect the chart.
- Invalid data produces readable errors or warnings.
- PNG export works from the current canvas.
- The utility is discoverable from the home utility list.
- The utility has metadata, JSON-LD, and a preview image.
- The implementation follows the generated design and TODO.
