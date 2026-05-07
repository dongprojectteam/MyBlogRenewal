"use client";

import { useState } from "react";

type RepairCandidate = {
  label: string;
  value: string;
  score: number;
};

const SAMPLE_TEXT =
  "\u00ec\u2022\u02c6\u00eb\u2026\u2022\u00ed\u2022\u02dc\u00ec\u201e\u00b8\u00ec\u0161\u201d, DOPT!";

export function MojibakeClient() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [candidates, setCandidates] = useState<RepairCandidate[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");
  const [copyId, setCopyId] = useState<string | null>(null);

  async function repairText() {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/mojibake/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Repair request failed.");
      }

      const data = (await response.json()) as { candidates?: RepairCandidate[] };
      setCandidates(data.candidates ?? []);
      setStatus("ready");
    } catch (error) {
      setCandidates([]);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Repair request failed.");
    }
  }

  async function copyCandidate(candidate: RepairCandidate, id: string) {
    try {
      await window.navigator.clipboard.writeText(candidate.value);
      setCopyId(id);
    } catch {
      setCopyId("failed");
    }

    window.setTimeout(() => setCopyId(null), 1500);
  }

  return (
    <>
      <section className="panel stack">
        <div className="eyebrow">utility / text repair</div>
        <div className="utility-title-row">
          <div>
            <h1 style={{ marginBottom: 8 }}>Korean Text Repair</h1>
            <p className="muted" style={{ margin: 0 }}>
              Try common UTF-8, CP949, EUC-KR, Windows-1252, and percent-decoding repairs.
            </p>
          </div>
          <div className="utility-status-tags">
            <span className="tag neutral">{status}</span>
            <span className="tag neutral">{text.length} chars</span>
          </div>
        </div>
      </section>

      <section className="utility-workbench section">
        <div className="panel stack">
          <label className="field">
            <span className="label">Broken text</span>
            <textarea
              className="textarea utility-textarea mono-textarea"
              value={text}
              spellCheck={false}
              onChange={(event) => setText(event.target.value)}
            />
          </label>

          <div className="actions">
            <button type="button" className="button" onClick={repairText} disabled={status === "loading" || !text.trim()}>
              {status === "loading" ? "Repairing" : "Find candidates"}
            </button>
            <button type="button" className="ghost-button" onClick={() => setText(SAMPLE_TEXT)}>
              Sample
            </button>
            <button type="button" className="ghost-button" onClick={() => setText("")}>
              Clear
            </button>
          </div>

          {message ? <div className="notice notice-error">{message}</div> : null}
        </div>

        <div className="panel stack">
          <div className="list-item-header">
            <h2 style={{ margin: 0 }}>Candidates</h2>
            <span className="tag neutral">{candidates.length} found</span>
          </div>

          {candidates.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Run repair to rank possible decoded texts.
            </p>
          ) : (
            <div className="candidate-list">
              {candidates.map((candidate, index) => {
                const id = `${candidate.label}-${index}`;
                return (
                  <article key={id} className={`candidate-card${index === 0 ? " is-best" : ""}`}>
                    <div className="list-item-header">
                      <div>
                        <strong>{index === 0 ? "Best guess" : candidate.label}</strong>
                        <p className="muted" style={{ margin: "4px 0 0" }}>
                          {candidate.label} / score {candidate.score}
                        </p>
                      </div>
                      <div className="actions">
                        <button type="button" className="ghost-button" onClick={() => setText(candidate.value)}>
                          Use
                        </button>
                        <button type="button" className="button" onClick={() => copyCandidate(candidate, id)}>
                          {copyId === id ? "Copied" : copyId === "failed" ? "Failed" : "Copy"}
                        </button>
                      </div>
                    </div>
                    <pre className="candidate-text">{candidate.value}</pre>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
