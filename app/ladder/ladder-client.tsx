"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Complexity = "simple" | "balanced" | "dense";

type NamedRow = {
  id: string;
  value: string;
};

type Bridge = {
  row: number;
  left: number;
};

type LadderRun = {
  id: string;
  createdAt: string;
  participants: string[];
  results: string[];
  complexity: Complexity;
  seed: number;
  rowCount: number;
  bridges: Bridge[];
  matches: number[];
  revealedIndexes: number[];
};

type RoutePoint = {
  x: number;
  y: number;
};

type ValidationResult =
  | {
      ok: true;
      participants: string[];
      results: string[];
      message: "";
    }
  | {
      ok: false;
      participants: string[];
      results: string[];
      message: string;
    };

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 12;
const HISTORY_LIMIT = 30;
const HISTORY_KEY = "dopt-ladder-history-v1";
const ROUTE_DURATION_MS = 1100;

const DEFAULT_PARTICIPANTS = ["나", "친구 1", "친구 2", "친구 3"];
const DEFAULT_RESULTS = ["커피", "디저트", "설거지", "행운"];

const COMPLEXITY_OPTIONS: Array<{ id: Complexity; label: string; density: number }> = [
  { id: "simple", label: "간단", density: 0.22 },
  { id: "balanced", label: "보통", density: 0.31 },
  { id: "dense", label: "복잡", density: 0.4 },
];

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createRows(values: string[], prefix: string): NamedRow[] {
  return values.map((value, index) => ({ id: `${prefix}-${index}-${createId("row")}`, value }));
}

function normalizeValues(rows: NamedRow[]) {
  return rows.map((row) => row.value.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function validateRows(participantRows: NamedRow[], resultRows: NamedRow[]): ValidationResult {
  const participants = normalizeValues(participantRows);
  const results = normalizeValues(resultRows);

  if (participants.length < MIN_PLAYERS) {
    return { ok: false, participants, results, message: "참가자는 최소 2명 이상 필요합니다." };
  }

  if (participants.length > MAX_PLAYERS) {
    return { ok: false, participants, results, message: "참가자는 최대 12명까지 사용할 수 있습니다." };
  }

  if (participants.length !== results.length) {
    return {
      ok: false,
      participants,
      results,
      message: `참가자 ${participants.length}명과 결과 ${results.length}개의 수가 같아야 합니다.`,
    };
  }

  return { ok: true, participants, results, message: "" };
}

function createSeed() {
  return Math.floor(Math.random() * 2_147_483_647);
}

function createRandom(seed: number) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function getRowCount(count: number, complexity: Complexity) {
  if (complexity === "simple") return count * 2 + 4;
  if (complexity === "dense") return count * 4 + 8;
  return count * 3 + 6;
}

function getDensity(complexity: Complexity) {
  return COMPLEXITY_OPTIONS.find((item) => item.id === complexity)?.density ?? 0.31;
}

function generateBridges(count: number, rowCount: number, complexity: Complexity, seed: number): Bridge[] {
  const random = createRandom(seed);
  const density = getDensity(complexity);
  const bridges: Bridge[] = [];

  for (let row = 0; row < rowCount; row += 1) {
    const occupied = new Set<number>();

    for (let left = 0; left < count - 1; left += 1) {
      if (occupied.has(left - 1) || occupied.has(left) || occupied.has(left + 1)) continue;

      if (random() < density) {
        bridges.push({ row, left });
        occupied.add(left);
      }
    }
  }

  if (bridges.length < count - 1) {
    for (let index = 0; index < count - 1; index += 1) {
      bridges.push({ row: (index * 2) % rowCount, left: index });
    }
  }

  return bridges.sort((a, b) => (a.row === b.row ? a.left - b.left : a.row - b.row));
}

function hasBridge(bridgeSet: Set<string>, row: number, left: number) {
  return bridgeSet.has(`${row}:${left}`);
}

function createBridgeSet(bridges: Bridge[]) {
  return new Set(bridges.map((bridge) => `${bridge.row}:${bridge.left}`));
}

function computeMatches(count: number, rowCount: number, bridges: Bridge[]) {
  const bridgeSet = createBridgeSet(bridges);
  const matches: number[] = [];

  for (let start = 0; start < count; start += 1) {
    let column = start;

    for (let row = 0; row < rowCount; row += 1) {
      if (hasBridge(bridgeSet, row, column)) {
        column += 1;
      } else if (hasBridge(bridgeSet, row, column - 1)) {
        column -= 1;
      }
    }

    matches.push(column);
  }

  return matches;
}

function createRun(participants: string[], results: string[], complexity: Complexity): LadderRun {
  const seed = createSeed();
  const rowCount = getRowCount(participants.length, complexity);
  const bridges = generateBridges(participants.length, rowCount, complexity, seed);

  return {
    id: createId("ladder"),
    createdAt: new Date().toISOString(),
    participants,
    results,
    complexity,
    seed,
    rowCount,
    bridges,
    matches: computeMatches(participants.length, rowCount, bridges),
    revealedIndexes: [],
  };
}

function isComplexity(value: unknown): value is Complexity {
  return value === "simple" || value === "balanced" || value === "dense";
}

function isValidBridge(value: unknown, rowCount: number, count: number): value is Bridge {
  if (!value || typeof value !== "object") return false;
  const bridge = value as Bridge;
  return (
    Number.isInteger(bridge.row) &&
    Number.isInteger(bridge.left) &&
    bridge.row >= 0 &&
    bridge.row < rowCount &&
    bridge.left >= 0 &&
    bridge.left < count - 1
  );
}

function isValidRun(value: unknown): value is LadderRun {
  if (!value || typeof value !== "object") return false;
  const run = value as LadderRun;
  const count = Array.isArray(run.participants) ? run.participants.length : 0;

  return (
    typeof run.id === "string" &&
    typeof run.createdAt === "string" &&
    Array.isArray(run.participants) &&
    Array.isArray(run.results) &&
    run.participants.every((item) => typeof item === "string") &&
    run.results.every((item) => typeof item === "string") &&
    count >= MIN_PLAYERS &&
    count <= MAX_PLAYERS &&
    run.results.length === count &&
    isComplexity(run.complexity) &&
    Number.isInteger(run.seed) &&
    Number.isInteger(run.rowCount) &&
    run.rowCount > 0 &&
    Array.isArray(run.bridges) &&
    run.bridges.every((bridge) => isValidBridge(bridge, run.rowCount, count)) &&
    Array.isArray(run.matches) &&
    run.matches.length === count &&
    run.matches.every((item) => Number.isInteger(item) && item >= 0 && item < count) &&
    Array.isArray(run.revealedIndexes) &&
    run.revealedIndexes.every((item) => Number.isInteger(item) && item >= 0 && item < count)
  );
}

function readHistory(): LadderRun[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isValidRun)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function writeHistory(records: LadderRun[]) {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, HISTORY_LIMIT)));
}

function upsertRun(records: LadderRun[], run: LadderRun) {
  return [run, ...records.filter((item) => item.id !== run.id)].slice(0, HISTORY_LIMIT);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 없음";

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getBoardMetrics(count: number, rowCount: number) {
  const width = Math.max(680, count * 118);
  const height = 460;
  const padX = 58;
  const topY = 32;
  const bottomY = 420;
  const stepX = count <= 1 ? 0 : (width - padX * 2) / (count - 1);
  const stepY = (bottomY - topY) / (rowCount + 1);

  return {
    width,
    height,
    topY,
    bottomY,
    xAt: (index: number) => padX + stepX * index,
    yAt: (row: number) => topY + stepY * (row + 1),
  };
}

function getRoutePoints(run: LadderRun, startIndex: number): RoutePoint[] {
  const metrics = getBoardMetrics(run.participants.length, run.rowCount);
  const bridgeSet = createBridgeSet(run.bridges);
  const points: RoutePoint[] = [{ x: metrics.xAt(startIndex), y: metrics.topY }];
  let column = startIndex;

  for (let row = 0; row < run.rowCount; row += 1) {
    const y = metrics.yAt(row);
    points.push({ x: metrics.xAt(column), y });

    if (hasBridge(bridgeSet, row, column)) {
      column += 1;
      points.push({ x: metrics.xAt(column), y });
    } else if (hasBridge(bridgeSet, row, column - 1)) {
      column -= 1;
      points.push({ x: metrics.xAt(column), y });
    }
  }

  points.push({ x: metrics.xAt(column), y: metrics.bottomY });
  return points;
}

function pointsToString(points: RoutePoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function uniqueSortedIndexes(indexes: number[], count: number) {
  return Array.from(new Set(indexes.filter((index) => index >= 0 && index < count))).sort((a, b) => a - b);
}

function EditableColumn({
  title,
  rows,
  onAdd,
  onRemove,
  onMove,
  onChange,
}: {
  title: string;
  rows: NamedRow[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onChange: (id: string, value: string) => void;
}) {
  return (
    <div className="ladder-editor-column">
      <div className="ladder-editor-heading">
        <h2>{title}</h2>
        <button type="button" className="ghost-button" onClick={onAdd} disabled={rows.length >= MAX_PLAYERS}>
          추가
        </button>
      </div>

      <div className="ladder-row-list">
        {rows.map((row, index) => (
          <div className="ladder-input-row" key={row.id}>
            <label className="sr-only" htmlFor={row.id}>
              {title} {index + 1}
            </label>
            <input
              id={row.id}
              className="input"
              value={row.value}
              maxLength={32}
              onChange={(event) => onChange(row.id, event.target.value)}
              placeholder={`${title} ${index + 1}`}
            />
            <button
              type="button"
              className="ladder-icon-button"
              onClick={() => onMove(row.id, -1)}
              disabled={index === 0}
              aria-label={`${title} ${index + 1} 위로 이동`}
            >
              ↑
            </button>
            <button
              type="button"
              className="ladder-icon-button"
              onClick={() => onMove(row.id, 1)}
              disabled={index === rows.length - 1}
              aria-label={`${title} ${index + 1} 아래로 이동`}
            >
              ↓
            </button>
            <button
              type="button"
              className="ladder-icon-button"
              onClick={() => onRemove(row.id)}
              disabled={rows.length <= MIN_PLAYERS}
              aria-label={`${title} ${index + 1} 삭제`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LadderBoard({
  run,
  selectedIndex,
  activePath,
  isTracing,
  onReveal,
  generationKey,
}: {
  run: LadderRun | null;
  selectedIndex: number | null;
  activePath: RoutePoint[];
  isTracing: boolean;
  onReveal: (index: number) => void;
  generationKey: number;
}) {
  if (!run) {
    return (
      <section className="panel ladder-board-panel ladder-empty-board">
        <div className="tag neutral">Ready</div>
        <h2>사다리를 생성하세요</h2>
        <p className="muted">참가자와 결과를 맞춘 뒤 생성하면 이곳에서 경로를 확인할 수 있습니다.</p>
      </section>
    );
  }

  const metrics = getBoardMetrics(run.participants.length, run.rowCount);
  const revealedSet = new Set(run.revealedIndexes);
  const activePoints = pointsToString(activePath);
  const gridStyle = {
    width: metrics.width,
    gridTemplateColumns: `repeat(${run.participants.length}, minmax(86px, 1fr))`,
  } satisfies CSSProperties;

  return (
    <section className="panel ladder-board-panel">
      <div className="ladder-board-header">
        <div>
          <span className="tag neutral">Seed {run.seed}</span>
          <span className="tag neutral">{COMPLEXITY_OPTIONS.find((item) => item.id === run.complexity)?.label}</span>
        </div>
        <span className="muted">
          {run.revealedIndexes.length}/{run.participants.length} 공개
        </span>
      </div>

      <div className="ladder-scroll">
        <div className="ladder-label-grid" style={gridStyle}>
          {run.participants.map((participant, index) => {
            const revealed = revealedSet.has(index);
            const selected = selectedIndex === index;

            return (
              <button
                type="button"
                key={`${run.id}-participant-${index}`}
                className={`ladder-person${revealed ? " is-revealed" : ""}${selected ? " is-selected" : ""}`}
                onClick={() => onReveal(index)}
                aria-pressed={revealed}
                aria-label={`${participant} 결과 ${revealed ? "공개됨" : "숨김"}`}
              >
                <span>{participant}</span>
              </button>
            );
          })}
        </div>

        <svg
          key={`${run.id}-${generationKey}`}
          className="ladder-svg"
          width={metrics.width}
          height={metrics.height}
          viewBox={`0 0 ${metrics.width} ${metrics.height}`}
          role="img"
          aria-label="사다리 경로"
        >
          {run.participants.map((_, index) => (
            <line
              key={`vertical-${index}`}
              className="ladder-line ladder-line-vertical"
              x1={metrics.xAt(index)}
              y1={metrics.topY}
              x2={metrics.xAt(index)}
              y2={metrics.bottomY}
              pathLength={1}
              style={{ animationDelay: `${index * 35}ms` }}
            />
          ))}

          {run.bridges.map((bridge, index) => {
            const y = metrics.yAt(bridge.row);
            return (
              <line
                key={`bridge-${bridge.row}-${bridge.left}-${index}`}
                className="ladder-line ladder-line-bridge"
                x1={metrics.xAt(bridge.left)}
                y1={y}
                x2={metrics.xAt(bridge.left + 1)}
                y2={y}
                pathLength={1}
                style={{ animationDelay: `${180 + index * 18}ms` }}
              />
            );
          })}

          {activePath.length > 0 ? (
            <polyline
              key={`${selectedIndex}-${activePoints}-${isTracing ? "trace" : "still"}`}
              className={`ladder-active-path${isTracing ? " is-tracing" : ""}`}
              points={activePoints}
              pathLength={1}
            />
          ) : null}
        </svg>

        <div className="ladder-label-grid ladder-result-grid" style={gridStyle}>
          {run.results.map((result, resultIndex) => {
            const ownerIndex = run.matches.findIndex((match) => match === resultIndex);
            const revealed = ownerIndex >= 0 && revealedSet.has(ownerIndex);

            return (
              <div
                key={`${run.id}-result-${resultIndex}`}
                className={`ladder-result-card${revealed ? " is-revealed" : ""}`}
                style={{ transitionDelay: revealed ? `${Math.max(ownerIndex, 0) * 55}ms` : "0ms" }}
              >
                <span>{revealed ? result : "결과 숨김"}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        {selectedIndex === null
          ? "선택된 참가자가 없습니다."
          : `${run.participants[selectedIndex]} 결과는 ${revealedSet.has(selectedIndex) ? run.results[run.matches[selectedIndex]] : "아직 숨김"}입니다.`}
      </div>
    </section>
  );
}

function MatchSummary({
  run,
  onReveal,
  onRevealAll,
}: {
  run: LadderRun | null;
  onReveal: (index: number) => void;
  onRevealAll: () => void;
}) {
  if (!run) {
    return (
      <section className="panel ladder-side-panel">
        <h2>결과</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          생성된 사다리의 매칭 결과가 여기에 표시됩니다.
        </p>
      </section>
    );
  }

  const revealedSet = new Set(run.revealedIndexes);
  const allRevealed = run.revealedIndexes.length === run.participants.length;

  return (
    <section className="panel ladder-side-panel">
      <div className="ladder-side-heading">
        <h2>결과</h2>
        <button type="button" className="ghost-button" onClick={onRevealAll} disabled={allRevealed}>
          전체 공개
        </button>
      </div>

      <ol className="ladder-match-list">
        {run.participants.map((participant, index) => {
          const revealed = revealedSet.has(index);
          const result = run.results[run.matches[index]];

          return (
            <li key={`${run.id}-match-${index}`} className={revealed ? "is-revealed" : ""}>
              <button type="button" onClick={() => onReveal(index)}>
                <span>{participant}</span>
                <strong>{revealed ? result : "숨김"}</strong>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function HistoryPanel({
  history,
  activeId,
  onRestore,
  onUseAsNew,
  onDelete,
  onClear,
}: {
  history: LadderRun[];
  activeId: string | null;
  onRestore: (run: LadderRun) => void;
  onUseAsNew: (run: LadderRun) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <section className="panel ladder-side-panel">
      <div className="ladder-side-heading">
        <h2>지난 기록</h2>
        <button type="button" className="ghost-button" onClick={onClear} disabled={history.length === 0}>
          전체 삭제
        </button>
      </div>

      {history.length === 0 ? (
        <p className="muted" style={{ marginBottom: 0 }}>
          저장된 기록이 없습니다.
        </p>
      ) : (
        <div className="ladder-history-list">
          {history.map((run) => {
            const summary = `${run.participants[0]}${run.participants.length > 1 ? ` 외 ${run.participants.length - 1}명` : ""}`;

            return (
              <article key={run.id} className={`ladder-history-item${activeId === run.id ? " is-active" : ""}`}>
                <button type="button" className="ladder-history-main" onClick={() => onRestore(run)}>
                  <strong>{formatDate(run.createdAt)}</strong>
                  <span>
                    {summary} · {run.revealedIndexes.length}/{run.participants.length} 공개
                  </span>
                </button>
                <div className="ladder-history-actions">
                  <button type="button" className="ghost-button" onClick={() => onUseAsNew(run)}>
                    다시 시작
                  </button>
                  <button type="button" className="danger-button" onClick={() => onDelete(run.id)}>
                    삭제
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function LadderClient() {
  const [participantRows, setParticipantRows] = useState(() => createRows(DEFAULT_PARTICIPANTS, "participant"));
  const [resultRows, setResultRows] = useState(() => createRows(DEFAULT_RESULTS, "result"));
  const [complexity, setComplexity] = useState<Complexity>("balanced");
  const [currentRun, setCurrentRun] = useState<LadderRun | null>(null);
  const [history, setHistory] = useState<LadderRun[]>([]);
  const [notice, setNotice] = useState("");
  const [storageNotice, setStorageNotice] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activePath, setActivePath] = useState<RoutePoint[]>([]);
  const [isTracing, setIsTracing] = useState(false);
  const [generationKey, setGenerationKey] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const traceTimerRef = useRef<number | null>(null);

  const validation = useMemo(() => validateRows(participantRows, resultRows), [participantRows, resultRows]);

  const persistHistory = useCallback((records: LadderRun[]) => {
    const capped = records.slice(0, HISTORY_LIMIT);
    setHistory(capped);

    try {
      writeHistory(capped);
      setStorageNotice("");
    } catch {
      setStorageNotice("브라우저 저장소에 기록을 저장하지 못했습니다.");
    }
  }, []);

  const persistRun = useCallback(
    (run: LadderRun) => {
      setCurrentRun(run);
      persistHistory(upsertRun(history, run));
    },
    [history, persistHistory],
  );

  useEffect(() => {
    setHistory(readHistory());

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(media.matches);

    const handleChange = () => setPrefersReducedMotion(media.matches);
    media.addEventListener("change", handleChange);
    return () => {
      media.removeEventListener("change", handleChange);
      if (traceTimerRef.current !== null) window.clearTimeout(traceTimerRef.current);
    };
  }, []);

  const updateRows = (kind: "participant" | "result", updater: (rows: NamedRow[]) => NamedRow[]) => {
    if (kind === "participant") {
      setParticipantRows((rows) => updater(rows));
    } else {
      setResultRows((rows) => updater(rows));
    }
  };

  const addRow = (kind: "participant" | "result") => {
    updateRows(kind, (rows) => {
      if (rows.length >= MAX_PLAYERS) return rows;
      return [...rows, { id: createId(kind), value: "" }];
    });
  };

  const removeRow = (kind: "participant" | "result", id: string) => {
    updateRows(kind, (rows) => {
      if (rows.length <= MIN_PLAYERS) return rows;
      return rows.filter((row) => row.id !== id);
    });
  };

  const moveRow = (kind: "participant" | "result", id: string, direction: -1 | 1) => {
    updateRows(kind, (rows) => {
      const index = rows.findIndex((row) => row.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= rows.length) return rows;

      const next = [...rows];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const changeRow = (kind: "participant" | "result", id: string, value: string) => {
    updateRows(kind, (rows) => rows.map((row) => (row.id === id ? { ...row, value } : row)));
  };

  const generate = () => {
    const nextValidation = validateRows(participantRows, resultRows);
    if (!nextValidation.ok) {
      setNotice(nextValidation.message);
      return;
    }

    const run = createRun(nextValidation.participants, nextValidation.results, complexity);
    setNotice("");
    setSelectedIndex(null);
    setActivePath([]);
    setIsTracing(false);
    setGenerationKey((value) => value + 1);
    persistRun(run);
  };

  const reset = () => {
    setParticipantRows(createRows(DEFAULT_PARTICIPANTS, "participant"));
    setResultRows(createRows(DEFAULT_RESULTS, "result"));
    setComplexity("balanced");
    setCurrentRun(null);
    setNotice("");
    setSelectedIndex(null);
    setActivePath([]);
    setIsTracing(false);
  };

  const updateRevealed = useCallback(
    (run: LadderRun, indexes: number[]) => {
      const nextRun = {
        ...run,
        revealedIndexes: uniqueSortedIndexes(indexes, run.participants.length),
      };

      persistRun(nextRun);
    },
    [persistRun],
  );

  const revealParticipant = useCallback(
    (index: number) => {
      if (!currentRun) return;

      if (traceTimerRef.current !== null) {
        window.clearTimeout(traceTimerRef.current);
      }

      setSelectedIndex(index);
      setActivePath(getRoutePoints(currentRun, index));
      setIsTracing(true);

      const duration = prefersReducedMotion ? 40 : ROUTE_DURATION_MS;
      traceTimerRef.current = window.setTimeout(() => {
        setIsTracing(false);
        updateRevealed(currentRun, [...currentRun.revealedIndexes, index]);
      }, duration);
    },
    [currentRun, prefersReducedMotion, updateRevealed],
  );

  const revealAll = () => {
    if (!currentRun) return;

    if (traceTimerRef.current !== null) {
      window.clearTimeout(traceTimerRef.current);
    }

    setSelectedIndex(null);
    setActivePath([]);
    setIsTracing(false);
    updateRevealed(
      currentRun,
      currentRun.participants.map((_, index) => index),
    );
  };

  const restoreRun = (run: LadderRun) => {
    setCurrentRun(run);
    setParticipantRows(createRows(run.participants, "participant"));
    setResultRows(createRows(run.results, "result"));
    setComplexity(run.complexity);
    setSelectedIndex(null);
    setActivePath([]);
    setIsTracing(false);
    setGenerationKey((value) => value + 1);
    setNotice("");
  };

  const useRunAsNew = (run: LadderRun) => {
    setParticipantRows(createRows(run.participants, "participant"));
    setResultRows(createRows(run.results, "result"));
    setComplexity(run.complexity);
    setCurrentRun(null);
    setSelectedIndex(null);
    setActivePath([]);
    setIsTracing(false);
    setNotice("저장된 입력을 새 사다리로 불러왔습니다.");
  };

  const deleteHistory = (id: string) => {
    persistHistory(history.filter((run) => run.id !== id));
  };

  const clearHistory = () => {
    persistHistory([]);
  };

  return (
    <>
      <section className="panel ladder-intro">
        <div>
          <div className="eyebrow">utility / ladder</div>
          <h1>Ladder Game</h1>
          <p className="muted">
            참가자와 결과를 입력하고, 선택한 경로를 애니메이션으로 따라가며 결과를 공개합니다.
          </p>
        </div>

        <div className="ladder-complexity">
          <span className="label">복잡도</span>
          <div className="segmented-control" role="tablist" aria-label="사다리 복잡도">
            {COMPLEXITY_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.id}
                className={`segment${complexity === option.id ? " active" : ""}`}
                onClick={() => setComplexity(option.id)}
                role="tab"
                aria-selected={complexity === option.id}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="ladder-layout section">
        <div className="ladder-main-stack">
          <section className="panel ladder-editor-panel">
            <div className="ladder-editor-grid">
              <EditableColumn
                title="참가자"
                rows={participantRows}
                onAdd={() => addRow("participant")}
                onRemove={(id) => removeRow("participant", id)}
                onMove={(id, direction) => moveRow("participant", id, direction)}
                onChange={(id, value) => changeRow("participant", id, value)}
              />
              <EditableColumn
                title="결과"
                rows={resultRows}
                onAdd={() => addRow("result")}
                onRemove={(id) => removeRow("result", id)}
                onMove={(id, direction) => moveRow("result", id, direction)}
                onChange={(id, value) => changeRow("result", id, value)}
              />
            </div>

            <div className="ladder-actions">
              <button type="button" className="button" onClick={generate} disabled={!validation.ok}>
                {currentRun ? "다시 섞기" : "사다리 생성"}
              </button>
              <button type="button" className="ghost-button" onClick={reset}>
                초기화
              </button>
              <span className="muted">
                {validation.ok ? `${validation.participants.length}명 준비됨` : validation.message}
              </span>
            </div>

            {notice ? <div className="notice">{notice}</div> : null}
            {storageNotice ? <div className="notice notice-error">{storageNotice}</div> : null}
          </section>

          <LadderBoard
            run={currentRun}
            selectedIndex={selectedIndex}
            activePath={activePath}
            isTracing={isTracing}
            onReveal={revealParticipant}
            generationKey={generationKey}
          />
        </div>

        <aside className="ladder-side-stack">
          <MatchSummary run={currentRun} onReveal={revealParticipant} onRevealAll={revealAll} />
          <HistoryPanel
            history={history}
            activeId={currentRun?.id ?? null}
            onRestore={restoreRun}
            onUseAsNew={useRunAsNew}
            onDelete={deleteHistory}
            onClear={clearHistory}
          />
        </aside>
      </section>
    </>
  );
}
