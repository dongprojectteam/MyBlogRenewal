"use client";

import { useMemo, useState } from "react";

type CodecMode = "json" | "url" | "base64" | "jwt";

type CodecResult = {
  output: string;
  error: string;
  facts: Array<{ label: string; value: string }>;
};

const SAMPLES: Record<CodecMode, string> = {
  json: '{"project":"DOPT","utilities":["diff","diagram","codec"],"visible":true}',
  url: "https://www.doptsw.org/search?q=hello%20dopt&tag=utility",
  base64: "SGVsbG8sIERPUFQh",
  jwt:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkb3B0IiwibmFtZSI6IkRPUFQiLCJpYXQiOjE3NzgxMTIwMDAsImV4cCI6MTc3ODExNTYwMH0.signature",
};

const MODE_OPTIONS: Array<{ value: CodecMode; label: string }> = [
  { value: "json", label: "JSON" },
  { value: "url", label: "URL" },
  { value: "base64", label: "Base64" },
  { value: "jwt", label: "JWT" },
];

function base64ToBytes(value: string) {
  const normalized = value.trim().replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = window.atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function encodeUtf8Base64(value: string) {
  return bytesToBase64(new TextEncoder().encode(value));
}

function decodeUtf8Base64(value: string) {
  return new TextDecoder().decode(base64ToBytes(value));
}

function formatClaimDate(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toISOString()} (${Intl.DateTimeFormat().format(date)})`;
}

function parseUrlFacts(value: string) {
  const parsed = new URL(value, "https://www.doptsw.org");
  return [
    { label: "Protocol", value: parsed.protocol.replace(":", "") || "-" },
    { label: "Host", value: parsed.host || "-" },
    { label: "Path", value: parsed.pathname || "/" },
    { label: "Query params", value: String(Array.from(parsed.searchParams.keys()).length) },
  ];
}

function inspectJwt(value: string): CodecResult {
  const parts = value.trim().split(".");
  if (parts.length < 2) {
    return { output: "", error: "JWT needs at least header and payload segments.", facts: [] };
  }

  try {
    const header = JSON.parse(decodeUtf8Base64(parts[0])) as Record<string, unknown>;
    const payload = JSON.parse(decodeUtf8Base64(parts[1])) as Record<string, unknown>;
    const facts = [
      { label: "Algorithm", value: String(header.alg ?? "-") },
      { label: "Type", value: String(header.typ ?? "-") },
      { label: "Subject", value: String(payload.sub ?? "-") },
      { label: "Issued at", value: formatClaimDate(payload.iat) || "-" },
      { label: "Expires", value: formatClaimDate(payload.exp) || "-" },
      { label: "Signature chars", value: String(parts[2]?.length ?? 0) },
    ];

    return {
      output: JSON.stringify({ header, payload }, null, 2),
      error: "",
      facts,
    };
  } catch (error) {
    return {
      output: "",
      error: error instanceof Error ? error.message : "Unable to decode JWT.",
      facts: [],
    };
  }
}

function autoInspect(mode: CodecMode, source: string): CodecResult {
  if (!source.trim()) return { output: "", error: "", facts: [] };

  try {
    if (mode === "json") {
      const parsed = JSON.parse(source);
      return {
        output: JSON.stringify(parsed, null, 2),
        error: "",
        facts: [
          { label: "Type", value: Array.isArray(parsed) ? "array" : typeof parsed },
          { label: "Size", value: `${source.length} chars` },
        ],
      };
    }

    if (mode === "url") {
      return {
        output: decodeURIComponent(source),
        error: "",
        facts: parseUrlFacts(source),
      };
    }

    if (mode === "base64") {
      const decoded = decodeUtf8Base64(source);
      return {
        output: decoded,
        error: "",
        facts: [
          { label: "Input", value: `${source.trim().length} chars` },
          { label: "Decoded", value: `${decoded.length} chars` },
        ],
      };
    }

    return inspectJwt(source);
  } catch (error) {
    return {
      output: "",
      error: error instanceof Error ? error.message : "Unable to inspect this value.",
      facts: [],
    };
  }
}

export function CodecClient() {
  const [mode, setMode] = useState<CodecMode>("json");
  const [source, setSource] = useState(SAMPLES.json);
  const [manualOutput, setManualOutput] = useState("");
  const [manualError, setManualError] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const result = useMemo(() => autoInspect(mode, source), [mode, source]);
  const output = manualOutput || result.output;
  const error = manualError || result.error;

  function switchMode(nextMode: CodecMode) {
    setMode(nextMode);
    setSource(SAMPLES[nextMode]);
    setManualOutput("");
    setManualError("");
  }

  function runAction(action: string) {
    setManualOutput("");
    setManualError("");

    try {
      if (action === "json-format") {
        setManualOutput(JSON.stringify(JSON.parse(source), null, 2));
      } else if (action === "json-minify") {
        setManualOutput(JSON.stringify(JSON.parse(source)));
      } else if (action === "json-escape") {
        setManualOutput(JSON.stringify(source));
      } else if (action === "json-unescape") {
        const parsed = JSON.parse(source);
        setManualOutput(typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2));
      } else if (action === "url-encode") {
        setManualOutput(encodeURIComponent(source));
      } else if (action === "url-decode") {
        setManualOutput(decodeURIComponent(source.replace(/\+/g, "%20")));
      } else if (action === "base64-encode") {
        setManualOutput(encodeUtf8Base64(source));
      } else if (action === "base64-decode") {
        setManualOutput(decodeUtf8Base64(source));
      }
    } catch (error) {
      setManualError(error instanceof Error ? error.message : "Action failed.");
    }
  }

  async function copyOutput() {
    try {
      await window.navigator.clipboard.writeText(output);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    window.setTimeout(() => setCopyState("idle"), 1600);
  }

  const actionButtons =
    mode === "json"
      ? [
          ["json-format", "Format"],
          ["json-minify", "Minify"],
          ["json-escape", "Escape"],
          ["json-unescape", "Unescape"],
        ]
      : mode === "url"
        ? [
            ["url-encode", "Encode"],
            ["url-decode", "Decode"],
          ]
        : mode === "base64"
          ? [
              ["base64-encode", "Encode UTF-8"],
              ["base64-decode", "Decode UTF-8"],
            ]
          : [];

  return (
    <>
      <section className="panel stack">
        <div className="eyebrow">utility / codec</div>
        <div className="utility-title-row">
          <div>
            <h1 style={{ marginBottom: 8 }}>Codec Toolkit</h1>
            <p className="muted" style={{ margin: 0 }}>
              JSON, URL, Base64, and JWT values in one scratchpad.
            </p>
          </div>
          <div className="utility-status-tags">
            <span className="tag neutral">{mode.toUpperCase()}</span>
            <span className="tag neutral">{source.length} chars</span>
          </div>
        </div>
      </section>

      <section className="utility-workbench section">
        <div className="panel stack">
          <div className="segmented-control utility-mode-control" role="group" aria-label="Codec mode">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`segment${mode === option.value ? " active" : ""}`}
                onClick={() => switchMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="field">
            <span className="label">Input</span>
            <textarea
              className="textarea utility-textarea mono-textarea"
              value={source}
              spellCheck={false}
              onChange={(event) => {
                setSource(event.target.value);
                setManualOutput("");
                setManualError("");
              }}
            />
          </label>

          <div className="actions">
            {actionButtons.map(([action, label]) => (
              <button key={action} type="button" className="button" onClick={() => runAction(action)}>
                {label}
              </button>
            ))}
            <button type="button" className="ghost-button" onClick={() => setSource("")}>
              Clear
            </button>
          </div>
        </div>

        <div className="panel stack">
          <div className="list-item-header">
            <h2 style={{ margin: 0 }}>Output</h2>
            <button type="button" className="ghost-button" onClick={copyOutput} disabled={!output}>
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
            </button>
          </div>

          {error ? <div className="notice notice-error">{error}</div> : null}

          {result.facts.length ? (
            <div className="utility-fact-grid">
              {result.facts.map((fact) => (
                <div key={fact.label} className="utility-fact">
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                </div>
              ))}
            </div>
          ) : null}

          <pre className="utility-output mono-output">{output || "Output will appear here."}</pre>
        </div>
      </section>
    </>
  );
}
