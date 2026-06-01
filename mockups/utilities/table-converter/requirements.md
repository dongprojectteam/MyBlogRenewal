# Requirements: Table Converter

## Overview
- Utility name: Table Converter
- Slug: `table-converter`
- Route: `/table-converter`
- Goal: Convert CSV, TSV, Markdown table, and JSON-friendly table data between common text formats.

## Core Features
- Input format: Auto, CSV, TSV, Markdown.
- Output format: Markdown, CSV, TSV, JSON.
- First-row-as-header toggle.
- Trim-cells toggle.
- Table preview.
- Copy output action.

## Detailed Behaviors
- Auto detection prefers Markdown when a Markdown divider row is present.
- CSV/TSV parser handles quoted delimiters, escaped quotes, and line breaks inside quoted cells.
- Unclosed quoted cells show a parse error.
- Markdown cells allow escaped pipes.
- JSON output uses unique header keys when first row is header.

## Edge Cases
- Empty input.
- Ragged rows.
- Unclosed quotes.
- Duplicate or empty headers.
- Very wide tables.
- Clipboard failure.

## Acceptance Criteria
- `/table-converter` renders in the app shell.
- Built-in sample converts to Markdown.
- CSV, TSV, Markdown, and JSON outputs work.
- Malformed quoted CSV shows an error.
- Build passes.
