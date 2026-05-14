"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getLinesPerMinute,
  getPiecesPerSecond,
  getPlayTimeSeconds,
  isFinished,
  isPaused,
  type Engine,
  type GameState,
  type RotationDirection,
} from "tetris-toolkit";

import type { TetrisMode, TetrisScore } from "@/types";
import { Board } from "./_components/tetris-board";
import { MiniPiece } from "./_components/tetris-mini-piece";
import { TetrisLoadingScreen } from "./_components/tetris-loading-screen";
import { TetrisModeIcon } from "./_components/tetris-mode-icon";
import { Stat } from "./_components/tetris-stat";
import type { AssetLoadState, AudioAssetKey, LocalBest, SessionInfo } from "./_types";
import { TETRIS_AUDIO_ASSETS } from "./_lib/audio-assets";
import { getFilledRowCount } from "./_lib/board-rendering";
import {
  getDisplayTime,
  getFinishTitle,
  getPhaseLabel,
  getPrimaryRankValue,
} from "./_lib/clear-scoring";
import { createPreparedEngine, INITIAL_STATE, startPreparedEngine } from "./_lib/engine";
import { formatNumber, formatTime, normalizePlayerName } from "./_lib/format";
import { MODES, getModeConfig } from "./_lib/modes";
import {
  DEFAULT_PLAYER_NAME,
  MUSIC_ENABLED_KEY,
  PLAYER_NAME_KEY,
  getBestStorageKey,
  isBetterBest,
  readLocalBest,
} from "./_lib/storage";

function isFormTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, button"));
}

export function TetrisClient() {
  const [mode, setMode] = useState<TetrisMode>("marathon");
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [session, setSession] = useState<SessionInfo>({ seed: 0, dailyKey: null, startedAt: 0 });
  const [scores, setScores] = useState<TetrisScore[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [playerName, setPlayerName] = useState(DEFAULT_PLAYER_NAME);
  const [saveStatus, setSaveStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [personalBest, setPersonalBest] = useState<LocalBest | null>(null);
  const [assetLoadState, setAssetLoadState] = useState<AssetLoadState>("loading");
  const [assetLoadError, setAssetLoadError] = useState("");
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const engineRef = useRef<Engine | null>(null);
  const stateRef = useRef<GameState>(INITIAL_STATE);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const bestUpdatedForSessionRef = useRef(0);
  const musicEnabledRef = useRef(true);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const dropSoundRef = useRef<HTMLAudioElement | null>(null);
  const breakSoundRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlsRef = useRef<string[]>([]);
  const engineAudioUnsubscribeRef = useRef<Array<() => void>>([]);

  const config = getModeConfig(mode);
  const finished = isFinished(state);
  const hasStarted = session.startedAt > 0;
  const displayedTimeMs = getDisplayTime(state);
  const elapsedSeconds = getPlayTimeSeconds(state);
  const piecesPerSecond = getPiecesPerSecond(state);
  const linesPerMinute = getLinesPerMinute(state);
  const ultraRemainingMs =
    mode === "ultra" && state.durationMs !== null ? Math.max(0, state.durationMs - state.elapsedMs) : null;

  const playMusic = useCallback(
    (restart = false) => {
      const music = musicRef.current;
      if (!music || assetLoadState !== "ready" || !musicEnabledRef.current) return;

      if (restart) {
        music.currentTime = 0;
      }

      music.loop = true;
      music.play().catch(() => {
        setAssetLoadError("브라우저에서 음악 재생을 시작하지 못했습니다. 다시 Start를 눌러주세요.");
      });
    },
    [assetLoadState],
  );

  const pauseMusic = useCallback(() => {
    musicRef.current?.pause();
  }, []);

  const stopMusic = useCallback(() => {
    const music = musicRef.current;
    if (!music) return;

    music.pause();
    music.currentTime = 0;
  }, []);

  const playSoundEffect = useCallback((sound: HTMLAudioElement | null) => {
    if (!sound) return;

    const instance = sound.cloneNode(true) as HTMLAudioElement;
    instance.volume = sound.volume;
    instance.playbackRate = sound.playbackRate;
    instance.play().catch(() => {});
  }, []);

  const detachEngineAudio = useCallback(() => {
    engineAudioUnsubscribeRef.current.forEach((unsubscribe) => unsubscribe());
    engineAudioUnsubscribeRef.current = [];
  }, []);

  const attachEngineAudio = useCallback(
    (engine: Engine) => {
      detachEngineAudio();

      const unsubscribePieceLock = engine.on("pieceLock", ({ board }) => {
        const sound = getFilledRowCount(board) > 0 ? breakSoundRef.current : dropSoundRef.current;
        playSoundEffect(sound);
      });

      engineAudioUnsubscribeRef.current = [unsubscribePieceLock];
    },
    [detachEngineAudio, playSoundEffect],
  );

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
      const loadedAssets = new Map<AudioAssetKey, HTMLAudioElement>();

      try {
        for (const asset of TETRIS_AUDIO_ASSETS) {
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
          audio.loop = Boolean(asset.loop);
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
        musicRef.current = loadedAssets.get("music") ?? null;
        dropSoundRef.current = loadedAssets.get("drop") ?? null;
        breakSoundRef.current = loadedAssets.get("lineBreak") ?? null;

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
      musicRef.current?.pause();
      musicRef.current = null;
      dropSoundRef.current = null;
      breakSoundRef.current = null;
      releaseObjectUrls();
    };
  }, []);

  const prepareNewGame = useCallback((nextMode: TetrisMode) => {
    pressedKeysRef.current.clear();
    detachEngineAudio();
    engineRef.current?.destroy();
    stopMusic();

    const next = createPreparedEngine(nextMode);
    engineRef.current = next.engine;
    attachEngineAudio(next.engine);
    stateRef.current = next.engine.getSnapshot();
    bestUpdatedForSessionRef.current = 0;

    setSession(next.session);
    setState(next.engine.getSnapshot());
    setHasSubmitted(false);
    setSaveStatus("");
  }, [attachEngineAudio, detachEngineAudio, stopMusic]);

  const startCurrentGame = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    pressedKeysRef.current.clear();
    const startedSession = startPreparedEngine(engine, mode, session);
    stateRef.current = engine.getSnapshot();

    setSession(startedSession);
    setState(engine.getSnapshot());
    setHasSubmitted(false);
    setSaveStatus("");
    playMusic(true);
  }, [mode, playMusic, session]);

  const startNewGame = useCallback((nextMode: TetrisMode) => {
    pressedKeysRef.current.clear();
    detachEngineAudio();
    engineRef.current?.destroy();

    const next = createPreparedEngine(nextMode);
    const startedSession = startPreparedEngine(next.engine, nextMode, next.session);
    engineRef.current = next.engine;
    attachEngineAudio(next.engine);
    stateRef.current = next.engine.getSnapshot();
    bestUpdatedForSessionRef.current = 0;

    setSession(startedSession);
    setState(next.engine.getSnapshot());
    setHasSubmitted(false);
    setSaveStatus("");
    playMusic(true);
  }, [attachEngineAudio, detachEngineAudio, playMusic]);

  const loadScores = useCallback(async (targetMode: TetrisMode, dailyKey: string | null) => {
    setIsLoadingScores(true);
    setLeaderboardError("");

    try {
      const params = new URLSearchParams({ mode: targetMode });
      if (targetMode === "daily" && dailyKey) {
        params.set("dailyKey", dailyKey);
      }

      const response = await fetch(`/api/tetris/scores?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as { scores?: TetrisScore[]; error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "리더보드를 불러오지 못했습니다.");
      }

      setScores(data.scores ?? []);
    } catch (error) {
      setScores([]);
      setLeaderboardError(error instanceof Error ? error.message : "리더보드를 불러오지 못했습니다.");
    } finally {
      setIsLoadingScores(false);
    }
  }, []);

  useEffect(() => {
    const savedName = normalizePlayerName(window.localStorage.getItem(PLAYER_NAME_KEY) ?? "");
    if (savedName) {
      setPlayerName(savedName);
      window.localStorage.setItem(PLAYER_NAME_KEY, savedName);
    } else {
      setPlayerName(DEFAULT_PLAYER_NAME);
      window.localStorage.removeItem(PLAYER_NAME_KEY);
    }

    const savedMusicEnabled = window.localStorage.getItem(MUSIC_ENABLED_KEY) !== "off";
    musicEnabledRef.current = savedMusicEnabled;
    setIsMusicEnabled(savedMusicEnabled);
  }, []);

  useEffect(() => {
    prepareNewGame(mode);

    return () => {
      detachEngineAudio();
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [detachEngineAudio, mode, prepareNewGame]);

  useEffect(() => {
    let frameId = 0;
    let previous = performance.now();

    const frame = (now: number) => {
      const engine = engineRef.current;
      const delta = Math.min(64, now - previous);
      previous = now;

      if (engine) {
        engine.tick(delta);
        const nextState = engine.getSnapshot();
        stateRef.current = nextState;
        setState(nextState);
      }

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    loadScores(mode, session.dailyKey);
    setPersonalBest(readLocalBest(mode, session.dailyKey));
  }, [loadScores, mode, session.dailyKey]);

  useEffect(() => {
    if (!finished || bestUpdatedForSessionRef.current === session.startedAt) return;

    const candidate: LocalBest = {
      score: state.score,
      timeMs: displayedTimeMs,
      lines: state.lines,
      createdAt: new Date().toISOString(),
    };

    const previous = readLocalBest(mode, session.dailyKey);
    if (isBetterBest(mode, candidate, previous)) {
      window.localStorage.setItem(getBestStorageKey(mode, session.dailyKey), JSON.stringify(candidate));
      setPersonalBest(candidate);
    } else {
      setPersonalBest(previous);
    }

    bestUpdatedForSessionRef.current = session.startedAt;
  }, [displayedTimeMs, finished, mode, session.dailyKey, session.startedAt, state.lines, state.score]);

  useEffect(() => {
    if (finished) {
      stopMusic();
    }
  }, [finished, stopMusic]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFormTarget(event.target)) return;

      const engine = engineRef.current;
      if (!engine) return;

      const code = event.code;
      const holdable = code === "ArrowLeft" || code === "ArrowRight" || code === "ArrowDown";
      const handledCodes = new Set([
        "ArrowLeft",
        "ArrowRight",
        "ArrowDown",
        "ArrowUp",
        "Space",
        "KeyZ",
        "KeyX",
        "KeyC",
        "ShiftLeft",
        "ShiftRight",
        "KeyP",
        "KeyR",
      ]);

      if (!handledCodes.has(code)) return;
      event.preventDefault();

      if (stateRef.current.phase.kind === "menu") return;

      if (holdable) {
        if (pressedKeysRef.current.has(code)) return;
        pressedKeysRef.current.add(code);
      } else if (event.repeat) {
        return;
      }

      if (code === "ArrowLeft") engine.moveLeft();
      if (code === "ArrowRight") engine.moveRight();
      if (code === "ArrowDown") engine.softDrop();
      if (code === "ArrowUp" || code === "KeyX") engine.rotate("cw");
      if (code === "KeyZ") engine.rotate("ccw");
      if (code === "KeyC" || code === "ShiftLeft" || code === "ShiftRight") engine.hold();
      if (code === "Space") engine.hardDrop();
      if (code === "KeyP") {
        if (isPaused(stateRef.current)) {
          engine.resume();
          playMusic();
        } else {
          engine.pause();
          pauseMusic();
        }
      }
      if (code === "KeyR") startNewGame(mode);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (event.code === "ArrowLeft") {
        pressedKeysRef.current.delete(event.code);
        engine.releaseMoveLeft();
      }
      if (event.code === "ArrowRight") {
        pressedKeysRef.current.delete(event.code);
        engine.releaseMoveRight();
      }
      if (event.code === "ArrowDown") {
        pressedKeysRef.current.delete(event.code);
        engine.releaseSoftDrop();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [mode, pauseMusic, playMusic, startNewGame]);

  const handleModeSelect = (nextMode: TetrisMode) => {
    if (nextMode === mode) {
      prepareNewGame(nextMode);
      return;
    }

    setMode(nextMode);
  };

  const toggleMusic = useCallback(() => {
    setIsMusicEnabled((current) => {
      const next = !current;
      musicEnabledRef.current = next;
      window.localStorage.setItem(MUSIC_ENABLED_KEY, next ? "on" : "off");

      if (!next) {
        pauseMusic();
      } else if (session.startedAt > 0 && !isFinished(stateRef.current) && !isPaused(stateRef.current)) {
        playMusic();
      }

      return next;
    });
  }, [pauseMusic, playMusic, session.startedAt]);

  const togglePause = () => {
    const engine = engineRef.current;
    if (!engine || !hasStarted || finished) return;

    if (isPaused(stateRef.current)) {
      engine.resume();
      playMusic();
    } else {
      engine.pause();
      pauseMusic();
    }
  };

  const pressControl = (action: "left" | "right" | "down") => {
    const engine = engineRef.current;
    if (!engine || !hasStarted || finished) return;
    if (action === "left") engine.moveLeft();
    if (action === "right") engine.moveRight();
    if (action === "down") engine.softDrop();
  };

  const releaseControl = (action: "left" | "right" | "down") => {
    const engine = engineRef.current;
    if (!engine || !hasStarted) return;
    if (action === "left") engine.releaseMoveLeft();
    if (action === "right") engine.releaseMoveRight();
    if (action === "down") engine.releaseSoftDrop();
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, action: "left" | "right" | "down") => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pressControl(action);
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>, action: "left" | "right" | "down") => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    releaseControl(action);
  };

  const oneShot = (action: "rotateCW" | "rotateCCW" | "rotate180" | "hardDrop" | "hold") => {
    const engine = engineRef.current;
    if (!engine || !hasStarted || finished) return;

    if (action === "rotateCW") engine.rotate("cw");
    if (action === "rotateCCW") engine.rotate("ccw");
    if (action === "rotate180") engine.rotate("180" as RotationDirection);
    if (action === "hardDrop") engine.hardDrop();
    if (action === "hold") engine.hold();
  };

  const handlePlayerNameChange = useCallback((value: string) => {
    const nextName = value.slice(0, 18);
    const cleanName = normalizePlayerName(nextName);

    setPlayerName(nextName);

    if (cleanName) {
      window.localStorage.setItem(PLAYER_NAME_KEY, cleanName);
    } else {
      window.localStorage.removeItem(PLAYER_NAME_KEY);
    }
  }, []);

  const handleSubmitScore = async () => {
    if (!finished || isSaving || hasSubmitted) return;

    const cleanName = normalizePlayerName(playerName) || DEFAULT_PLAYER_NAME;
    setIsSaving(true);
    setSaveStatus("");
    setPlayerName(cleanName);
    window.localStorage.setItem(PLAYER_NAME_KEY, cleanName);

    try {
      const response = await fetch("/api/tetris/scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerName: cleanName,
          mode,
          score: state.score,
          lines: state.lines,
          level: state.level,
          timeMs: displayedTimeMs,
          pieces: state.lockCount,
          seed: session.seed,
          dailyKey: session.dailyKey,
        }),
      });
      const data = (await response.json()) as { saved?: boolean; error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "기록 저장에 실패했습니다.");
      }

      setHasSubmitted(true);
      setSaveStatus(data.saved ? "글로벌 리더보드에 저장되었습니다." : "Supabase 환경변수가 없어 로컬 데모 모드로 처리되었습니다.");
      await loadScores(mode, session.dailyKey);
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "기록 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const nextPieces = state.queue.slice(0, 5);
  const phaseLabel = getPhaseLabel(state, mode);
  const controlsDisabled = !hasStarted || finished || isPaused(state);
  const elapsedSecondsLabel = elapsedSeconds.toFixed(1);

  if (assetLoadState !== "ready") {
    return <TetrisLoadingScreen status={assetLoadState} error={assetLoadError} />;
  }

  return (
    <>
      <section className="panel tetris-intro">
        <div className="tetris-intro-copy">
          <div className="eyebrow">utility / tetris</div>
          <h1>Tetris Arena</h1>
          <p className="muted">
            고스트 블록, Hold, SRS 회전, 콤보와 Back-to-Back 점수를 갖춘 브라우저 테트리스입니다.
          </p>
        </div>

        <div className="tetris-mode-console">
          <div className="tetris-mode-console-header">
            <span>Game mode</span>
            <strong>{config.title}</strong>
          </div>
          <div className="tetris-mode-tabs" role="tablist" aria-label="Tetris modes">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === mode ? "tetris-mode-card is-active" : "tetris-mode-card"}
                onClick={() => handleModeSelect(item.id)}
                role="tab"
                aria-selected={item.id === mode}
                aria-label={`${item.title}: ${item.subtitle}`}
                title={item.subtitle}
                style={
                  {
                    "--mode-a": item.accentA,
                    "--mode-b": item.accentB,
                  } as CSSProperties
                }
              >
                <span className="tetris-mode-aura" aria-hidden="true" />
                <TetrisModeIcon mode={item.id} />
                <span className="tetris-mode-copy">
                  <strong>{item.title}</strong>
                  <small>{item.badge}</small>
                </span>
                <span className="tetris-mode-check" aria-hidden="true" />
              </button>
            ))}
          </div>
          <p className="tetris-mode-readout">{config.subtitle}</p>
        </div>
      </section>

      <section className="tetris-layout section">
        <div className="panel tetris-play-panel">
          <div className="tetris-play-header">
            <div>
              <span className="tag neutral">{config.title}</span>
              {mode === "daily" && session.dailyKey ? <span className="tag neutral">{session.dailyKey}</span> : null}
            </div>
            <div className="tetris-play-actions">
              <label className="tetris-music-toggle">
                <input type="checkbox" checked={isMusicEnabled} onChange={toggleMusic} />
                <span aria-hidden="true" />
                <b>BGM</b>
              </label>
              {!hasStarted ? (
                <button type="button" className="button" onClick={startCurrentGame}>
                  Start
                </button>
              ) : (
                <>
                  <button type="button" className="ghost-button" onClick={togglePause} disabled={finished}>
                    {isPaused(state) ? "Resume" : "Pause"}
                  </button>
                  <button type="button" className="button" onClick={() => startNewGame(mode)}>
                    Restart
                  </button>
                </>
              )}
            </div>
          </div>

          <Board
            state={state}
            mode={mode}
            hasStarted={hasStarted}
            displayedTimeMs={displayedTimeMs}
            playerName={playerName}
            personalBest={personalBest}
            saveStatus={saveStatus}
            isSaving={isSaving}
            hasSubmitted={hasSubmitted}
            onStart={startCurrentGame}
            onPlayAgain={() => startNewGame(mode)}
            onPlayerNameChange={handlePlayerNameChange}
            onSubmitScore={handleSubmitScore}
          />

          <div className="tetris-touch-controls" aria-label="Touch controls">
            <button
              type="button"
              className="tetris-control-button"
              onPointerDown={(event) => handlePointerDown(event, "left")}
              onPointerUp={(event) => handlePointerUp(event, "left")}
              onPointerCancel={(event) => handlePointerUp(event, "left")}
              title="Move left"
              aria-label="Move left"
              disabled={controlsDisabled}
            >
              ←
            </button>
            <button
              type="button"
              className="tetris-control-button"
              onPointerDown={(event) => handlePointerDown(event, "down")}
              onPointerUp={(event) => handlePointerUp(event, "down")}
              onPointerCancel={(event) => handlePointerUp(event, "down")}
              title="Soft drop"
              aria-label="Soft drop"
              disabled={controlsDisabled}
            >
              ↓
            </button>
            <button
              type="button"
              className="tetris-control-button"
              onPointerDown={(event) => handlePointerDown(event, "right")}
              onPointerUp={(event) => handlePointerUp(event, "right")}
              onPointerCancel={(event) => handlePointerUp(event, "right")}
              title="Move right"
              aria-label="Move right"
              disabled={controlsDisabled}
            >
              →
            </button>
            <button
              type="button"
              className="tetris-control-button"
              onClick={() => oneShot("rotateCCW")}
              title="Rotate counterclockwise"
              aria-label="Rotate counterclockwise"
              disabled={controlsDisabled}
            >
              ↺
            </button>
            <button
              type="button"
              className="tetris-control-button"
              onClick={() => oneShot("rotateCW")}
              title="Rotate clockwise"
              aria-label="Rotate clockwise"
              disabled={controlsDisabled}
            >
              ↻
            </button>
            <button
              type="button"
              className="tetris-control-button"
              onClick={() => oneShot("hardDrop")}
              title="Hard drop"
              aria-label="Hard drop"
              disabled={controlsDisabled}
            >
              ⤓
            </button>
            <button
              type="button"
              className="tetris-control-button"
              onClick={() => oneShot("hold")}
              title="Hold"
              aria-label="Hold"
              disabled={controlsDisabled}
            >
              H
            </button>
          </div>
        </div>

        <aside className="tetris-side-stack">
          <section className="panel tetris-side-panel">
            <div className="tetris-status-line">
              <span className="tag neutral">{phaseLabel}</span>
              <span className="muted">Seed {session.seed || "-"}</span>
            </div>

            <div className="tetris-stats-grid">
              <Stat label="Score" value={formatNumber(state.score)} />
              <Stat label={ultraRemainingMs === null ? "Time" : "Left"} value={formatTime(ultraRemainingMs ?? displayedTimeMs)} />
              <Stat label="Lines" value={state.lines} />
              <Stat label="Level" value={state.level} />
              <Stat label="Combo" value={state.combo < 0 ? 0 : state.combo} />
              <Stat label="Pieces" value={state.lockCount} />
            </div>

            <div className="tetris-rate-row">
              <span>PPS {piecesPerSecond.toFixed(2)}</span>
              <span>LPM {linesPerMinute.toFixed(1)}</span>
              <span>{elapsedSecondsLabel}s</span>
            </div>

            <div className="tetris-preview-grid">
              <div className="tetris-preview-slot is-next">
                <span>Next</span>
                <div className="tetris-next-list">
                  {nextPieces.map((piece, index) => (
                    <MiniPiece key={`${piece}-${index}`} kind={piece} label={`Next piece ${index + 1}`} />
                  ))}
                </div>
              </div>
              <div className="tetris-preview-slot is-hold">
                <span>Hold</span>
                <MiniPiece kind={state.hold} label="Held piece" />
              </div>
            </div>
          </section>

          <section className="panel tetris-side-panel">
            <h2>Global Leaderboard</h2>
            <p className="muted">
              {mode === "sprint" ? "짧을수록 높은 순위입니다." : "점수가 높을수록 높은 순위입니다."}
            </p>

            {leaderboardError ? <div className="notice notice-error">{leaderboardError}</div> : null}
            {isLoadingScores ? <div className="loading-inline">리더보드를 불러오는 중입니다.</div> : null}

            {!isLoadingScores && scores.length === 0 ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                아직 기록이 없습니다.
              </p>
            ) : (
              <ol className="tetris-leaderboard">
                {scores.map((score, index) => (
                  <li key={score.id}>
                    <span className="tetris-rank">{index + 1}</span>
                    <div>
                      <strong>{score.player_name}</strong>
                      <span>
                        {score.lines} lines · Lv {score.level} · {formatTime(score.time_ms)}
                      </span>
                    </div>
                    <b>{getPrimaryRankValue(score, mode)}</b>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel tetris-side-panel">
            <h2>{finished ? getFinishTitle(state, mode) : "Controls"}</h2>
            {finished ? (
              <div className="tetris-submit-stack">
                <div className="tetris-finish-summary">
                  <strong>{mode === "sprint" ? formatTime(displayedTimeMs) : formatNumber(state.score)}</strong>
                  <span>
                    {state.lines} lines · Lv {state.level} · {formatTime(displayedTimeMs)}
                  </span>
                </div>
                {personalBest ? (
                  <p className="muted" style={{ margin: 0 }}>
                    Personal best: {mode === "sprint" ? formatTime(personalBest.timeMs) : formatNumber(personalBest.score)}
                  </p>
                ) : null}
                <label className="field">
                  <span className="label">Player name</span>
                  <input
                    className="input"
                    value={playerName}
                    maxLength={18}
                    onChange={(event) => handlePlayerNameChange(event.target.value)}
                    placeholder="이름"
                  />
                </label>
                <div className="actions">
                  <button
                    type="button"
                    className="button"
                    onClick={handleSubmitScore}
                    disabled={isSaving || hasSubmitted}
                    aria-busy={isSaving}
                  >
                    Save Score
                  </button>
                  <button type="button" className="ghost-button" onClick={() => startNewGame(mode)}>
                    Play Again
                  </button>
                </div>
                {saveStatus ? <div className="notice">{saveStatus}</div> : null}
              </div>
            ) : (
              <div className="tetris-control-list">
                <span>← / → Move</span>
                <span>↓ Soft drop</span>
                <span>Space Hard drop</span>
                <span>↑ / X Rotate</span>
                <span>Z Counter rotate</span>
                <span>C / Shift Hold</span>
                <span>P Pause</span>
                <span>R Restart</span>
              </div>
            )}
          </section>
        </aside>
      </section>
    </>
  );
}
