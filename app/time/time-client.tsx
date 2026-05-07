"use client";

import { useMemo, useState } from "react";

type TimeUnit = "minutes" | "hours" | "days" | "weeks" | "months" | "years";

const COMMON_ZONES = [
  "UTC",
  "Asia/Seoul",
  "Asia/Tokyo",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
];

const UNIT_OPTIONS: Array<{ value: TimeUnit; label: string }> = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "years", label: "Years" },
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateTimeLocalValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

function parseTimeInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return { date: null, source: "empty", error: "" };
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) {
      return { date: null, source: "number", error: "Number is too large." };
    }

    const milliseconds = Math.abs(numeric) >= 100000000000 ? numeric : numeric * 1000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime())
      ? { date: null, source: "timestamp", error: "Invalid timestamp." }
      : { date, source: Math.abs(numeric) >= 100000000000 ? "Unix milliseconds" : "Unix seconds", error: "" };
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime())
    ? { date: null, source: "date string", error: "Invalid date string." }
    : { date: parsed, source: "date string", error: "" };
}

function formatInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(date);
}

function addToDate(date: Date, amount: number, unit: TimeUnit) {
  const next = new Date(date);

  if (unit === "minutes") next.setMinutes(next.getMinutes() + amount);
  if (unit === "hours") next.setHours(next.getHours() + amount);
  if (unit === "days") next.setDate(next.getDate() + amount);
  if (unit === "weeks") next.setDate(next.getDate() + amount * 7);
  if (unit === "months") next.setMonth(next.getMonth() + amount);
  if (unit === "years") next.setFullYear(next.getFullYear() + amount);

  return next;
}

function formatRelative(date: Date) {
  const diffMs = date.getTime() - Date.now();
  const absolute = Math.abs(diffMs);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
    ["second", 1000],
  ];

  const [unit, size] = units.find(([, itemSize]) => absolute >= itemSize) ?? ["second", 1000];
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.round(diffMs / size), unit);
}

export function TimeClient() {
  const now = new Date();
  const [input, setInput] = useState(String(now.getTime()));
  const [localValue, setLocalValue] = useState(toDateTimeLocalValue(now));
  const [amount, setAmount] = useState(7);
  const [unit, setUnit] = useState<TimeUnit>("days");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const parsed = useMemo(() => parseTimeInput(input), [input]);
  const shifted = useMemo(() => (parsed.date ? addToDate(parsed.date, amount, unit) : null), [amount, parsed.date, unit]);
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";

  async function copyIso() {
    if (!parsed.date) return;

    try {
      await window.navigator.clipboard.writeText(parsed.date.toISOString());
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    window.setTimeout(() => setCopyState("idle"), 1500);
  }

  function applyLocalDateTime() {
    const date = new Date(localValue);
    if (!Number.isNaN(date.getTime())) {
      setInput(date.toISOString());
    }
  }

  return (
    <>
      <section className="panel stack">
        <div className="eyebrow">utility / time</div>
        <div className="utility-title-row">
          <div>
            <h1 style={{ marginBottom: 8 }}>Time Converter</h1>
            <p className="muted" style={{ margin: 0 }}>
              Convert timestamps, ISO strings, local time, UTC, KST, and common zones.
            </p>
          </div>
          <div className="utility-status-tags">
            <span className="tag neutral">{parsed.source}</span>
            <span className="tag neutral">{localZone}</span>
          </div>
        </div>
      </section>

      <section className="utility-workbench section">
        <div className="panel stack">
          <label className="field">
            <span className="label">Timestamp or date string</span>
            <input className="input mono-input" value={input} onChange={(event) => setInput(event.target.value)} />
          </label>

          <div className="actions">
            <button type="button" className="button" onClick={() => setInput(String(Date.now()))}>
              Now ms
            </button>
            <button type="button" className="ghost-button" onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}>
              Now sec
            </button>
            <button type="button" className="ghost-button" onClick={() => setInput(new Date().toISOString())}>
              Now ISO
            </button>
          </div>

          <div className="utility-control-grid">
            <label className="field">
              <span className="label">Local date time</span>
              <input
                className="input"
                type="datetime-local"
                value={localValue}
                onChange={(event) => setLocalValue(event.target.value)}
              />
            </label>
            <div className="field utility-action-field">
              <span className="label">Apply</span>
              <button type="button" className="button" onClick={applyLocalDateTime}>
                Use local value
              </button>
            </div>
          </div>

          <div className="utility-control-grid">
            <label className="field">
              <span className="label">Date math amount</span>
              <input
                className="input"
                type="number"
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value || 0))}
              />
            </label>
            <label className="field">
              <span className="label">Unit</span>
              <select className="input" value={unit} onChange={(event) => setUnit(event.target.value as TimeUnit)}>
                {UNIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="panel stack">
          <div className="list-item-header">
            <h2 style={{ margin: 0 }}>Converted</h2>
            <button type="button" className="ghost-button" onClick={copyIso} disabled={!parsed.date}>
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy ISO"}
            </button>
          </div>

          {parsed.error ? <div className="notice notice-error">{parsed.error}</div> : null}

          {parsed.date ? (
            <>
              <div className="utility-fact-grid">
                <div className="utility-fact">
                  <span>Unix seconds</span>
                  <strong>{Math.floor(parsed.date.getTime() / 1000)}</strong>
                </div>
                <div className="utility-fact">
                  <span>Unix milliseconds</span>
                  <strong>{parsed.date.getTime()}</strong>
                </div>
                <div className="utility-fact">
                  <span>Relative</span>
                  <strong>{formatRelative(parsed.date)}</strong>
                </div>
                <div className="utility-fact">
                  <span>ISO</span>
                  <strong>{parsed.date.toISOString()}</strong>
                </div>
              </div>

              <div className="timezone-list">
                {COMMON_ZONES.map((zone) => (
                  <div key={zone} className="timezone-row">
                    <span>{zone}</span>
                    <strong>{formatInZone(parsed.date!, zone)}</strong>
                  </div>
                ))}
                <div className="timezone-row">
                  <span>{localZone}</span>
                  <strong>{formatInZone(parsed.date, localZone)}</strong>
                </div>
              </div>

              {shifted ? (
                <div className="notice">
                  <strong>
                    +{amount} {unit}
                  </strong>
                  <p style={{ margin: "8px 0 0" }}>{shifted.toISOString()}</p>
                </div>
              ) : null}
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Enter a timestamp or date string to convert.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
