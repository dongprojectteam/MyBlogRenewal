"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { SiteHeader } from "@/components/site-header";

type DiffType = "same" | "added" | "removed" | "modified";

type DiffOptions = {
  ignoreCase: boolean;
  trimTrailingWhitespace: boolean;
  excludeBlankLines: boolean;
};

type InlinePart = {
  value: string;
  kind: "same" | "removed" | "added";
};

type DiffRow = {
  rowKey?: string;
  type: DiffType;
  leftLineNumber: number | null;
  rightLineNumber: number | null;
  leftText: string;
  rightText: string;
  leftParts?: InlinePart[];
  rightParts?: InlinePart[];
};

type DiffResult = {
  rows: DiffRow[];
  counts: {
    added: number;
    removed: number;
    modified: number;
  };
};

type HistoryEntry = {
  id: string;
  createdAt: string;
  left: string;
  right: string;
  options: DiffOptions;
  counts: DiffResult["counts"];
};

const HISTORY_KEY = "dopt-diff-history-v1";
const HISTORY_LIMIT = 40;

const DEFAULT_OPTIONS: DiffOptions = {
  ignoreCase: false,
  trimTrailingWhitespace: true,
  excludeBlankLines: true,
};

function normalizeForCompare(line: string, options: DiffOptions) {
  let value = options.trimTrailingWhitespace ? line.replace(/[ \t]+$/g, "") : line;
  if (options.ignoreCase) {
    value = value.toLowerCase();
  }
  return value;
}

function splitLines(text: string) {
  return text.replace(/\r\n/g, "\n").split("\n");
}

function isBlankLikeLine(line: string) {
  // Treat common invisible characters as blank content too.
  const normalized = line.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "");
  return normalized.trim().length === 0;
}

function computeLcsPairs(left: string[], right: string[]) {
  const n = left.length;
  const m = right.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      if (left[i] === right[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (left[i] === right[j]) {
      pairs.push([i, j]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }

  return pairs;
}

function computeInlineDiff(leftText: string, rightText: string) {
  const leftChars = Array.from(leftText);
  const rightChars = Array.from(rightText);
  const pairs = computeLcsPairs(leftChars, rightChars);

  const leftParts: InlinePart[] = [];
  const rightParts: InlinePart[] = [];

  let leftCursor = 0;
  let rightCursor = 0;

  const pushPart = (target: InlinePart[], value: string, kind: InlinePart["kind"]) => {
    if (!value) {
      return;
    }
    const last = target[target.length - 1];
    if (last && last.kind === kind) {
      last.value += value;
      return;
    }
    target.push({ value, kind });
  };

  pairs.forEach(([li, ri]) => {
    if (leftCursor < li) {
      pushPart(leftParts, leftChars.slice(leftCursor, li).join(""), "removed");
    }
    if (rightCursor < ri) {
      pushPart(rightParts, rightChars.slice(rightCursor, ri).join(""), "added");
    }

    pushPart(leftParts, leftChars[li], "same");
    pushPart(rightParts, rightChars[ri], "same");

    leftCursor = li + 1;
    rightCursor = ri + 1;
  });

  if (leftCursor < leftChars.length) {
    pushPart(leftParts, leftChars.slice(leftCursor).join(""), "removed");
  }
  if (rightCursor < rightChars.length) {
    pushPart(rightParts, rightChars.slice(rightCursor).join(""), "added");
  }

  return { leftParts, rightParts };
}

function buildDiff(leftRaw: string, rightRaw: string, options: DiffOptions): DiffResult {
  const leftLines = splitLines(leftRaw);
  const rightLines = splitLines(rightRaw);

  const leftComparable = leftLines.map((line) => normalizeForCompare(line, options));
  const rightComparable = rightLines.map((line) => normalizeForCompare(line, options));

  const pairs = computeLcsPairs(leftComparable, rightComparable);

  const rows: DiffRow[] = [];
  const counts = { added: 0, removed: 0, modified: 0 };

  let leftIndex = 0;
  let rightIndex = 0;

  const processChangeBlock = (leftEnd: number, rightEnd: number) => {
    const removed: number[] = [];
    const added: number[] = [];

    for (let i = leftIndex; i < leftEnd; i += 1) {
      removed.push(i);
    }
    for (let j = rightIndex; j < rightEnd; j += 1) {
      added.push(j);
    }

    const modifiedCount = Math.min(removed.length, added.length);
    for (let k = 0; k < modifiedCount; k += 1) {
      const li = removed[k];
      const ri = added[k];
      const { leftParts, rightParts } = computeInlineDiff(leftLines[li] ?? "", rightLines[ri] ?? "");
      rows.push({
        type: "modified",
        leftLineNumber: li + 1,
        rightLineNumber: ri + 1,
        leftText: leftLines[li] ?? "",
        rightText: rightLines[ri] ?? "",
        leftParts,
        rightParts,
      });
      counts.modified += 1;
    }

    for (let k = modifiedCount; k < removed.length; k += 1) {
      const li = removed[k];
      rows.push({
        type: "removed",
        leftLineNumber: li + 1,
        rightLineNumber: null,
        leftText: leftLines[li] ?? "",
        rightText: "",
      });
      counts.removed += 1;
    }

    for (let k = modifiedCount; k < added.length; k += 1) {
      const ri = added[k];
      rows.push({
        type: "added",
        leftLineNumber: null,
        rightLineNumber: ri + 1,
        leftText: "",
        rightText: rightLines[ri] ?? "",
      });
      counts.added += 1;
    }
  };

  pairs.forEach(([leftPair, rightPair]) => {
    if (leftIndex < leftPair || rightIndex < rightPair) {
      processChangeBlock(leftPair, rightPair);
    }

    rows.push({
      type: "same",
      leftLineNumber: leftPair + 1,
      rightLineNumber: rightPair + 1,
      leftText: leftLines[leftPair] ?? "",
      rightText: rightLines[rightPair] ?? "",
    });

    leftIndex = leftPair + 1;
    rightIndex = rightPair + 1;
  });

  if (leftIndex < leftLines.length || rightIndex < rightLines.length) {
    processChangeBlock(leftLines.length, rightLines.length);
  }

  return { rows, counts };
}

function formatDate(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return dateIso;
  }
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function previewLine(text: string) {
  const first = splitLines(text)[0] ?? "";
  return first.length > 42 ? `${first.slice(0, 42)}...` : first;
}

function renderInline(parts: InlinePart[] | undefined, fallback: string, side: "left" | "right") {
  if (!parts || parts.length === 0) {
    return fallback || "\u00A0";
  }

  return parts.map((part, index) => {
    const className =
      part.kind === "same"
        ? ""
        : part.kind === "removed"
          ? "diff-inline-removed"
          : "diff-inline-added";

    return (
      <span key={`${side}-${index}`} className={className}>
        {part.value || "\u00A0"}
      </span>
    );
  });
}

export default function DiffPage() {
  const [leftInput, setLeftInput] = useState("");
  const [rightInput, setRightInput] = useState("");
  const [leftCompared, setLeftCompared] = useState("");
  const [rightCompared, setRightCompared] = useState("");
  const [options, setOptions] = useState<DiffOptions>(DEFAULT_OPTIONS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [hideSameRows, setHideSameRows] = useState(false);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const resultSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as HistoryEntry[];
      if (Array.isArray(parsed)) {
        setHistory(parsed);
      }
    } catch {
      setHistory([]);
    }
  }, []);

  const diffResult = useMemo(() => buildDiff(leftCompared, rightCompared, options), [leftCompared, rightCompared, options]);

  const summaryItems = useMemo(() => {
    return diffResult.rows.map((row, index) => ({ row, rowKey: `${row.leftLineNumber}-${row.rightLineNumber}-${index}` })).filter((item) => item.row.type !== "same");
  }, [diffResult.rows]);

  const rowItems = useMemo(() => {
    return diffResult.rows.map((row, index) => ({
      row,
      rowKey: `${row.leftLineNumber}-${row.rightLineNumber}-${index}`,
    }));
  }, [diffResult.rows]);

  const visibleRowItems = useMemo(() => {
    return rowItems.filter((item) => {
      const { row } = item;

      if (hideSameRows && row.type === "same") {
        return false;
      }

      if (!options.excludeBlankLines) {
        return true;
      }

      if (row.type !== "same") {
        return true;
      }

      const leftBlank = isBlankLikeLine(row.leftText);
      const rightBlank = isBlankLikeLine(row.rightText);

      // With excludeBlankLines on, hide only SAME rows that are blank on both sides.
      return !(leftBlank && rightBlank);
    });
  }, [hideSameRows, options.excludeBlankLines, rowItems]);

  const persistHistory = (entries: HistoryEntry[]) => {
    setHistory(entries);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  };

  const handleCompare = () => {
    setLeftCompared(leftInput);
    setRightCompared(rightInput);

    const result = buildDiff(leftInput, rightInput, options);
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      left: leftInput,
      right: rightInput,
      options,
      counts: result.counts,
    };

    const next = [entry, ...history].slice(0, HISTORY_LIMIT);
    persistHistory(next);
    setActiveHistoryId(null);
  };

  const handleClear = () => {
    setLeftInput("");
    setRightInput("");
    setLeftCompared("");
    setRightCompared("");
    setActiveHistoryId(null);
  };

  const handleRestore = (entry: HistoryEntry) => {
    setOptions(entry.options);
    setLeftInput(entry.left);
    setRightInput(entry.right);
    setLeftCompared(entry.left);
    setRightCompared(entry.right);
    setActiveHistoryId(entry.id);

    requestAnimationFrame(() => {
      resultSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleDeleteHistoryItem = (id: string) => {
    const next = history.filter((item) => item.id !== id);
    persistHistory(next);
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
    }
  };

  const handleClearHistory = () => {
    persistHistory([]);
  };

  const handleJumpToRow = (rowKey: string) => {
    const target = rowRefs.current[rowKey];
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const hasComparedContent = leftCompared.length > 0 || rightCompared.length > 0;

  return (
    <div className="page-shell">
      <SiteHeader />

      <section className="panel stack">
        <div className="eyebrow">utility / diff</div>
        <h1 style={{ marginBottom: 8 }}>Text Diff Utility</h1>
        <p className="muted" style={{ marginTop: 0, marginBottom: 0 }}>
          두 텍스트를 비교해 라인 단위와 문자 단위 차이를 함께 보여줍니다.
        </p>
      </section>

      <section ref={resultSectionRef} className="panel stack section">
        <div className="diff-input-grid">
          <label className="field">
            <span className="label">Original (left)</span>
            <textarea
              className="textarea diff-textarea"
              value={leftInput}
              onChange={(event) => setLeftInput(event.target.value)}
              placeholder="원본 텍스트를 입력하세요"
            />
          </label>

          <label className="field">
            <span className="label">Updated (right)</span>
            <textarea
              className="textarea diff-textarea"
              value={rightInput}
              onChange={(event) => setRightInput(event.target.value)}
              placeholder="비교할 텍스트를 입력하세요"
            />
          </label>
        </div>

        <div className="actions">
          <button type="button" className="button" onClick={handleCompare}>
            Compare
          </button>
          <button type="button" className="ghost-button" onClick={handleClear}>
            Clear
          </button>
        </div>

        <div className="diff-options">
          <label>
            <input
              type="checkbox"
              checked={options.ignoreCase}
              onChange={(event) => setOptions((prev) => ({ ...prev, ignoreCase: event.target.checked }))}
            />
            Ignore case
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.trimTrailingWhitespace}
              onChange={(event) =>
                setOptions((prev) => ({ ...prev, trimTrailingWhitespace: event.target.checked }))
              }
            />
            Trim trailing whitespace
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.excludeBlankLines}
              onChange={(event) => setOptions((prev) => ({ ...prev, excludeBlankLines: event.target.checked }))}
            />
            Exclude blank lines
          </label>
        </div>
      </section>

      <section className="panel stack section">
        <div className="diff-counts">
          <span className="tag neutral">Added {diffResult.counts.added}</span>
          <span className="tag neutral">Removed {diffResult.counts.removed}</span>
          <span className="tag neutral">Modified {diffResult.counts.modified}</span>
        </div>
        <div className="actions">
          <button type="button" className="ghost-button" onClick={() => setHideSameRows((prev) => !prev)}>
            {hideSameRows ? "동일항목 모두 펼치기" : "동일항목 모두 접기"}
          </button>
        </div>
        {!hasComparedContent ? (
          <p className="muted" style={{ margin: 0 }}>
            좌우 텍스트를 입력한 뒤 Compare를 누르면 차이점을 보여줍니다.
          </p>
        ) : (
          <div className="diff-table-wrap">
            <div className="diff-table-head">
              <div>Original</div>
              <div>Updated</div>
            </div>
            <div className="diff-table-body">
              {visibleRowItems.map(({ row, rowKey }) => {
                return (
                <div
                  key={rowKey}
                  ref={(node) => {
                    rowRefs.current[rowKey] = node;
                  }}
                  className={`diff-row diff-${row.type}`}
                >
                  <div className="diff-cell">
                    <span className="diff-line-no">{row.leftLineNumber ?? "-"}</span>
                    <pre className="diff-text">{renderInline(row.leftParts, row.leftText, "left")}</pre>
                  </div>

                  <div className="diff-cell">
                    <span className="diff-line-no">{row.rightLineNumber ?? "-"}</span>
                    <div>
                      <span className="tag neutral">{row.type.toUpperCase()}</span>
                      <pre className="diff-text">{renderInline(row.rightParts, row.rightText, "right")}</pre>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="panel stack section">
        <h2 style={{ marginBottom: 2 }}>Changed Only</h2>
        {summaryItems.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            변경된 부분이 없습니다.
          </p>
        ) : (
          <div className="diff-summary-grid">
            {summaryItems.map(({ row, rowKey }, index) => (
              <button
                key={`${row.type}-${row.leftLineNumber}-${row.rightLineNumber}-${index}`}
                type="button"
                className="diff-summary-card diff-summary-button"
                onClick={() => handleJumpToRow(rowKey)}
              >
                <div className="tag neutral">{row.type.toUpperCase()}</div>
                <p className="muted" style={{ marginTop: 10, marginBottom: 10 }}>
                  L{row.leftLineNumber ?? "-"} {"->"} R{row.rightLineNumber ?? "-"}
                </p>
                {row.leftText ? (
                  <pre className="diff-summary-text diff-summary-before">
                    - {renderInline(row.leftParts, row.leftText, "left")}
                  </pre>
                ) : null}
                {row.rightText ? (
                  <pre className="diff-summary-text diff-summary-after">
                    + {renderInline(row.rightParts, row.rightText, "right")}
                  </pre>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="panel stack section">
        <div className="list-item-header">
          <h2 style={{ marginBottom: 0 }}>History</h2>
          <button type="button" className="ghost-button" onClick={handleClearHistory} disabled={history.length === 0}>
            Clear All
          </button>
        </div>

        {history.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            비교 이력이 없습니다.
          </p>
        ) : (
          <div className="diff-history-list">
            {history.map((entry) => (
              <article key={entry.id} className="diff-history-item">
                <button type="button" className="diff-history-main" onClick={() => handleRestore(entry)}>
                  <strong>{formatDate(entry.createdAt)}</strong>
                  {activeHistoryId === entry.id ? <span className="tag neutral">현재 불러온 항목</span> : null}
                  <span className="muted">L: {previewLine(entry.left) || "(empty)"}</span>
                  <span className="muted">R: {previewLine(entry.right) || "(empty)"}</span>
                  <span className="muted">
                    +{entry.counts.added} / -{entry.counts.removed} / ~{entry.counts.modified}
                  </span>
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => handleDeleteHistoryItem(entry.id)}
                  aria-label="Delete history item"
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
