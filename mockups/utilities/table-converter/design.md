# Design: Table Converter

## Route And Naming
- Page file: `app/table-converter/page.tsx`
- Client file: `app/table-converter/table-converter-client.tsx`

## Information Architecture
- Intro panel with detected format and dimensions.
- Workbench with:
  - Input/output selectors.
  - Header and trim toggles.
  - Source editor.
  - Result editor.
  - Preview table.

## State Model
- `source: string`
- `inputType: "auto" | "csv" | "tsv" | "markdown"`
- `outputType: "markdown" | "csv" | "tsv" | "json"`
- `firstRowHeader: boolean`
- `trimCells: boolean`
- `copyState: "idle" | "copied" | "failed"`

## Implementation Notes
- Keep conversion browser-local.
- Normalize ragged rows before serialization.
- Treat malformed quoted delimited text as an error.
