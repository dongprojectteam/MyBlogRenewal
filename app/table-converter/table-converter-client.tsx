"use client";

import { useMemo, useState } from "react";

type InputType = "auto" | "csv" | "tsv" | "markdown";
type OutputType = "markdown" | "csv" | "tsv" | "json";

type ParseResult = {
  rows: string[][];
  detected: Exclude<InputType, "auto">;
  error: string;
};

const INPUT_OPTIONS: Array<{ value: InputType; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "csv", label: "CSV" },
  { value: "tsv", label: "TSV" },
  { value: "markdown", label: "Markdown" },
];

const OUTPUT_OPTIONS: Array<{ value: OutputType; label: string }> = [
  { value: "markdown", label: "Markdown" },
  { value: "csv", label: "CSV" },
  { value: "tsv", label: "TSV" },
  { value: "json", label: "JSON" },
];

const SAMPLE_TABLE = [
  "name,role,score",
  "DOPT,utility hub,98",
  "Codec,converter,91",
  "Regex,tester,88",
].join("\n");

function isMarkdownDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function detectInputType(source: string): Exclude<InputType, "auto"> {
  const lines = source.split(/\r?\n/).filter((line) => line.trim());
  if (lines.some((line, index) => line.includes("|") && isMarkdownDivider(lines[index + 1] ?? ""))) return "markdown";
  if (source.includes("\t")) return "tsv";
  return "csv";
}

function parseDelimited(source: string, delimiter: "," | "\t", trimCells: boolean) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && character === delimiter) {
      row.push(trimCells ? cell.trim() : cell);
      cell = "";
      continue;
    }

    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      row.push(trimCells ? cell.trim() : cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  row.push(trimCells ? cell.trim() : cell);
  rows.push(row);

  return rows.filter((item, index) => index < rows.length - 1 || item.some((cellValue) => cellValue.length > 0));
}

function splitMarkdownRow(line: string, trimCells: boolean) {
  const stripped = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let cell = "";

  for (let index = 0; index < stripped.length; index += 1) {
    const character = stripped[index];
    const nextCharacter = stripped[index + 1];

    if (character === "\\" && nextCharacter === "|") {
      cell += "|";
      index += 1;
      continue;
    }

    if (character === "|") {
      cells.push(trimCells ? cell.trim() : cell);
      cell = "";
      continue;
    }

    cell += character;
  }

  cells.push(trimCells ? cell.trim() : cell);
  return cells;
}

function parseMarkdownTable(source: string, trimCells: boolean) {
  return source
    .split(/\r?\n/)
    .filter((line) => line.trim() && !isMarkdownDivider(line))
    .map((line) => splitMarkdownRow(line, trimCells));
}

function parseSource(source: string, inputType: InputType, trimCells: boolean): ParseResult {
  if (!source.trim()) return { rows: [], detected: inputType === "auto" ? "csv" : inputType, error: "" };

  const detected = inputType === "auto" ? detectInputType(source) : inputType;

  try {
    const rows =
      detected === "markdown"
        ? parseMarkdownTable(source, trimCells)
        : parseDelimited(source, detected === "tsv" ? "\t" : ",", trimCells);

    return { rows: normalizeRows(rows), detected, error: "" };
  } catch (error) {
    return {
      rows: [],
      detected,
      error: error instanceof Error ? error.message : "Unable to parse table.",
    };
  }
}

function normalizeRows(rows: string[][]) {
  const width = Math.max(0, ...rows.map((row) => row.length));
  return rows
    .filter((row) => row.some((cell) => cell.length > 0))
    .map((row) => Array.from({ length: width }, (_, index) => row[index] ?? ""));
}

function escapeMarkdownCell(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function serializeMarkdown(rows: string[][], firstRowHeader: boolean) {
  if (rows.length === 0) return "";

  const width = Math.max(1, rows[0]?.length ?? 1);
  const headers = firstRowHeader ? rows[0] : Array.from({ length: width }, (_, index) => `Column ${index + 1}`);
  const body = firstRowHeader ? rows.slice(1) : rows;
  const divider = Array.from({ length: width }, () => "---");
  const serializeRow = (row: string[]) => `| ${row.map((cell) => escapeMarkdownCell(cell)).join(" | ")} |`;

  return [serializeRow(headers), serializeRow(divider), ...body.map(serializeRow)].join("\n");
}

function serializeDelimited(rows: string[][], delimiter: "," | "\t") {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const shouldQuote = cell.includes(delimiter) || cell.includes('"') || /\r|\n/.test(cell);
          const escaped = cell.replace(/"/g, '""');
          return shouldQuote ? `"${escaped}"` : escaped;
        })
        .join(delimiter),
    )
    .join("\n");
}

function uniqueHeaders(headers: string[]) {
  const seen = new Map<string, number>();
  return headers.map((header, index) => {
    const fallback = header || `column_${index + 1}`;
    const key = fallback.replace(/\s+/g, "_");
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    return count === 0 ? key : `${key}_${count + 1}`;
  });
}

function serializeJson(rows: string[][], firstRowHeader: boolean) {
  if (rows.length === 0) return "[]";

  if (!firstRowHeader) {
    return JSON.stringify(rows, null, 2);
  }

  const headers = uniqueHeaders(rows[0] ?? []);
  const objects = rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])),
  );
  return JSON.stringify(objects, null, 2);
}

function serializeOutput(rows: string[][], outputType: OutputType, firstRowHeader: boolean) {
  if (outputType === "markdown") return serializeMarkdown(rows, firstRowHeader);
  if (outputType === "csv") return serializeDelimited(rows, ",");
  if (outputType === "tsv") return serializeDelimited(rows, "\t");
  return serializeJson(rows, firstRowHeader);
}

export function TableConverterClient() {
  const [source, setSource] = useState(SAMPLE_TABLE);
  const [inputType, setInputType] = useState<InputType>("auto");
  const [outputType, setOutputType] = useState<OutputType>("markdown");
  const [firstRowHeader, setFirstRowHeader] = useState(true);
  const [trimCells, setTrimCells] = useState(true);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const parsed = useMemo(() => parseSource(source, inputType, trimCells), [inputType, source, trimCells]);
  const output = useMemo(
    () => serializeOutput(parsed.rows, outputType, firstRowHeader),
    [firstRowHeader, outputType, parsed.rows],
  );
  const columnCount = parsed.rows[0]?.length ?? 0;

  async function copyOutput() {
    try {
      await window.navigator.clipboard.writeText(output);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    window.setTimeout(() => setCopyState("idle"), 1500);
  }

  return (
    <>
      <section className="panel stack">
        <div className="eyebrow">utility / table</div>
        <div className="utility-title-row">
          <div>
            <h1 style={{ marginBottom: 8 }}>Table Converter</h1>
            <p className="muted" style={{ margin: 0 }}>
              Convert CSV, TSV, Markdown tables, and JSON-friendly table data.
            </p>
          </div>
          <div className="utility-status-tags">
            <span className="tag neutral">{parsed.detected.toUpperCase()}</span>
            <span className="tag neutral">
              {parsed.rows.length} x {columnCount}
            </span>
          </div>
        </div>
      </section>

      <section className="utility-workbench section">
        <div className="panel stack">
          <div className="utility-control-grid">
            <label className="field">
              <span className="label">Input</span>
              <select className="input" value={inputType} onChange={(event) => setInputType(event.target.value as InputType)}>
                {INPUT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Output</span>
              <select
                className="input"
                value={outputType}
                onChange={(event) => setOutputType(event.target.value as OutputType)}
              >
                {OUTPUT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="diff-options">
            <label>
              <input
                type="checkbox"
                checked={firstRowHeader}
                onChange={(event) => setFirstRowHeader(event.target.checked)}
              />
              First row is header
            </label>
            <label>
              <input type="checkbox" checked={trimCells} onChange={(event) => setTrimCells(event.target.checked)} />
              Trim cells
            </label>
          </div>

          <label className="field">
            <span className="label">Source</span>
            <textarea
              className="textarea utility-textarea mono-textarea"
              value={source}
              spellCheck={false}
              onChange={(event) => setSource(event.target.value)}
            />
          </label>

          <div className="actions">
            <button type="button" className="ghost-button" onClick={() => setSource(SAMPLE_TABLE)}>
              Sample
            </button>
            <button type="button" className="ghost-button" onClick={() => setSource("")}>
              Clear
            </button>
          </div>

          {parsed.error ? <div className="notice notice-error">{parsed.error}</div> : null}
        </div>

        <div className="panel stack">
          <div className="list-item-header">
            <h2 style={{ margin: 0 }}>Result</h2>
            <button type="button" className="ghost-button" onClick={copyOutput} disabled={!output}>
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
            </button>
          </div>

          <textarea className="textarea utility-textarea mono-textarea" value={output} readOnly spellCheck={false} />

          <div className="table-scroll utility-table-preview">
            {parsed.rows.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Parsed rows will appear here.
              </p>
            ) : (
              <table className="table">
                <tbody>
                  {parsed.rows.slice(0, 30).map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      {row.slice(0, 8).map((cell, cellIndex) => (
                        <td key={`cell-${rowIndex}-${cellIndex}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
