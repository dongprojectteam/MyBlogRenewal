"use client";

import { useMemo, useState } from "react";

type RegexFlag = "g" | "i" | "m" | "s" | "u" | "y";

type MatchItem = {
  id: string;
  index: number;
  value: string;
  groups: string[];
  namedGroups: Record<string, string>;
};

const FLAG_OPTIONS: Array<{ value: RegexFlag; label: string; title: string }> = [
  { value: "g", label: "g", title: "Global" },
  { value: "i", label: "i", title: "Ignore case" },
  { value: "m", label: "m", title: "Multiline" },
  { value: "s", label: "s", title: "Dot all" },
  { value: "u", label: "u", title: "Unicode" },
  { value: "y", label: "y", title: "Sticky" },
];

const SAMPLE_TEXT = [
  "GET /api/users/42 200 18ms",
  "POST /api/files 201 104ms",
  "GET /admin 302 7ms",
  "DELETE /api/users/42 204 31ms",
].join("\n");

function buildFlags(flags: Record<RegexFlag, boolean>) {
  return FLAG_OPTIONS.filter((option) => flags[option.value]).map((option) => option.value).join("");
}

function computeMatches(pattern: string, flags: string, text: string) {
  if (!pattern) {
    return { matches: [] as MatchItem[], error: "", replacementError: "", replaceOutput: "" };
  }

  try {
    const listingFlags = flags.includes("g") ? flags : `${flags}g`;
    const regex = new RegExp(pattern, listingFlags);
    const matches: MatchItem[] = [];
    let match: RegExpExecArray | null;
    let guard = 0;

    while ((match = regex.exec(text)) && guard < 1000) {
      matches.push({
        id: `${match.index}-${matches.length}`,
        index: match.index,
        value: match[0],
        groups: match.slice(1).map((group) => group ?? ""),
        namedGroups: match.groups ?? {},
      });

      if (match[0].length === 0) {
        regex.lastIndex += 1;
      }
      guard += 1;
    }

    return { matches, error: "", replacementError: "", replaceOutput: "" };
  } catch (error) {
    return {
      matches: [] as MatchItem[],
      error: error instanceof Error ? error.message : "Invalid regular expression.",
      replacementError: "",
      replaceOutput: "",
    };
  }
}

function replaceText(pattern: string, flags: string, text: string, replacement: string) {
  if (!pattern) return { value: "", error: "" };

  try {
    return { value: text.replace(new RegExp(pattern, flags), replacement), error: "" };
  } catch (error) {
    return { value: "", error: error instanceof Error ? error.message : "Replacement failed." };
  }
}

function buildHighlightParts(text: string, matches: MatchItem[]) {
  const parts: Array<{ id: string; text: string; match: boolean }> = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    if (match.index > cursor) {
      parts.push({ id: `plain-${index}`, text: text.slice(cursor, match.index), match: false });
    }

    if (match.value.length > 0) {
      parts.push({ id: `match-${index}`, text: match.value, match: true });
    }
    cursor = Math.max(cursor, match.index + match.value.length);
  });

  if (cursor < text.length) {
    parts.push({ id: "plain-end", text: text.slice(cursor), match: false });
  }

  return parts;
}

export function RegexClient() {
  const [pattern, setPattern] = useState("(GET|POST|DELETE)\\s+([^\\s]+)\\s+(\\d{3})");
  const [flags, setFlags] = useState<Record<RegexFlag, boolean>>({
    g: true,
    i: false,
    m: true,
    s: false,
    u: false,
    y: false,
  });
  const [text, setText] = useState(SAMPLE_TEXT);
  const [replacement, setReplacement] = useState("$1 $3 $2");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const flagString = buildFlags(flags);
  const matchResult = useMemo(() => computeMatches(pattern, flagString, text), [flagString, pattern, text]);
  const replaceResult = useMemo(
    () => replaceText(pattern, flagString, text, replacement),
    [flagString, pattern, replacement, text],
  );
  const highlightParts = useMemo(() => buildHighlightParts(text, matchResult.matches), [matchResult.matches, text]);
  const error = matchResult.error || replaceResult.error;

  async function copyReplacement() {
    try {
      await window.navigator.clipboard.writeText(replaceResult.value);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    window.setTimeout(() => setCopyState("idle"), 1500);
  }

  return (
    <>
      <section className="panel stack">
        <div className="eyebrow">utility / regex</div>
        <div className="utility-title-row">
          <div>
            <h1 style={{ marginBottom: 8 }}>Regex Tester</h1>
            <p className="muted" style={{ margin: 0 }}>
              Test JavaScript regular expressions with captures, highlights, and replacements.
            </p>
          </div>
          <div className="utility-status-tags">
            <span className="tag neutral">/{flagString}</span>
            <span className="tag neutral">{matchResult.matches.length} matches</span>
          </div>
        </div>
      </section>

      <section className="utility-workbench regex-workbench section">
        <div className="panel stack">
          <label className="field">
            <span className="label">Pattern</span>
            <input className="input mono-input" value={pattern} onChange={(event) => setPattern(event.target.value)} />
          </label>

          <div className="regex-flag-grid">
            {FLAG_OPTIONS.map((option) => (
              <label key={option.value} title={option.title}>
                <input
                  type="checkbox"
                  checked={flags[option.value]}
                  onChange={(event) => setFlags((previous) => ({ ...previous, [option.value]: event.target.checked }))}
                />
                {option.label}
              </label>
            ))}
          </div>

          <label className="field">
            <span className="label">Test text</span>
            <textarea
              className="textarea utility-textarea mono-textarea"
              value={text}
              spellCheck={false}
              onChange={(event) => setText(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="label">Replacement</span>
            <input
              className="input mono-input"
              value={replacement}
              onChange={(event) => setReplacement(event.target.value)}
            />
          </label>

          {error ? <div className="notice notice-error">{error}</div> : null}
        </div>

        <div className="panel stack">
          <div className="list-item-header">
            <h2 style={{ margin: 0 }}>Highlights</h2>
            <button type="button" className="ghost-button" onClick={copyReplacement} disabled={!replaceResult.value}>
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy replace"}
            </button>
          </div>

          <pre className="regex-highlight">
            {highlightParts.length
              ? highlightParts.map((part) => (
                  <span key={part.id} className={part.match ? "regex-match" : undefined}>
                    {part.text}
                  </span>
                ))
              : text || "Matches will appear here."}
          </pre>

          <div className="utility-output mono-output">{replaceResult.value || "Replacement preview will appear here."}</div>

          <div className="match-list">
            {matchResult.matches.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No matches.
              </p>
            ) : (
              matchResult.matches.map((match, index) => (
                <article key={match.id} className="match-card">
                  <div className="list-item-header">
                    <strong>#{index + 1}</strong>
                    <span className="tag neutral">index {match.index}</span>
                  </div>
                  <code>{match.value || "(zero width)"}</code>
                  {match.groups.length ? (
                    <div className="capture-list">
                      {match.groups.map((group, groupIndex) => (
                        <span key={`${match.id}-group-${groupIndex}`}>
                          ${groupIndex + 1}: {group || "(empty)"}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {Object.keys(match.namedGroups).length ? (
                    <div className="capture-list">
                      {Object.entries(match.namedGroups).map(([name, group]) => (
                        <span key={`${match.id}-${name}`}>
                          {name}: {group || "(empty)"}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}
