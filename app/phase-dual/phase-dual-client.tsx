"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PhaseDualBoard } from "./_components/phase-dual-board";
import { PhaseDualLoadingScreen } from "./_components/phase-dual-loading-screen";
import { PhaseDualStat } from "./_components/phase-dual-stat";
import { RuleBadge } from "./_components/rule-badge";
import { RuleMiniSimulation } from "./_components/rule-mini-simulation";
import type {
  PhaseDualAssetLoadState,
  PhaseDualAudioAssetKey,
  PhaseDualAnimState,
  PhaseDualHistoryEntry,
  PhaseDualLocalBest,
  PhaseDualMode,
  PhaseDualProgress,
  PhaseDualResult,
  PhaseDualScreenPhase,
} from "./_types";
import { PHASE_DUAL_ANIM_MS, PHASE_DUAL_COLOR_FILL } from "./_lib/board-rendering";
import {
  PHASE_DUAL_DIRECTIONS,
  applyLinkRule,
  buildSession,
  calcPhaseDualScore,
  calcSlide,
  checkClear,
  cloneSession,
  executeMove,
  ruleEnglishLabel,
  ruleLabel,
  type PhaseDualDirection,
  type PhaseDualLinkRule,
  type PhaseDualPieceColor,
  type PhaseDualPiecePosMap,
  type PhaseDualPuzzle,
  type PhaseDualSession,
} from "./_lib/engine";
import { PHASE_DUAL_AUDIO_ASSETS } from "./_lib/audio-assets";
import { formatPhaseDualTime, normalizePhaseDualPlayerName } from "./_lib/format";
import { CAMPAIGN_PUZZLES, formatDailyKey, getDailyPuzzleByDate, getPuzzle } from "./_lib/puzzles";
import {
  PHASE_DUAL_DEFAULT_PLAYER_NAME,
  readPhaseDualBestMap,
  readPhaseDualDailySubmitted,
  readPhaseDualPlayerName,
  readPhaseDualProgress,
  readPhaseDualSeenRules,
  writePhaseDualBest,
  writePhaseDualDailySubmitted,
  writePhaseDualPlayerName,
  writePhaseDualProgress,
  writePhaseDualSeenRule,
} from "./_lib/storage";
import type { PhaseDualScore } from "@/types";

const UNDO_LIMIT = 200;
const COLOR_KEYBINDS: Record<string, number> = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
  "6": 5,
};

function isFormTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clonePositions(positions: PhaseDualPiecePosMap): PhaseDualHistoryEntry["posA"] {
  const copy: Record<string, { row: number; col: number } | undefined> = {};
  for (const [color, pos] of Object.entries(positions)) {
    copy[color] = pos ? { row: pos.row, col: pos.col } : undefined;
  }
  return copy;
}

function dirSymbol(direction: PhaseDualDirection) {
  const map: Record<PhaseDualDirection, string> = {
    up: "↑",
    down: "↓",
    left: "←",
    right: "→",
  };
  return map[direction];
}

function tierName(tier: 1 | 2 | 3 | 4 | 5) {
  const names = {
    1: "입문",
    2: "초급",
    3: "중급",
    4: "고급",
    5: "마스터",
  } as const;
  return names[tier];
}

function ruleExplanation(rule: PhaseDualLinkRule) {
  switch (rule) {
    case "mirror_h":
      return "Grid B는 좌우 입력만 반대로 반응합니다.";
    case "mirror_v":
      return "Grid B는 위아래 입력만 반대로 반응합니다.";
    case "inverse":
      return "Grid B는 모든 방향을 정반대로 미끄러집니다.";
    case "rotate_cw":
      return "Grid B의 반응이 시계 방향으로 90도 회전합니다.";
    case "rotate_ccw":
      return "Grid B의 반응이 반시계 방향으로 90도 회전합니다.";
    case "transpose":
      return "Grid B는 가로와 세로 축을 맞바꾸어 반응합니다.";
  }
}

function isPieceSolved(session: PhaseDualSession, puzzle: PhaseDualPuzzle, color: PhaseDualPieceColor) {
  const pieceA = puzzle.gridA.pieces.find((piece) => piece.color === color);
  const pieceB = puzzle.gridB.pieces.find((piece) => piece.color === color);
  const posA = session.posA[color];
  const posB = session.posB[color];

  if (!pieceA || !pieceB || !posA || !posB) return false;
  return (
    posA.row === pieceA.targetRow &&
    posA.col === pieceA.targetCol &&
    posB.row === pieceB.targetRow &&
    posB.col === pieceB.targetCol
  );
}

export function PhaseDualClient() {
  const [mode, setMode] = useState<PhaseDualMode>("campaign");
  const [tier, setTier] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [currentPuzzleId, setCurrentPuzzleId] = useState("campaign-01");
  const [phase, setPhase] = useState<PhaseDualScreenPhase>("tutorial");
  const [session, setSession] = useState<PhaseDualSession | null>(null);
  const [selected, setSelected] = useState<PhaseDualPieceColor | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [undoCount, setUndoCount] = useState(0);
  const [history, setHistory] = useState<PhaseDualHistoryEntry[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [animState, setAnimState] = useState<PhaseDualAnimState | null>(null);
  const [shake, setShake] = useState({ active: false, ms: 0 });
  const [tutorialRule, setTutorialRule] = useState<PhaseDualLinkRule | null>(null);
  const [seenRules, setSeenRules] = useState<Set<PhaseDualLinkRule>>(new Set());
  const [progress, setProgress] = useState<PhaseDualProgress>({ unlockedIds: ["campaign-01"], clearedIds: [] });
  const [bests, setBests] = useState<Record<string, PhaseDualLocalBest>>({});
  const [result, setResult] = useState<PhaseDualResult | null>(null);
  const [playerName, setPlayerName] = useState(PHASE_DUAL_DEFAULT_PLAYER_NAME);
  const [dailyKey, setDailyKey] = useState("");
  const [leaderboard, setLeaderboard] = useState<PhaseDualScore[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [assetLoadState, setAssetLoadState] = useState<PhaseDualAssetLoadState>("loading");
  const [assetLoadError, setAssetLoadError] = useState("");

  const sessionRef = useRef<PhaseDualSession | null>(null);
  const startedAtMsRef = useRef<number | null>(null);
  const elapsedBaseRef = useRef(0);
  const moveCountRef = useRef(0);
  const undoCountRef = useRef(0);
  const dropSoundRef = useRef<HTMLAudioElement | null>(null);
  const breakSoundRef = useRef<HTMLAudioElement | null>(null);
  const blockSoundRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlsRef = useRef<string[]>([]);

  const currentPuzzle = useMemo(() => getPuzzle(currentPuzzleId), [currentPuzzleId]);
  const tierPuzzles = useMemo(() => CAMPAIGN_PUZZLES.filter((puzzle) => puzzle.tier === tier), [tier]);
  const localBest = currentPuzzle ? bests[currentPuzzle.id] : undefined;

  useEffect(() => {
    setPlayerName(readPhaseDualPlayerName());
    setBests(readPhaseDualBestMap());
    setProgress(readPhaseDualProgress());
    setSeenRules(readPhaseDualSeenRules());
    setDailyKey(formatDailyKey(new Date()));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const releaseObjectUrls = () => {
      audioObjectUrlsRef.current.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
      audioObjectUrlsRef.current = [];
    };

    const loadAudioAssets = async () => {
      setAssetLoadState("loading");
      setAssetLoadError("");

      const nextObjectUrls: string[] = [];
      const loadedAssets = new Map<PhaseDualAudioAssetKey, HTMLAudioElement>();

      try {
        for (const asset of PHASE_DUAL_AUDIO_ASSETS) {
          const response = await fetch(asset.src, {
            cache: "force-cache",
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`Audio asset request failed with ${response.status}: ${asset.src}`);
          }

          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          nextObjectUrls.push(objectUrl);

          const audio = new Audio(objectUrl);
          audio.preload = "auto";
          audio.volume = asset.volume;
          audio.playbackRate = asset.playbackRate ?? 1;
          audio.load();

          loadedAssets.set(asset.key, audio);
        }

        if (!isMounted) {
          nextObjectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
          return;
        }

        releaseObjectUrls();
        audioObjectUrlsRef.current = nextObjectUrls;
        dropSoundRef.current = loadedAssets.get("drop") ?? null;
        breakSoundRef.current = loadedAssets.get("break") ?? null;
        blockSoundRef.current = loadedAssets.get("block") ?? null;
        setAssetLoadState("ready");
      } catch (error) {
        nextObjectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));

        if (controller.signal.aborted || !isMounted) return;

        setAssetLoadState("error");
        setAssetLoadError(error instanceof Error ? error.message : "게임 리소스를 불러오지 못했습니다.");
      }
    };

    loadAudioAssets();

    return () => {
      isMounted = false;
      controller.abort();
      dropSoundRef.current = null;
      breakSoundRef.current = null;
      blockSoundRef.current = null;
      releaseObjectUrls();
    };
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    moveCountRef.current = moveCount;
  }, [moveCount]);

  useEffect(() => {
    undoCountRef.current = undoCount;
  }, [undoCount]);

  const getElapsedNow = useCallback(() => {
    if (startedAtMsRef.current === null) return elapsedBaseRef.current;
    return elapsedBaseRef.current + performance.now() - startedAtMsRef.current;
  }, []);

  const startClock = useCallback(() => {
    startedAtMsRef.current = performance.now();
  }, []);

  const resetClock = useCallback(() => {
    elapsedBaseRef.current = 0;
    startedAtMsRef.current = null;
    setElapsedMs(0);
  }, []);

  const pauseGame = useCallback(() => {
    elapsedBaseRef.current = getElapsedNow();
    startedAtMsRef.current = null;
    setElapsedMs(elapsedBaseRef.current);
    setPhase("paused");
  }, [getElapsedNow]);

  const resumeGame = useCallback(() => {
    if (phase !== "paused") return;
    startClock();
    setPhase("playing");
  }, [phase, startClock]);

  const playSoundEffect = useCallback((sound: HTMLAudioElement | null) => {
    if (!sound) return;

    const instance = sound.cloneNode(true) as HTMLAudioElement;
    instance.volume = sound.volume;
    instance.playbackRate = sound.playbackRate;
    instance.play().catch(() => {});
  }, []);

  const finishPuzzle = useCallback(
    (puzzle: PhaseDualPuzzle, moves: number, undos: number) => {
      const finalTime = getElapsedNow();
      elapsedBaseRef.current = finalTime;
      startedAtMsRef.current = null;
      setElapsedMs(finalTime);
      const breakdown = calcPhaseDualScore(puzzle.par, moves, finalTime);
      const nextResult = { breakdown, moves, timeMs: finalTime, undos };
      setResult(nextResult);
      setPhase("completed");

      writePhaseDualBest(puzzle.id, {
        score: breakdown.total,
        moves,
        timeMs: finalTime,
        undos,
        solvedAt: new Date().toISOString(),
      });
      setBests(readPhaseDualBestMap());

      if (mode === "campaign") {
        const index = CAMPAIGN_PUZZLES.findIndex((item) => item.id === puzzle.id);
        const nextPuzzle = CAMPAIGN_PUZZLES[index + 1];
        const nextProgress = {
          unlockedIds: Array.from(new Set([...progress.unlockedIds, puzzle.id, nextPuzzle?.id].filter(Boolean) as string[])),
          clearedIds: Array.from(new Set([...progress.clearedIds, puzzle.id])),
        };
        setProgress(nextProgress);
        writePhaseDualProgress(nextProgress);
      }
    },
    [getElapsedNow, mode, progress],
  );

  const startSession = useCallback(
    (puzzle: PhaseDualPuzzle) => {
      setSession(buildSession(puzzle));
      setSelected(null);
      setMoveCount(0);
      setUndoCount(0);
      setHistory([]);
      setAnimState(null);
      setShake({ active: false, ms: 0 });
      setResult(null);
      setSubmitMessage(null);
      resetClock();

      if (!seenRules.has(puzzle.linkRule)) {
        setTutorialRule(puzzle.linkRule);
        setPhase("tutorial");
      } else {
        setTutorialRule(null);
        setPhase("ready");
      }
    },
    [resetClock, seenRules],
  );

  const beginGame = useCallback(() => {
    if (phase !== "ready") return;
    startClock();
    setPhase("playing");
  }, [phase, startClock]);

  useEffect(() => {
    if (!currentPuzzle) return;
    startSession(currentPuzzle);
  }, [currentPuzzle, startSession]);

  useEffect(() => {
    if (mode !== "daily" || !dailyKey) return;
    const dailyPuzzle = getDailyPuzzleByDate(new Date(`${dailyKey}T00:00:00.000Z`));
    setCurrentPuzzleId(dailyPuzzle.id);
    setHasSubmitted(readPhaseDualDailySubmitted(dailyKey));
  }, [mode, dailyKey]);

  useEffect(() => {
    if (mode !== "daily" || !dailyKey) return;
    let cancelled = false;
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    fetch(`/api/phase-dual/scores?date=${dailyKey}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setLeaderboard(Array.isArray(data?.scores) ? data.scores : []);
      })
      .catch(() => {
        if (cancelled) return;
        setLeaderboardError("리더보드를 불러오지 못했습니다.");
        setLeaderboard([]);
      })
      .finally(() => {
        if (!cancelled) setLeaderboardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, dailyKey]);

  useEffect(() => {
    if (phase !== "playing" && phase !== "animating") return;
    const interval = window.setInterval(() => {
      setElapsedMs(getElapsedNow());
    }, 250);
    return () => window.clearInterval(interval);
  }, [getElapsedNow, phase]);

  useEffect(() => {
    if (!animState || !currentPuzzle) return;
    const timeout = window.setTimeout(() => {
      setAnimState(null);
      const latestSession = sessionRef.current;
      if (latestSession && checkClear(latestSession)) {
        finishPuzzle(currentPuzzle, moveCountRef.current, undoCountRef.current);
      } else {
        setPhase("playing");
      }
    }, Math.max(0, animState.durationMs));
    return () => window.clearTimeout(timeout);
  }, [animState, currentPuzzle, finishPuzzle]);

  const dismissTutorial = useCallback(() => {
    if (!tutorialRule) return;
    writePhaseDualSeenRule(tutorialRule);
    setSeenRules((prev) => {
      const next = new Set(prev);
      next.add(tutorialRule);
      return next;
    });
    setTutorialRule(null);
    startClock();
    setPhase("playing");
  }, [startClock, tutorialRule]);

  const restartCurrentPuzzle = useCallback(() => {
    if (!currentPuzzle) return;
    if (mode === "daily" && phase !== "completed" && !window.confirm("오늘의 데일리 퍼즐을 다시 시작할까요?")) {
      return;
    }
    startSession(currentPuzzle);
  }, [currentPuzzle, mode, phase, startSession]);

  const tryMove = useCallback(
    (color: PhaseDualPieceColor, direction: PhaseDualDirection) => {
      if (!session || !currentPuzzle || phase !== "playing") return;
      const start = session.posA[color];
      if (!start) return;

      const destA = calcSlide(session.gridA, start, direction, currentPuzzle.gridSize);
      if (destA.row === start.row && destA.col === start.col) {
        playSoundEffect(blockSoundRef.current);
        setShake({ active: true, ms: performance.now() });
        return;
      }

      setHistory((prev) => {
        const next = [...prev, { posA: clonePositions(session.posA), posB: clonePositions(session.posB) }];
        if (next.length > UNDO_LIMIT) next.shift();
        return next;
      });

      const nextSession = cloneSession(session);
      const result = executeMove(nextSession, color, direction);
      if (!result.valid || !result.fromA || !result.toA) {
        playSoundEffect(blockSoundRef.current);
        return;
      }

      const nextMoves = moveCountRef.current + 1;
      moveCountRef.current = nextMoves;
      setMoveCount(nextMoves);
      setSession(nextSession);
      setAnimState({
        startMs: performance.now(),
        durationMs: prefersReducedMotion() ? 0 : PHASE_DUAL_ANIM_MS,
        color,
        fromA: result.fromA,
        toA: result.toA,
        fromB: result.fromB,
        toB: result.toB,
      });
      playSoundEffect(isPieceSolved(nextSession, currentPuzzle, color) ? breakSoundRef.current : dropSoundRef.current);
      setPhase("animating");
    },
    [currentPuzzle, phase, playSoundEffect, session],
  );

  const undo = useCallback(() => {
    if (!currentPuzzle || !session || history.length === 0 || phase !== "playing") return;
    const last = history[history.length - 1];
    const fresh = buildSession(currentPuzzle);

    for (const color of fresh.colors) {
      const pa = last.posA[color];
      const pb = last.posB[color];
      const oldA = fresh.posA[color];
      const oldB = fresh.posB[color];
      if (oldA) fresh.gridA[oldA.row][oldA.col].pieceColor = null;
      if (oldB) fresh.gridB[oldB.row][oldB.col].pieceColor = null;
      if (pa) {
        fresh.gridA[pa.row][pa.col].pieceColor = color;
        fresh.posA[color] = { row: pa.row, col: pa.col };
      }
      if (pb) {
        fresh.gridB[pb.row][pb.col].pieceColor = color;
        fresh.posB[color] = { row: pb.row, col: pb.col };
      }
    }

    undoCountRef.current += 1;
    setUndoCount(undoCountRef.current);
    setHistory((prev) => prev.slice(0, -1));
    setSession(fresh);
  }, [currentPuzzle, history, phase, session]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isFormTarget(event.target)) return;
      const key = event.key;
      const lower = key.toLowerCase();

      if (phase === "tutorial") {
        if (key === "Enter" || key === " ") {
          event.preventDefault();
          dismissTutorial();
        }
        return;
      }

      if (phase === "ready") {
        if (key === "Enter" || key === " ") {
          event.preventDefault();
          beginGame();
        }
        return;
      }

      if (lower === "p" || key === "Escape") {
        event.preventDefault();
        if (phase === "paused") resumeGame();
        else if (phase === "playing") pauseGame();
        return;
      }

      if (phase !== "playing") return;

      if (lower === "z" || (event.ctrlKey && lower === "z")) {
        event.preventDefault();
        undo();
        return;
      }

      if (lower === "r") {
        event.preventDefault();
        restartCurrentPuzzle();
        return;
      }

      if (key === "Tab") {
        event.preventDefault();
        if (!session) return;
        const colors = session.colors;
        if (!selected) setSelected(colors[0] ?? null);
        else setSelected(colors[(colors.indexOf(selected) + 1) % colors.length]);
        return;
      }

      if (COLOR_KEYBINDS[key] !== undefined && session) {
        setSelected(session.colors[COLOR_KEYBINDS[key]] ?? null);
        return;
      }

      let direction: PhaseDualDirection | null = null;
      if (key === "ArrowUp" || lower === "w") direction = "up";
      if (key === "ArrowDown" || lower === "s") direction = "down";
      if (key === "ArrowLeft" || lower === "a") direction = "left";
      if (key === "ArrowRight" || lower === "d") direction = "right";
      if (direction && selected) {
        event.preventDefault();
        tryMove(selected, direction);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [beginGame, dismissTutorial, pauseGame, phase, restartCurrentPuzzle, resumeGame, selected, session, tryMove, undo]);

  const onTierClick = (nextTier: 1 | 2 | 3 | 4 | 5) => {
    setTier(nextTier);
    const firstUnlocked = CAMPAIGN_PUZZLES.find(
      (puzzle) => puzzle.tier === nextTier && progress.unlockedIds.includes(puzzle.id),
    );
    if (firstUnlocked) setCurrentPuzzleId(firstUnlocked.id);
  };

  const onPlayerNameChange = (value: string) => {
    const nextName = normalizePhaseDualPlayerName(value);
    setPlayerName(nextName);
    writePhaseDualPlayerName(nextName);
  };

  const submitDaily = async () => {
    if (!currentPuzzle || !result || !dailyKey) return;
    setSubmitMessage(null);
    try {
      const response = await fetch("/api/phase-dual/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName,
          dailyKey,
          puzzleId: currentPuzzle.id,
          score: result.breakdown.total,
          moves: result.moves,
          timeMs: result.timeMs,
          undos: result.undos,
        }),
      });
      const data = await response.json();
      if (response.status === 409) {
        setSubmitMessage("오늘은 이미 제출한 닉네임입니다.");
        setHasSubmitted(true);
        return;
      }
      if (!response.ok) {
        setSubmitMessage(data?.error ?? "기록을 저장하지 못했습니다.");
        return;
      }
      setHasSubmitted(true);
      setSubmitMessage(data?.saved ? "기록이 저장되었습니다." : "로컬 폴백 모드로 기록했습니다.");
      writePhaseDualDailySubmitted(dailyKey, {
        puzzleId: currentPuzzle.id,
        score: result.breakdown.total,
        moves: result.moves,
        timeMs: result.timeMs,
      });

      const refreshed = await fetch(`/api/phase-dual/scores?date=${dailyKey}`);
      const leaderboardData = await refreshed.json();
      setLeaderboard(Array.isArray(leaderboardData?.scores) ? leaderboardData.scores : []);
    } catch {
      setSubmitMessage("네트워크 오류가 발생했습니다.");
    }
  };

  if (assetLoadState !== "ready") {
    return <PhaseDualLoadingScreen status={assetLoadState} error={assetLoadError} />;
  }

  return (
    <main className="phase-dual-page">
      <header className="phase-dual-intro">
        <div className="phase-dual-intro-copy">
          <h1>Phase Dual</h1>
          <p>두 격자, 하나의 해답. 움직임이 반사되고 회전하는 슬라이딩 퍼즐입니다.</p>
        </div>
        <div className="phase-dual-mode-tabs" role="tablist" aria-label="모드 선택">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "campaign"}
            className={`phase-dual-mode-tab${mode === "campaign" ? " is-active" : ""}`}
            onClick={() => setMode("campaign")}
          >
            <span>Campaign</span>
            <small>30 puzzles</small>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "daily"}
            className={`phase-dual-mode-tab${mode === "daily" ? " is-active" : ""}`}
            onClick={() => setMode("daily")}
          >
            <span>Daily</span>
            <small>Leaderboard</small>
          </button>
        </div>
      </header>

      {mode === "campaign" ? (
        <>
          <div className="phase-dual-tier-tabs" role="tablist" aria-label="티어 선택">
            {[1, 2, 3, 4, 5].map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tier === item}
                className={`phase-dual-tier-tab${tier === item ? " is-active" : ""}`}
                onClick={() => onTierClick(item as 1 | 2 | 3 | 4 | 5)}
              >
                <span>T{item}</span>
                <small>{tierName(item as 1 | 2 | 3 | 4 | 5)}</small>
              </button>
            ))}
          </div>
          <div className="phase-dual-puzzle-chips">
            {tierPuzzles.map((puzzle) => {
              const locked = !progress.unlockedIds.includes(puzzle.id);
              const cleared = progress.clearedIds.includes(puzzle.id);
              return (
                <button
                  key={puzzle.id}
                  type="button"
                  className={`phase-dual-puzzle-chip${puzzle.id === currentPuzzleId ? " is-active" : ""}${locked ? " is-locked" : ""}${cleared ? " is-cleared" : ""}`}
                  onClick={() => !locked && setCurrentPuzzleId(puzzle.id)}
                  disabled={locked}
                >
                  <span>{puzzle.id.split("-")[1]}</span>
                  <strong>{puzzle.title}</strong>
                  <small>{cleared ? "clear" : locked ? "locked" : ruleEnglishLabel(puzzle.linkRule)}</small>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="phase-dual-daily-banner">
          <div>
            <strong>{dailyKey}</strong>
            <span>{currentPuzzle ? `${currentPuzzle.title} · ${ruleEnglishLabel(currentPuzzle.linkRule)}` : ""}</span>
          </div>
          <button type="button" className="phase-dual-button" onClick={restartCurrentPuzzle}>
            Restart
          </button>
        </div>
      )}

      <div className="phase-dual-layout">
        <section className="phase-dual-play-panel">
          {currentPuzzle ? (
            <>
              <div className="phase-dual-hud">
                <PhaseDualStat label="Rule" value={ruleLabel(currentPuzzle.linkRule)} />
                <PhaseDualStat label="Par" value={currentPuzzle.par} />
                <PhaseDualStat label="Move" value={moveCount} />
                <PhaseDualStat label="Time" value={formatPhaseDualTime(elapsedMs)} />
                <PhaseDualStat label="Undo" value={undoCount} />
              </div>

              <PhaseDualBoard
                session={session}
                selected={selected}
                animState={animState}
                shake={shake}
                disabled={phase !== "playing"}
                onSelectColor={setSelected}
              >
                <RuleBadge rule={currentPuzzle.linkRule} />

                {phase === "ready" ? (
                  <div className="phase-dual-overlay" role="dialog" aria-label="Start puzzle">
                    <div className="phase-dual-overlay-card phase-dual-start-card">
                      <span className="phase-dual-ready-kicker">{mode === "campaign" ? "Campaign" : "Daily"}</span>
                      <h3>{currentPuzzle.title}</h3>
                      <p>
                        {ruleEnglishLabel(currentPuzzle.linkRule)} / Par {currentPuzzle.par}
                      </p>
                      <button type="button" className="phase-dual-button is-primary" onClick={beginGame} autoFocus>
                        Start
                      </button>
                    </div>
                  </div>
                ) : null}

                {phase === "paused" ? (
                  <div className="phase-dual-overlay" role="dialog" aria-label="일시정지">
                    <div className="phase-dual-overlay-card">
                      <h3>Paused</h3>
                      <div className="phase-dual-overlay-actions">
                        <button type="button" className="phase-dual-button is-primary" onClick={resumeGame}>
                          Resume
                        </button>
                        <button type="button" className="phase-dual-button" onClick={restartCurrentPuzzle}>
                          Restart
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {phase === "completed" && result ? (
                  <div className="phase-dual-overlay" role="dialog" aria-label="클리어">
                    <div className="phase-dual-overlay-card phase-dual-overlay-card--success">
                      <h3>Puzzle Clear</h3>
                      <div className="phase-dual-score-rows">
                        <div><span>Base</span><strong>{result.breakdown.base}</strong></div>
                        <div><span>Par Bonus</span><strong>+{result.breakdown.parBonus}</strong></div>
                        <div><span>Time Bonus</span><strong>+{result.breakdown.timeBonus}</strong></div>
                        <div className="phase-dual-score-total"><span>Total</span><strong>{result.breakdown.total}</strong></div>
                      </div>
                      <p className="phase-dual-score-meta">
                        {result.moves} moves · {formatPhaseDualTime(result.timeMs)} · {result.undos} undo
                      </p>
                      <div className="phase-dual-overlay-actions">
                        {mode === "campaign" ? (
                          <>
                            <button type="button" className="phase-dual-button" onClick={restartCurrentPuzzle}>
                              Replay
                            </button>
                            {CAMPAIGN_PUZZLES[CAMPAIGN_PUZZLES.findIndex((p) => p.id === currentPuzzle.id) + 1] ? (
                              <button
                                type="button"
                                className="phase-dual-button is-primary"
                                onClick={() => {
                                  const next = CAMPAIGN_PUZZLES[CAMPAIGN_PUZZLES.findIndex((p) => p.id === currentPuzzle.id) + 1];
                                  if (next) setCurrentPuzzleId(next.id);
                                }}
                              >
                                Next
                              </button>
                            ) : (
                              <strong className="phase-dual-finale">Campaign Complete</strong>
                            )}
                          </>
                        ) : (
                          <>
                            <input
                              className="phase-dual-input"
                              value={playerName}
                              onChange={(event) => onPlayerNameChange(event.target.value)}
                              maxLength={18}
                              aria-label="닉네임"
                            />
                            <button
                              type="button"
                              className="phase-dual-button is-primary"
                              onClick={submitDaily}
                              disabled={hasSubmitted}
                            >
                              {hasSubmitted ? "Submitted" : "Submit"}
                            </button>
                          </>
                        )}
                      </div>
                      {submitMessage ? <p className="phase-dual-submit-msg">{submitMessage}</p> : null}
                    </div>
                  </div>
                ) : null}

                {phase === "tutorial" && tutorialRule ? (
                  <div className="phase-dual-overlay" role="dialog" aria-label="규칙 안내">
                    <div className="phase-dual-overlay-card phase-dual-tutorial">
                      <RuleMiniSimulation rule={tutorialRule} />
                      <h3>
                        {ruleLabel(tutorialRule)} <span>{ruleEnglishLabel(tutorialRule)}</span>
                      </h3>
                      <p>{ruleExplanation(tutorialRule)}</p>
                      <table className="phase-dual-rule-table">
                        <tbody>
                          {PHASE_DUAL_DIRECTIONS.map((direction) => (
                            <tr key={direction}>
                              <td>{dirSymbol(direction)}</td>
                              <td>{dirSymbol(applyLinkRule(direction, tutorialRule))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button type="button" className="phase-dual-button is-primary" onClick={dismissTutorial} autoFocus>
                        Start
                      </button>
                    </div>
                  </div>
                ) : null}
              </PhaseDualBoard>

              <div className="phase-dual-controls">
                <div className="phase-dual-dpad" aria-label="이동 방향">
                  {([
                    ["up", "↑", "phase-dual-dpad-up"],
                    ["left", "←", "phase-dual-dpad-left"],
                    ["right", "→", "phase-dual-dpad-right"],
                    ["down", "↓", "phase-dual-dpad-down"],
                  ] as const).map(([direction, label, className]) => (
                    <button
                      key={direction}
                      type="button"
                      className={`phase-dual-dpad-button ${className}`}
                      onClick={() => selected && tryMove(selected, direction)}
                      disabled={!selected || phase !== "playing"}
                      aria-label={label}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="phase-dual-action-buttons">
                  <button type="button" className="phase-dual-button" onClick={undo} disabled={history.length === 0 || phase !== "playing"}>
                    Undo
                  </button>
                  <button type="button" className="phase-dual-button" onClick={restartCurrentPuzzle}>
                    Restart
                  </button>
                  <button
                    type="button"
                    className="phase-dual-button"
                    onClick={() => (phase === "ready" ? beginGame() : phase === "paused" ? resumeGame() : phase === "playing" ? pauseGame() : undefined)}
                    disabled={phase !== "ready" && phase !== "paused" && phase !== "playing"}
                  >
                    {phase === "ready" ? "Start" : phase === "paused" ? "Resume" : "Pause"}
                  </button>
                </div>
                <div className="phase-dual-piece-picker">
                  {session?.colors.map((color, index) => (
                    <button
                      key={color}
                      type="button"
                      className={`phase-dual-piece-chip${selected === color ? " is-active" : ""}`}
                      style={{ ["--piece-color" as string]: PHASE_DUAL_COLOR_FILL[color] }}
                      onClick={() => setSelected(color)}
                      aria-label={`${color} piece`}
                    >
                      <span className="phase-dual-piece-dot" />
                      <span>{index + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="phase-dual-empty">Puzzle not found.</div>
          )}
        </section>

        <aside className="phase-dual-side-panel">
          <section className="phase-dual-side-section">
            <h2>Best</h2>
            {mode === "campaign" ? (
              <p className="phase-dual-side-note">이 브라우저에 저장되는 내 기록입니다.</p>
            ) : null}
            {localBest ? (
              <div className="phase-dual-best">
                <div><span>Score</span><strong>{localBest.score}</strong></div>
                <div><span>Move</span><strong>{localBest.moves}</strong></div>
                <div><span>Time</span><strong>{formatPhaseDualTime(localBest.timeMs)}</strong></div>
              </div>
            ) : (
              <p className="phase-dual-side-empty">No clear yet.</p>
            )}
          </section>

          {mode === "daily" ? (
            <>
              <section className="phase-dual-side-section">
                <h2>Submit Score</h2>
                <div className="phase-dual-submit-panel">
                  <input
                    className="phase-dual-input"
                    value={playerName}
                    onChange={(event) => onPlayerNameChange(event.target.value)}
                    maxLength={18}
                    aria-label="데일리 제출 닉네임"
                    placeholder="Nickname"
                  />
                  <button
                    type="button"
                    className="phase-dual-button is-primary"
                    onClick={submitDaily}
                    disabled={!result || phase !== "completed" || hasSubmitted}
                  >
                    {hasSubmitted ? "Submitted" : "Submit"}
                  </button>
                </div>
                <p className="phase-dual-side-empty">
                  {result
                    ? `${result.breakdown.total} points · ${result.moves} moves · ${formatPhaseDualTime(result.timeMs)}`
                    : "Daily puzzle clear 후 리더보드에 제출할 수 있습니다."}
                </p>
                {submitMessage ? <p className="phase-dual-submit-msg">{submitMessage}</p> : null}
              </section>

              <section className="phase-dual-side-section">
                <h2>Leaderboard</h2>
                <div className="phase-dual-leaderboard-meta">{dailyKey}</div>
                {leaderboardLoading ? (
                  <p className="phase-dual-side-empty">Loading...</p>
                ) : leaderboardError ? (
                  <p className="phase-dual-side-empty">{leaderboardError}</p>
                ) : leaderboard.length === 0 ? (
                  <p className="phase-dual-side-empty">No records yet.</p>
                ) : (
                  <ol className="phase-dual-leaderboard">
                    {leaderboard.slice(0, 10).map((row, index) => (
                      <li key={row.id}>
                        <span className="phase-dual-rank">{index + 1}</span>
                        <span className="phase-dual-lb-name">{row.player_name}</span>
                        <span className="phase-dual-lb-score">{row.score}</span>
                        <span className="phase-dual-lb-meta">
                          {row.moves} moves · {formatPhaseDualTime(row.time_ms)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          ) : null}

          <section className="phase-dual-side-section">
            <h2>Puzzle</h2>
            <div className="phase-dual-puzzle-summary">
              <strong>{currentPuzzle?.title ?? "Unknown"}</strong>
              <span>{currentPuzzle ? `${currentPuzzle.gridSize}x${currentPuzzle.gridSize} · ${ruleEnglishLabel(currentPuzzle.linkRule)}` : ""}</span>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
