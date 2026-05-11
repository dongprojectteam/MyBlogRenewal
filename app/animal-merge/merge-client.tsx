"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Matter, { Body, Composite, Engine, Events, Runner, World } from "matter-js";

type Animal = {
  level: number;
  name: string;
  image: string;
  radius: number;
  score: number;
  friction: number;
  restitution: number;
  density: number;
};

type GameResult = "win" | "lose" | "timeout" | "idle";

type Rank = {
  id: string;
  nickname: string;
  mode: GameMode;
  score: number;
  max_level: number;
  elapsed_sec: number;
  pieces: number;
  seed: number;
  result?: GameResult;
  created_at?: string;
};

type FloatingCombo = { id: number; x: number; y: number; text: string };
type PreloadStatus = "idle" | "loading" | "ready" | "error";
type MergeParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  age: number;
  life: number;
  color: string;
  drag: number;
};
type MergeWave = {
  x: number;
  y: number;
  age: number;
  life: number;
  startRadius: number;
  endRadius: number;
  color: string;
};
type BoardPulse = {
  age: number;
  life: number;
  color: string;
  strength: number;
};

const ANIMALS: Animal[] = [
  { level: 1, name: "Snake", image: "/game_assets/animal_merge/images/snake.png", radius: 20, score: 10, friction: 0.01, restitution: 0.28, density: 0.0008 },
  { level: 2, name: "Rabbit", image: "/game_assets/animal_merge/images/rabbit.png", radius: 24, score: 20, friction: 0.02, restitution: 0.26, density: 0.0009 },
  { level: 3, name: "Pig", image: "/game_assets/animal_merge/images/pig.png", radius: 28, score: 35, friction: 0.03, restitution: 0.24, density: 0.001 },
  { level: 4, name: "Sloth", image: "/game_assets/animal_merge/images/sloth.png", radius: 32, score: 55, friction: 0.09, restitution: 0.22, density: 0.0011 },
  { level: 5, name: "Zebra", image: "/game_assets/animal_merge/images/zebra.png", radius: 36, score: 80, friction: 0.03, restitution: 0.22, density: 0.0012 },
  { level: 6, name: "Walrus", image: "/game_assets/animal_merge/images/walrus.png", radius: 40, score: 120, friction: 0.04, restitution: 0.2, density: 0.0014 },
  { level: 7, name: "Bear", image: "/game_assets/animal_merge/images/bear.png", radius: 44, score: 170, friction: 0.04, restitution: 0.2, density: 0.0016 },
  { level: 8, name: "Buffalo", image: "/game_assets/animal_merge/images/buffalo.png", radius: 48, score: 230, friction: 0.05, restitution: 0.18, density: 0.0018 },
  { level: 9, name: "Rhino", image: "/game_assets/animal_merge/images/rhino.png", radius: 53, score: 300, friction: 0.06, restitution: 0.17, density: 0.002 },
  { level: 10, name: "Whale", image: "/game_assets/animal_merge/images/whale.png", radius: 58, score: 400, friction: 0.06, restitution: 0.14, density: 0.0024 },
];

const HISTORY_KEY = "animal-merge-local-v1";
const BEST_KEY = "animal-merge-best-v1";
const NICKNAME_KEY = "animal-merge-nickname-v1";
const DEFAULT_NICKNAME = "DOPT";
const DROP_COOLDOWN_MS = 180;
const SPAWN_MERGE_PROTECT_MS = 260;
const DEFAULT_TIME_ATTACK_SEC = 90;
const IDLE_TIMEOUT_MS = 10_000;
const IDLE_WARNING_MS = 4_000;
const EFFECT_COLORS = ["#8affc7", "#7ad8ff", "#ffd54a", "#ff9cb6", "#d6b3ff", "#ffb766", "#f2ff8a"];
const SPAWN_LEVEL_WEIGHTS = [45, 30, 17, 8];
const SPRITE_CONTACT_OVERDRAW = 1.035;
const MERGE_POP_OVERDRAW = 0.1;
const SHAKE_START_CHARGES = 1;
const SHAKE_MAX_CHARGES = 2;
const SHAKE_RECHARGE_MERGES = 5;
const COMBO_WINDOW_MS = 2_000;
const FEVER_COMBO_THRESHOLD = 3;
const FEVER_DURATION_MS = 5_000;
const FEVER_SCORE_MULTIPLIER = 1.25;
const BOARD_TOP = 78;
const BOARD_BOTTOM = 606;
const DEADLINE_RATIO = 0.9;
const BOARD_MIN_PLAY_WIDTH = 180;

type GameMode = "endless" | "whale-rush" | "time-attack";

type BoardLayout = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  deadlineRatio: number;
  pressurePx: number;
  pressurePercent: number;
};

const GAME_MODES: Array<{ id: GameMode; label: string; description: string }> = [
  { id: "endless", label: "Endless", description: "무제한 모드: 언제까지든 버텨보세요." },
  { id: "whale-rush", label: "Whale Rush", description: "빠르게 10 Whale을 달성하세요." },
  { id: "time-attack", label: "Time Attack", description: "정해진 시간 내 최고 점수를 노리세요." },
];

const MODE_BADGES: Record<GameMode, string> = {
  endless: "No limit",
  "whale-rush": "Lv 10",
  "time-attack": "90 sec",
};

const BOARD_TUNING: Record<
  GameMode,
  {
    sideRatio: number;
    minSide: number;
    maxSide: number;
    pressureDelaySec: number;
    pressureRatePx: number;
    pressureMaxPx: number;
    gravity: number;
  }
> = {
  endless: { sideRatio: 0.12, minSide: 68, maxSide: 92, pressureDelaySec: 35, pressureRatePx: 0.85, pressureMaxPx: 70, gravity: 0.72 },
  "whale-rush": { sideRatio: 0.155, minSide: 76, maxSide: 116, pressureDelaySec: 18, pressureRatePx: 1.2, pressureMaxPx: 95, gravity: 0.78 },
  "time-attack": { sideRatio: 0.145, minSide: 74, maxSide: 108, pressureDelaySec: 12, pressureRatePx: 1.05, pressureMaxPx: 80, gravity: 0.82 },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getBoardLayout(mode: GameMode, width: number, runtimeSec = 0): BoardLayout {
  const tuning = BOARD_TUNING[mode];
  const maxAllowedSide = Math.max(48, (width - BOARD_MIN_PLAY_WIDTH) / 2);
  const side = Math.round(Math.min(maxAllowedSide, clamp(width * tuning.sideRatio, tuning.minSide, tuning.maxSide)));
  const pressurePx = clamp((runtimeSec - tuning.pressureDelaySec) * tuning.pressureRatePx, 0, tuning.pressureMaxPx);

  return {
    top: BOARD_TOP,
    left: side,
    right: side,
    bottom: BOARD_BOTTOM,
    deadlineRatio: DEADLINE_RATIO,
    pressurePx,
    pressurePercent: tuning.pressureMaxPx > 0 ? Math.round((pressurePx / tuning.pressureMaxPx) * 100) : 0,
  };
}

function getDeadlineY(board: BoardLayout) {
  return board.top + (board.bottom - board.top) * (1 - board.deadlineRatio) + board.pressurePx;
}

function ModeIcon({ mode }: { mode: GameMode }) {
  if (mode === "whale-rush") {
    return (
      <svg viewBox="0 0 32 24" aria-hidden="true" focusable="false">
        <path d="M4.2 14.2c2.1 4 7.1 6.1 12.6 5.1 4.7-.8 8.2-3.7 8.9-7.5" />
        <path d="M5.2 13.8c1.1-5.3 6.6-8.3 13.2-7.1 1 .2 1.9-.1 2.6-.8l2.3-2.5.5 4.1 4 1.2-3.6 1.8" />
        <path d="M15.7 9.7h.1" />
        <path d="M7.7 15.6c2.7 1.1 6.7 1.2 10-.1" />
      </svg>
    );
  }

  if (mode === "time-attack") {
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
        <path d="M14 24.5a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
        <path d="M14 8.4v6.1l4.3 2.6" />
        <path d="M10.3 2.8h7.4" />
        <path d="M14 2.8v2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 22" aria-hidden="true" focusable="false">
      <path d="M9 16.7c-3.5 0-6.1-2.5-6.1-5.7S5.5 5.3 9 5.3c5.9 0 8.1 11.4 14 11.4 3.5 0 6.1-2.5 6.1-5.7S26.5 5.3 23 5.3C17.1 5.3 14.9 16.7 9 16.7Z" />
    </svg>
  );
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

function pickSpawnLevel(maxUnlocked: number, random: () => number, spawnCap = 4) {
  const highestLevel = Math.min(spawnCap, SPAWN_LEVEL_WEIGHTS.length, Math.max(1, maxUnlocked));
  const weights = SPAWN_LEVEL_WEIGHTS.slice(0, highestLevel);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = random() * totalWeight;

  for (let index = 0; index < weights.length; index += 1) {
    cursor -= weights[index];
    if (cursor < 0) return index + 1;
  }

  return highestLevel;
}

function bestKeyForMode(mode: GameMode) {
  return `${BEST_KEY}:${mode}`;
}

function historyKeyForMode(mode: GameMode) {
  return `${HISTORY_KEY}:${mode}`;
}

function readBestScore(mode: GameMode) {
  const modeBest = Number(window.localStorage.getItem(bestKeyForMode(mode)) ?? "0");
  if (Number.isFinite(modeBest) && modeBest > 0) return modeBest;
  if (mode === "endless") {
    const legacyBest = Number(window.localStorage.getItem(BEST_KEY) ?? "0");
    return Number.isFinite(legacyBest) ? legacyBest : 0;
  }
  return 0;
}

function normalizeNickname(value: string | null | undefined) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim().slice(0, 10);
  return normalized.length >= 2 ? normalized : DEFAULT_NICKNAME;
}

function readStoredNickname() {
  if (typeof window === "undefined") return DEFAULT_NICKNAME;
  try {
    return normalizeNickname(window.localStorage.getItem(NICKNAME_KEY));
  } catch {
    return DEFAULT_NICKNAME;
  }
}

function saveStoredNickname(value: string) {
  if (typeof window === "undefined") return;
  const normalized = normalizeNickname(value);
  try {
    window.localStorage.setItem(NICKNAME_KEY, normalized);
  } catch {
    // Ignore storage errors so score submission still works in restricted browsers.
  }
}

export function MergeClient() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const runnerRef = useRef<Runner | null>(null);
  const frameRef = useRef<number | null>(null);
  const bodiesRef = useRef<Map<number, Matter.Body>>(new Map());
  const pendingRef = useRef<{ level: number; x: number; y: number }[]>([]);
  const dropLevelRef = useRef(1);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const mergeAtRef = useRef(0);
  const shakeChargesRef = useRef(SHAKE_START_CHARGES);
  const shakeChargeProgressRef = useRef(0);
  const feverUntilRef = useRef(0);
  const deadlineTouchesRef = useRef<Map<number, number>>(new Map());
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const mergeAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastDropAtRef = useRef(0);
  const rngRef = useRef<() => number>(() => Math.random());
  const isPausedRef = useRef(false);
  const isGameOverRef = useRef(false);
  const maxLevelRef = useRef(1);
  const pausedAtRef = useRef<number | null>(null);
  const pausedTotalMsRef = useRef(0);
  const particlesRef = useRef<MergeParticle[]>([]);
  const wavesRef = useRef<MergeWave[]>([]);
  const pulsesRef = useRef<BoardPulse[]>([]);
  const lastFrameAtRef = useRef(0);
  const screenShakeRef = useRef({ age: 0, life: 0, strength: 0 });
  const lastInputAtRef = useRef(0);
  const idleRemainingSecRef = useRef(Math.ceil(IDLE_TIMEOUT_MS / 1000));

  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [maxLevel, setMaxLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>("endless");
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [nickname, setNickname] = useState(DEFAULT_NICKNAME);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [floating, setFloating] = useState<FloatingCombo[]>([]);
  const [preloadStatus, setPreloadStatus] = useState<PreloadStatus>("idle");
  const [preloadLoaded, setPreloadLoaded] = useState(0);
  const [preloadTotal, setPreloadTotal] = useState(0);
  const [preloadFailures, setPreloadFailures] = useState<string[]>([]);
  const [nextQueue, setNextQueue] = useState<number[]>([1, 1, 1]);
  const startedAtRef = useRef<number>(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [pieces, setPieces] = useState(0);
  const [dropReady, setDropReady] = useState(true);
  const [shakeCharges, setShakeCharges] = useState(SHAKE_START_CHARGES);
  const [shakeChargeProgress, setShakeChargeProgress] = useState(0);
  const [feverRemainingMs, setFeverRemainingMs] = useState(0);
  const [seed, setSeed] = useState<number>(0);
  const [idleRemainingSec, setIdleRemainingSec] = useState(Math.ceil(IDLE_TIMEOUT_MS / 1000));
  const idleWarningActive = started && !isPaused && !isGameOver && idleRemainingSec * 1000 <= IDLE_WARNING_MS;
  const canShake = started && !isPaused && !isGameOver && shakeCharges > 0;
  const shakeStatusLabel = !started ? "Standby" : isGameOver ? "Ended" : isPaused ? "Paused" : shakeCharges > 0 ? "Ready" : "Used";
  const gameOverTitle = gameResult === "win" ? "Whale Rush Clear!" : gameResult === "timeout" ? "Time Up!" : gameResult === "idle" ? "No Input!" : "Game Over";
  const canSubmitThisRun = gameMode !== "whale-rush" || gameResult === "win";
  const canSubmitScore = canSubmitThisRun && nickname.trim().length >= 2;
  const feverActive = feverRemainingMs > 0;
  const feverRemainingSec = Math.ceil(feverRemainingMs / 1000);
  const pressurePreview = getBoardLayout(gameMode, 720, elapsedSec).pressurePercent;

  function getRuntimeSec() {
    if (!startedAtRef.current) return 0;
    const activePauseMs = pausedAtRef.current ? Date.now() - pausedAtRef.current : 0;
    const runtimeMs = Date.now() - startedAtRef.current - pausedTotalMsRef.current - activePauseMs;
    return Math.max(0, Math.floor(runtimeMs / 1000));
  }

  function endGame(result: GameResult) {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;
    setGameResult(result);
    setIsGameOver(true);
    setElapsedSec(getRuntimeSec());
    feverUntilRef.current = 0;
    setFeverRemainingMs(0);
    const runner = runnerRef.current;
    if (runner) Runner.stop(runner);
  }

  function setIdleRemaining(nextSec: number) {
    if (idleRemainingSecRef.current === nextSec) return;
    idleRemainingSecRef.current = nextSec;
    setIdleRemainingSec(nextSec);
  }

  function registerPlayerInput() {
    lastInputAtRef.current = Date.now();
    setIdleRemaining(Math.ceil(IDLE_TIMEOUT_MS / 1000));
  }

  function effectColor(level: number, offset = 0) {
    return EFFECT_COLORS[(Math.max(0, level - 1) + offset) % EFFECT_COLORS.length];
  }

  function addScreenShake(strength: number, life = 240) {
    screenShakeRef.current = {
      age: 0,
      life,
      strength: Math.max(screenShakeRef.current.strength, strength),
    };
  }

  function setShakeChargeState(charges: number, progress: number) {
    const nextCharges = clamp(charges, 0, SHAKE_MAX_CHARGES);
    const nextProgress = nextCharges >= SHAKE_MAX_CHARGES ? 0 : clamp(progress, 0, SHAKE_RECHARGE_MERGES - 1);
    shakeChargesRef.current = nextCharges;
    shakeChargeProgressRef.current = nextProgress;
    setShakeCharges(nextCharges);
    setShakeChargeProgress(nextProgress);
  }

  function resetRunPowerups() {
    setShakeChargeState(SHAKE_START_CHARGES, 0);
    feverUntilRef.current = 0;
    setFeverRemainingMs(0);
  }

  function resetComboState() {
    comboRef.current = 0;
    mergeAtRef.current = 0;
    setCombo(0);
  }

  function expireFeverIfNeeded(now = Date.now()) {
    if (feverUntilRef.current === 0 || feverUntilRef.current > now) return;
    feverUntilRef.current = 0;
    setFeverRemainingMs(0);
    resetComboState();
  }

  function discardRun() {
    if (runnerRef.current) {
      Runner.stop(runnerRef.current);
    }
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    setStarted(false);
    setIsGameOver(false);
    isGameOverRef.current = false;
    setGameResult(null);
    setIsPaused(false);
    isPausedRef.current = false;
    setGameKey((value) => value + 1);
    setSubmitMessage(null);
    setScore(0);
    scoreRef.current = 0;
    comboRef.current = 0;
    mergeAtRef.current = 0;
    setCombo(0);
    setMaxLevel(1);
    maxLevelRef.current = 1;
    setPieces(0);
    setElapsedSec(0);
    pendingRef.current = [];
    setFloating([]);
    clearEffects();
    setDropReady(true);
    lastDropAtRef.current = 0;
    startedAtRef.current = 0;
    lastInputAtRef.current = 0;
    setIdleRemaining(Math.ceil(IDLE_TIMEOUT_MS / 1000));
    pausedAtRef.current = null;
    pausedTotalMsRef.current = 0;
    resetRunPowerups();
    deadlineTouchesRef.current.clear();
    bodiesRef.current.clear();
    setSeed(0);
    rngRef.current = () => Math.random();
    dropLevelRef.current = 1;
    setCurrentLevel(1);
    setNextQueue([1, 1, 1]);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function switchMode(nextMode: GameMode) {
    if (nextMode === gameMode) return;
    discardRun();
    setRanks([]);
    setHighScore(readBestScore(nextMode));
    setGameMode(nextMode);
  }

  function rewardShakeCharge() {
    if (shakeChargesRef.current >= SHAKE_MAX_CHARGES) {
      setShakeChargeState(SHAKE_MAX_CHARGES, 0);
      return;
    }

    const nextProgress = shakeChargeProgressRef.current + 1;
    if (nextProgress >= SHAKE_RECHARGE_MERGES) {
      setShakeChargeState(shakeChargesRef.current + 1, 0);
      addScreenShake(5.2, 300);
      return;
    }

    setShakeChargeState(shakeChargesRef.current, nextProgress);
  }

  function activateFever(comboCount: number) {
    const now = Date.now();
    if (feverUntilRef.current > now) return;
    const nextUntil = now + FEVER_DURATION_MS;
    feverUntilRef.current = nextUntil;
    setFeverRemainingMs(FEVER_DURATION_MS);
    pulsesRef.current.push({
      age: 0,
      life: 520,
      color: "rgba(255,213,74,0.45)",
      strength: 0.12 + Math.min(0.08, Math.max(0, comboCount - FEVER_COMBO_THRESHOLD) * 0.02),
    });
    pulsesRef.current = pulsesRef.current.slice(-4);
  }

  function addMergeEffects(x: number, y: number, level: number, comboCount: number) {
    const baseColor = effectColor(level);
    const accentColor = effectColor(level, 2);
    const particleCount = Math.min(34, 12 + comboCount * 4 + level);
    const burstPower = 2.4 + Math.min(comboCount, 6) * 0.34 + level * 0.05;

    wavesRef.current.push(
      {
        x,
        y,
        age: 0,
        life: 420,
        startRadius: ANIMALS[Math.max(0, level - 2)]?.radius ?? 24,
        endRadius: 56 + level * 8 + Math.min(comboCount, 8) * 5,
        color: baseColor,
      },
      {
        x,
        y,
        age: 0,
        life: 620,
        startRadius: 10,
        endRadius: 34 + level * 6,
        color: accentColor,
      },
    );

    for (let index = 0; index < particleCount; index += 1) {
      const angle = (Math.PI * 2 * index) / particleCount + Math.random() * 0.4;
      const speed = burstPower * (0.5 + Math.random() * 0.85);
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.7,
        radius: 2.2 + Math.random() * (2.2 + Math.min(comboCount, 5) * 0.45),
        age: 0,
        life: 520 + Math.random() * 360,
        color: index % 3 === 0 ? accentColor : baseColor,
        drag: 0.965 + Math.random() * 0.018,
      });
    }

    if (level >= 5 || comboCount >= 4) {
      for (let index = 0; index < 12; index += 1) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
        const speed = 3.6 + Math.random() * 2.2;
        particlesRef.current.push({
          x: x + (Math.random() - 0.5) * 30,
          y: y - 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 3 + Math.random() * 2.5,
          age: 0,
          life: 680 + Math.random() * 420,
          color: EFFECT_COLORS[index % EFFECT_COLORS.length],
          drag: 0.972,
        });
      }
    }

    pulsesRef.current.push({
      age: 0,
      life: 260 + Math.min(comboCount, 8) * 24,
      color: accentColor,
      strength: Math.min(0.38, 0.13 + comboCount * 0.035),
    });
    addScreenShake(Math.min(9, 2.2 + comboCount * 0.75 + level * 0.18));

    particlesRef.current = particlesRef.current.slice(-180);
    wavesRef.current = wavesRef.current.slice(-12);
    pulsesRef.current = pulsesRef.current.slice(-4);
  }

  function getScreenShakeOffset(dt: number) {
    const shake = screenShakeRef.current;
    if (dt <= 0 || shake.age >= shake.life) return { x: 0, y: 0 };

    shake.age = Math.min(shake.life, shake.age + dt);
    const fade = 1 - shake.age / shake.life;
    const amount = shake.strength * fade * fade;
    return {
      x: (Math.random() - 0.5) * amount,
      y: (Math.random() - 0.5) * amount,
    };
  }

  function drawBoardPulses(ctx: CanvasRenderingContext2D, width: number, height: number, dt: number) {
    if (dt > 0) {
      for (const pulse of pulsesRef.current) pulse.age += dt;
      pulsesRef.current = pulsesRef.current.filter((pulse) => pulse.age < pulse.life);
    }

    for (const pulse of pulsesRef.current) {
      const progress = Math.min(1, pulse.age / pulse.life);
      const alpha = pulse.strength * Math.pow(1 - progress, 1.4);
      const glow = ctx.createRadialGradient(width * 0.5, height * 0.35, 20, width * 0.5, height * 0.35, Math.max(width, height) * 0.75);
      glow.addColorStop(0, pulse.color);
      glow.addColorStop(0.38, pulse.color);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  function drawMergeWaves(ctx: CanvasRenderingContext2D, dt: number) {
    if (dt > 0) {
      for (const wave of wavesRef.current) wave.age += dt;
      wavesRef.current = wavesRef.current.filter((wave) => wave.age < wave.life);
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const wave of wavesRef.current) {
      const progress = Math.min(1, wave.age / wave.life);
      const eased = 1 - Math.pow(1 - progress, 2);
      const radius = wave.startRadius + (wave.endRadius - wave.startRadius) * eased;
      ctx.globalAlpha = Math.pow(1 - progress, 1.2) * 0.7;
      ctx.lineWidth = 5 * (1 - progress) + 1;
      ctx.strokeStyle = wave.color;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMergeParticles(ctx: CanvasRenderingContext2D, dt: number) {
    const frameScale = dt > 0 ? Math.min(2.4, dt / 16.67) : 0;
    if (frameScale > 0) {
      for (const particle of particlesRef.current) {
        particle.age += dt;
        particle.x += particle.vx * frameScale;
        particle.y += particle.vy * frameScale;
        particle.vy += 0.065 * frameScale;
        particle.vx *= Math.pow(particle.drag, frameScale);
        particle.vy *= Math.pow(particle.drag, frameScale);
      }
      particlesRef.current = particlesRef.current.filter((particle) => particle.age < particle.life);
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const particle of particlesRef.current) {
      const progress = Math.min(1, particle.age / particle.life);
      ctx.globalAlpha = Math.pow(1 - progress, 1.55);
      ctx.fillStyle = particle.color;
      ctx.shadowBlur = 14;
      ctx.shadowColor = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * (1 + progress * 0.55), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function clearEffects() {
    particlesRef.current = [];
    wavesRef.current = [];
    pulsesRef.current = [];
    screenShakeRef.current = { age: 0, life: 0, strength: 0 };
    lastFrameAtRef.current = 0;
  }

  function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawBoardDeadline(ctx: CanvasRenderingContext2D, pitX: number, pitWidth: number, deadlineY: number, timeMs: number) {
    const pulse = 0.5 + Math.sin(timeMs / 220) * 0.5;
    const lineStart = pitX + 18;
    const lineEnd = pitX + pitWidth - 18;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = "rgba(255, 100, 86, 0.72)";
    ctx.shadowBlur = 12 + pulse * 10;
    ctx.lineWidth = 2.4;
    ctx.setLineDash([12, 9]);
    ctx.lineDashOffset = -timeMs / 42;
    ctx.strokeStyle = `rgba(255, ${116 + pulse * 28}, 92, ${0.74 + pulse * 0.18})`;
    ctx.beginPath();
    ctx.moveTo(lineStart, deadlineY);
    ctx.lineTo(lineEnd, deadlineY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 194, 92, 0.86)";
    roundedRectPath(ctx, pitX + 7, deadlineY - 4, 18, 8, 4);
    ctx.fill();
    roundedRectPath(ctx, pitX + pitWidth - 25, deadlineY - 4, 18, 8, 4);
    ctx.fill();
    ctx.restore();
  }

  function drawBoardSurface(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    board: BoardLayout,
    pitX: number,
    pitWidth: number,
    wallTop: number,
    wallHeight: number,
    deadlineY: number,
    timeMs: number,
    isFever: boolean,
  ) {
    const pitBottom = wallTop + wallHeight;
    const railWidth = 18;
    const floorY = board.bottom - 16;
    const boardBg = ctx.createLinearGradient(0, 0, width, height);
    boardBg.addColorStop(0, "#102534");
    boardBg.addColorStop(0.38, "#123236");
    boardBg.addColorStop(0.72, "#251924");
    boardBg.addColorStop(1, "#14151b");
    ctx.fillStyle = boardBg;
    ctx.fillRect(0, 0, width, height);

    const outerGlow = ctx.createLinearGradient(0, wallTop - 28, 0, pitBottom + 32);
    outerGlow.addColorStop(0, "rgba(134, 224, 207, 0.18)");
    outerGlow.addColorStop(0.45, "rgba(255, 196, 109, 0.08)");
    outerGlow.addColorStop(1, "rgba(245, 104, 106, 0.13)");
    ctx.fillStyle = outerGlow;
    roundedRectPath(ctx, pitX - 34, wallTop - 32, pitWidth + 68, wallHeight + 54, 28);
    ctx.fill();

    ctx.save();
    roundedRectPath(ctx, pitX - 1, wallTop, pitWidth + 2, wallHeight + 8, 18);
    ctx.clip();

    const pitGradient = ctx.createLinearGradient(0, wallTop, 0, pitBottom);
    pitGradient.addColorStop(0, "rgba(9, 21, 30, 0.74)");
    pitGradient.addColorStop(0.5, "rgba(12, 31, 33, 0.76)");
    pitGradient.addColorStop(1, "rgba(21, 17, 22, 0.86)");
    ctx.fillStyle = pitGradient;
    ctx.fillRect(pitX, wallTop, pitWidth, wallHeight + 12);

    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "#8be0cf";
    ctx.lineWidth = 1;
    for (let x = pitX - wallHeight; x < pitX + pitWidth + wallHeight; x += 44) {
      ctx.beginPath();
      ctx.moveTo(x, wallTop - 8);
      ctx.lineTo(x + wallHeight * 0.62, pitBottom + 18);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = "#ffc56d";
    for (let y = wallTop + 46; y < pitBottom - 34; y += 58) {
      ctx.beginPath();
      ctx.moveTo(pitX + 18, y);
      ctx.lineTo(pitX + pitWidth - 18, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#f5686a";
    for (let x = pitX + 42; x < pitX + pitWidth - 20; x += 82) {
      ctx.beginPath();
      ctx.moveTo(x, wallTop + 18);
      ctx.lineTo(x, pitBottom - 18);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const topLane = ctx.createLinearGradient(0, wallTop + 6, 0, wallTop + 46);
    topLane.addColorStop(0, "rgba(255, 255, 255, 0.12)");
    topLane.addColorStop(0.4, "rgba(139, 224, 207, 0.12)");
    topLane.addColorStop(1, "rgba(10, 20, 28, 0)");
    ctx.fillStyle = topLane;
    ctx.fillRect(pitX, wallTop, pitWidth, 64);

    const floorGradient = ctx.createLinearGradient(0, floorY, 0, board.bottom + 26);
    floorGradient.addColorStop(0, "rgba(255, 215, 126, 0.1)");
    floorGradient.addColorStop(0.42, "rgba(117, 87, 56, 0.5)");
    floorGradient.addColorStop(1, "rgba(24, 18, 20, 0.95)");
    ctx.fillStyle = floorGradient;
    roundedRectPath(ctx, pitX + 10, floorY, pitWidth - 20, 46, 16);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 211, 126, 0.32)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pitX + 26, floorY + 5);
    ctx.lineTo(pitX + pitWidth - 26, floorY + 5);
    ctx.stroke();
    ctx.restore();

    const leftRail = ctx.createLinearGradient(pitX - railWidth, 0, pitX + 3, 0);
    leftRail.addColorStop(0, "rgba(22, 31, 37, 0.98)");
    leftRail.addColorStop(0.45, "rgba(54, 91, 89, 0.98)");
    leftRail.addColorStop(1, "rgba(139, 224, 207, 0.7)");
    ctx.fillStyle = leftRail;
    roundedRectPath(ctx, pitX - railWidth, wallTop - 7, railWidth, wallHeight + 22, 9);
    ctx.fill();

    const rightRail = ctx.createLinearGradient(pitX + pitWidth - 3, 0, pitX + pitWidth + railWidth, 0);
    rightRail.addColorStop(0, "rgba(139, 224, 207, 0.7)");
    rightRail.addColorStop(0.55, "rgba(54, 91, 89, 0.98)");
    rightRail.addColorStop(1, "rgba(22, 31, 37, 0.98)");
    ctx.fillStyle = rightRail;
    roundedRectPath(ctx, pitX + pitWidth, wallTop - 7, railWidth, wallHeight + 22, 9);
    ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(255, 205, 118, 0.58)";
    ctx.lineWidth = 2;
    for (let y = wallTop + 30; y < pitBottom - 8; y += 84) {
      ctx.beginPath();
      ctx.moveTo(pitX - railWidth + 5, y);
      ctx.lineTo(pitX - 6, y + 16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pitX + pitWidth + 6, y + 16);
      ctx.lineTo(pitX + pitWidth + railWidth - 5, y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1;
    roundedRectPath(ctx, pitX - 30, wallTop - 28, pitWidth + 60, wallHeight + 50, 26);
    ctx.stroke();

    if (isFever) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255, 213, 74, 0.22)";
      ctx.lineWidth = 5;
      roundedRectPath(ctx, pitX - 4, wallTop + 4, pitWidth + 8, wallHeight, 20);
      ctx.stroke();
      ctx.restore();
    }

    drawBoardDeadline(ctx, pitX, pitWidth, deadlineY, timeMs);
  }

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isGameOverRef.current = isGameOver;
  }, [isGameOver]);

  useEffect(() => {
    maxLevelRef.current = maxLevel;
  }, [maxLevel]);

  const modeConfig = useMemo(() => {
    switch (gameMode) {
      case "whale-rush":
        return { label: "Whale Rush", spawnCap: 4, targetLevel: 10, timeLimitSec: 0, gravity: BOARD_TUNING["whale-rush"].gravity };
      case "time-attack":
        return { label: "Time Attack", spawnCap: 4, targetLevel: null, timeLimitSec: DEFAULT_TIME_ATTACK_SEC, gravity: BOARD_TUNING["time-attack"].gravity };
      default:
        return { label: "Endless", spawnCap: 4, targetLevel: null, timeLimitSec: 0, gravity: BOARD_TUNING.endless.gravity };
    }
  }, [gameMode]);

  const timeRemaining = modeConfig.timeLimitSec ? Math.max(0, modeConfig.timeLimitSec - elapsedSec) : 0;

  useEffect(() => {
    setHighScore(readBestScore(gameMode));
    setNickname(readStoredNickname());
    void preloadAssets();
  }, []);

  useEffect(() => {
    setHighScore(readBestScore(gameMode));
    void fetchRanks(gameMode);
  }, [gameMode]);

  async function preloadAssets() {
    const sources = [...ANIMALS.map((item) => item.image), "/game_assets/animal_merge/audios/merge.ogg"];
    setPreloadStatus("loading");
    setPreloadLoaded(0);
    setPreloadTotal(sources.length);
    setPreloadFailures([]);

    let loaded = 0;
    const failures: string[] = [];
    const markLoaded = () => {
      loaded += 1;
      setPreloadLoaded(loaded);
    };

    const imageTasks = ANIMALS.map(
      (animal) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            imagesRef.current.set(animal.image, img);
            markLoaded();
            resolve();
          };
          img.onerror = () => {
            failures.push(animal.image);
            markLoaded();
            resolve();
          };
          img.src = animal.image;
        }),
    );

    const audioTask = new Promise<void>((resolve) => {
      const audio = new Audio("/game_assets/animal_merge/audios/merge.ogg");
      const done = () => {
        markLoaded();
        audio.removeEventListener("canplaythrough", done);
        audio.removeEventListener("error", onError);
        resolve();
      };
      const onError = () => {
        failures.push("/game_assets/animal_merge/audios/merge.ogg");
        done();
      };
      audio.preload = "auto";
      audio.addEventListener("canplaythrough", done, { once: true });
      audio.addEventListener("error", onError, { once: true });
      audio.load();
      mergeAudioRef.current = audio;
    });

    await Promise.allSettled([...imageTasks, audioTask]);
    setPreloadFailures(failures);
    setPreloadStatus(failures.length > 0 ? "error" : "ready");
  }

  useEffect(() => {
    if (!started) return;
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const engine = Engine.create({ gravity: { x: 0, y: modeConfig.gravity } });
    const world = engine.world;
    const width = Math.max(360, host.clientWidth);
    const height = 620;
    canvas.width = width;
    canvas.height = height;

    const board = getBoardLayout(gameMode, width, 0);
    const pitWidth = width - board.left - board.right;
    const floor = Matter.Bodies.rectangle(width / 2, board.bottom + 18, pitWidth, 36, { isStatic: true, label: "wall" });
    const left = Matter.Bodies.rectangle(board.left - 16, (board.top + board.bottom) / 2, 32, board.bottom - board.top + 60, {
      isStatic: true,
      label: "wall",
    });
    const right = Matter.Bodies.rectangle(width - board.right + 16, (board.top + board.bottom) / 2, 32, board.bottom - board.top + 60, {
      isStatic: true,
      label: "wall",
    });
    World.add(world, [floor, left, right]);

    engineRef.current = engine;
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);

    const tryMergeBodies = (bodyA: Matter.Body, bodyB: Matter.Body) => {
      const aLevel = Number(bodyA.plugin.level ?? 0);
      const bLevel = Number(bodyB.plugin.level ?? 0);
      if (aLevel === 0 || bLevel === 0 || aLevel !== bLevel || aLevel >= 10) return;
      const nowMs = performance.now();
      const aProtectedUntil = Number(bodyA.plugin.protectedUntil ?? 0);
      const bProtectedUntil = Number(bodyB.plugin.protectedUntil ?? 0);
      if (aProtectedUntil > nowMs || bProtectedUntil > nowMs) return;
      if (bodyA.plugin.merged || bodyB.plugin.merged) return;
      bodyA.plugin.merged = true;
      bodyB.plugin.merged = true;

      const x = (bodyA.position.x + bodyB.position.x) / 2;
      const y = (bodyA.position.y + bodyB.position.y) / 2;
      const newLevel = aLevel + 1;
      pendingRef.current.push({ level: newLevel, x, y });
      Composite.remove(world, bodyA);
      Composite.remove(world, bodyB);
      bodiesRef.current.delete(bodyA.id);
      bodiesRef.current.delete(bodyB.id);

      const now = Date.now();
      expireFeverIfNeeded(now);
      comboRef.current = now - mergeAtRef.current <= COMBO_WINDOW_MS ? comboRef.current + 1 : 1;
      mergeAtRef.current = now;
      setCombo(comboRef.current);
      if (comboRef.current >= FEVER_COMBO_THRESHOLD && feverUntilRef.current === 0) {
        activateFever(comboRef.current);
      }
      const isFeverScoring = feverUntilRef.current > now;

      const animal = ANIMALS[aLevel - 1];
      const earned = Math.round(animal.score * (1 + comboRef.current * 0.5) * (isFeverScoring ? FEVER_SCORE_MULTIPLIER : 1));
      scoreRef.current += earned;
      setScore(scoreRef.current);
      rewardShakeCharge();
      setMaxLevel((prev) => {
        const next = Math.max(prev, newLevel);
        maxLevelRef.current = next;
        return next;
      });

      const id = Date.now() + Math.random();
      setFloating((prev) => [...prev, { id, x, y, text: `+${earned} x${comboRef.current}` }]);
      window.setTimeout(() => setFloating((prev) => prev.filter((item) => item.id !== id)), 800);
      addMergeEffects(x, y, newLevel, comboRef.current);

      const audio = mergeAudioRef.current?.cloneNode(true);
      if (audio instanceof HTMLAudioElement) {
        audio.volume = 0.45;
        void audio.play().catch(() => undefined);
      }
    };

    const handleMergeCollisions = (evt: Matter.IEventCollision<Engine>) => {
      for (const pair of evt.pairs) {
        tryMergeBodies(pair.bodyA, pair.bodyB);
      }
    };

    const collisionStartHandler = Events.on(engine, "collisionStart", handleMergeCollisions);
    const collisionActiveHandler = Events.on(engine, "collisionActive", handleMergeCollisions);
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx || !engineRef.current) return;
      const nowMs = performance.now();
      const dt = lastFrameAtRef.current ? Math.min(48, nowMs - lastFrameAtRef.current) : 16.67;
      lastFrameAtRef.current = nowMs;
      const effectDt = isPausedRef.current || isGameOverRef.current ? 0 : dt;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const shake = getScreenShakeOffset(effectDt);
      ctx.save();
      ctx.translate(shake.x, shake.y);
      const runtimeSec = getRuntimeSec();
      const board = getBoardLayout(gameMode, canvas.width, runtimeSec);
      const pitWidth = canvas.width - board.left - board.right;
      const pitX = board.left;
      const wallTop = board.top - 4;
      const wallHeight = board.bottom - board.top + 10;
      const deadlineY = getDeadlineY(board);
      drawBoardSurface(ctx, canvas.width, canvas.height, board, pitX, pitWidth, wallTop, wallHeight, deadlineY, nowMs, feverUntilRef.current > Date.now());
      drawBoardPulses(ctx, canvas.width, canvas.height, effectDt);

      while (pendingRef.current.length > 0) {
        const next = pendingRef.current.shift();
        if (!next) break;
        spawnBody(next.level, next.x, next.y, true);
      }

      drawMergeWaves(ctx, effectDt);

      for (const body of Composite.allBodies(engineRef.current.world)) {
        const level = Number(body.plugin.level ?? 0);
        if (level <= 0) continue;
        const animal = ANIMALS[level - 1];
        const isMergePop = Boolean(body.plugin.mergePop);
        const bornAt = Number(body.plugin.bornAt ?? nowMs);
        const popProgress = isMergePop ? Math.max(0, 1 - (nowMs - bornAt) / 180) : 0;
        const visualRadius = animal.radius * (SPRITE_CONTACT_OVERDRAW + popProgress * MERGE_POP_OVERDRAW);
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        const img = imagesRef.current.get(animal.image);
        if (!img) {
          ctx.restore();
          continue;
        }
        const size = visualRadius * 2;
        ctx.beginPath();
        ctx.arc(0, 0, visualRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, -visualRadius, -visualRadius, size, size);
        ctx.restore();
      }

      drawMergeParticles(ctx, effectDt);
      ctx.restore();

      if (!isGameOverRef.current && !isPausedRef.current) {
        const now = Date.now();
        const activeDeadlineBodies = new Set<number>();
        for (const body of Composite.allBodies(engineRef.current.world)) {
          const level = Number(body.plugin.level ?? 0);
          if (level <= 0) continue;
          if (body.bounds.min.y <= deadlineY) {
            activeDeadlineBodies.add(body.id);
            if (!deadlineTouchesRef.current.has(body.id)) {
              deadlineTouchesRef.current.set(body.id, now);
            }
          }
        }
        for (const bodyId of deadlineTouchesRef.current.keys()) {
          if (!activeDeadlineBodies.has(bodyId)) {
            deadlineTouchesRef.current.delete(bodyId);
          }
        }

        let shouldEnd = false;
        for (const [bodyId, touchAt] of deadlineTouchesRef.current.entries()) {
          const stillExists = Composite.get(engineRef.current.world, bodyId, "body");
          if (!stillExists) {
            deadlineTouchesRef.current.delete(bodyId);
            continue;
          }
          if (now - touchAt >= 3000) {
            shouldEnd = true;
            break;
          }
        }

        if (modeConfig.targetLevel && maxLevelRef.current >= modeConfig.targetLevel) {
          endGame("win");
        } else if (modeConfig.timeLimitSec && runtimeSec >= modeConfig.timeLimitSec) {
          endGame("timeout");
        } else if (shouldEnd) {
          endGame("lose");
        } else if (lastInputAtRef.current && now - lastInputAtRef.current >= IDLE_TIMEOUT_MS) {
          setIdleRemaining(0);
          endGame("idle");
        } else if (lastInputAtRef.current) {
          setIdleRemaining(Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - (now - lastInputAtRef.current)) / 1000)));
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    const resize = () => {
      if (!hostRef.current || !canvasRef.current) return;
      const w = Math.max(360, hostRef.current.clientWidth);
      canvasRef.current.width = w;
      canvasRef.current.height = height;
      const nextBoard = getBoardLayout(gameMode, w, getRuntimeSec());
      const nextPitWidth = w - nextBoard.left - nextBoard.right;
      const nextDeadlineY = getDeadlineY(nextBoard);
      resizeStaticBody(floor, w / 2, nextBoard.bottom + 18, nextPitWidth, 36);
      resizeStaticBody(left, nextBoard.left - 16, (nextBoard.top + nextBoard.bottom) / 2, 32, nextBoard.bottom - nextBoard.top + 60);
      resizeStaticBody(right, w - nextBoard.right + 16, (nextBoard.top + nextBoard.bottom) / 2, 32, nextBoard.bottom - nextBoard.top + 60);
      for (const body of Composite.allBodies(world)) {
        const level = Number(body.plugin.level ?? 0);
        if (level <= 0) continue;
        const animal = ANIMALS[level - 1];
        const minX = nextBoard.left + animal.radius;
        const maxX = w - nextBoard.right - animal.radius;
        const clampedX = Math.max(minX, Math.min(maxX, body.position.x));
        if (clampedX !== body.position.x || body.bounds.min.y <= nextDeadlineY) {
          Body.setPosition(body, { x: clampedX, y: body.position.y });
        }
      }
    };

    function resizeStaticBody(body: Matter.Body, x: number, y: number, targetWidth: number, targetHeight: number) {
      const width = body.bounds.max.x - body.bounds.min.x;
      const height = body.bounds.max.y - body.bounds.min.y;
      if (width > 0 && height > 0) {
        Body.scale(body, targetWidth / width, targetHeight / height);
      }
      Body.setPosition(body, { x, y });
    }

    const observer = new ResizeObserver(resize);
    observer.observe(host);

    draw();

    return () => {
      observer.disconnect();
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      Events.off(engine, "collisionStart", collisionStartHandler);
      Events.off(engine, "collisionActive", collisionActiveHandler);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      engineRef.current = null;
      runnerRef.current = null;
      bodiesRef.current.clear();
      deadlineTouchesRef.current.clear();
      clearEffects();
    };
  }, [started, gameKey, gameMode, modeConfig.gravity, modeConfig.targetLevel, modeConfig.timeLimitSec]);

  function spawnBody(level: number, x: number, y = 100, fromMerge = false) {
    const engine = engineRef.current;
    if (!engine) return;
    const animal = ANIMALS[level - 1];
    const body = Matter.Bodies.circle(x, y, animal.radius, {
      restitution: animal.restitution,
      friction: animal.friction,
      density: animal.density,
      label: "animal",
      plugin: {
        level,
        merged: false,
        protectedUntil: performance.now() + SPAWN_MERGE_PROTECT_MS,
        bornAt: performance.now(),
        mergePop: fromMerge,
      },
    });
    World.add(engine.world, body);
    bodiesRef.current.set(body.id, body);
  }

  function dropAt(clientX: number) {
    if (!started || isGameOver || isPaused) return;
    registerPlayerInput();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const now = performance.now();
    if (now - lastDropAtRef.current < DROP_COOLDOWN_MS) return;
    lastDropAtRef.current = now;
    setDropReady(false);
    window.setTimeout(() => setDropReady(true), DROP_COOLDOWN_MS);

    const canvasWidth = canvasRef.current?.width ?? rect.width;
    const pointerX = (clientX - rect.left) * (canvasWidth / Math.max(rect.width, 1));
    const board = getBoardLayout(gameMode, canvasWidth, getRuntimeSec());
    const x = Math.max(board.left + 24, Math.min(canvasWidth - board.right - 24, pointerX));
    spawnBody(dropLevelRef.current, x, board.top + 18);
    setPieces((v) => v + 1);
    const nextCurrent = nextQueue[0] ?? 1;
    const appended = pickSpawnLevel(maxLevelRef.current, rngRef.current, modeConfig.spawnCap);
    const shifted = [...nextQueue.slice(1), appended];
    dropLevelRef.current = nextCurrent;
    setCurrentLevel(nextCurrent);
    setNextQueue(shifted);
    setScore((v) => v);
  }

  async function fetchRanks(mode: GameMode = gameMode) {
    const res = await fetch(`/api/merge/rank?mode=${encodeURIComponent(mode)}`, { cache: "no-store" });
    const data = (await res.json()) as { ranks?: Rank[] };
    setRanks(data.ranks ?? []);
  }

  function handleNicknameChange(value: string) {
    setNickname(value);
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length >= 2) {
      saveStoredNickname(normalized);
    }
  }

  async function submitScore() {
    const name = nickname.trim();
    if (!canSubmitThisRun) return;
    if (name.length < 2) return;
    saveStoredNickname(name);
    setSubmitMessage(null);
    const res = await fetch("/api/merge/rank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: name,
        mode: gameMode,
        score,
        maxLevel,
        elapsedSec: getRuntimeSec(),
        pieces,
        seed,
        result: gameResult,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setSubmitMessage(data.error ?? "Failed to submit score.");
      return;
    }
    setSubmitMessage("Score submitted.");
    await fetchRanks(gameMode);
  }

  function startGame() {
    if (preloadStatus !== "ready") return;
    setStarted(true);
    setIsGameOver(false);
    isGameOverRef.current = false;
    setGameResult(null);
    setIsPaused(false);
    isPausedRef.current = false;
    setGameKey((v) => v + 1);
    setSubmitMessage(null);
    setScore(0);
    scoreRef.current = 0;
    comboRef.current = 0;
    mergeAtRef.current = 0;
    setCombo(0);
    setMaxLevel(1);
    maxLevelRef.current = 1;
    setPieces(0);
    setElapsedSec(0);
    pendingRef.current = [];
    setFloating([]);
    clearEffects();
    setDropReady(true);
    lastDropAtRef.current = 0;
    startedAtRef.current = Date.now();
    registerPlayerInput();
    pausedAtRef.current = null;
    pausedTotalMsRef.current = 0;
    resetRunPowerups();
    deadlineTouchesRef.current.clear();
    const nextSeed = Math.floor(Math.random() * 2_147_483_647);
    setSeed(nextSeed);
    rngRef.current = createRandom(nextSeed);
    const first = pickSpawnLevel(1, rngRef.current, modeConfig.spawnCap);
    const queue = [pickSpawnLevel(1, rngRef.current, modeConfig.spawnCap), pickSpawnLevel(1, rngRef.current, modeConfig.spawnCap), pickSpawnLevel(1, rngRef.current, modeConfig.spawnCap)];
    dropLevelRef.current = first;
    setCurrentLevel(first);
    setNextQueue(queue);
  }

  function togglePause() {
    if (!started || isGameOver) return;
    const runner = runnerRef.current;
    const engine = engineRef.current;
    if (!runner || !engine) return;
    if (isPaused) {
      if (pausedAtRef.current !== null) {
        const pausedFor = Date.now() - pausedAtRef.current;
        pausedTotalMsRef.current += pausedFor;
        for (const [bodyId, touchAt] of deadlineTouchesRef.current.entries()) {
          deadlineTouchesRef.current.set(bodyId, touchAt + pausedFor);
        }
        if (feverUntilRef.current > 0) {
          feverUntilRef.current += pausedFor;
          setFeverRemainingMs(Math.max(0, feverUntilRef.current - Date.now()));
        }
        pausedAtRef.current = null;
      }
      registerPlayerInput();
      Runner.run(runner, engine);
      isPausedRef.current = false;
      setIsPaused(false);
    } else {
      Runner.stop(runner);
      pausedAtRef.current = Date.now();
      isPausedRef.current = true;
      setIsPaused(true);
    }
  }

  function restartGame() {
    if (preloadStatus !== "ready") return;
    setStarted(true);
    setIsGameOver(false);
    isGameOverRef.current = false;
    setGameResult(null);
    setIsPaused(false);
    isPausedRef.current = false;
    setGameKey((v) => v + 1);
    setSubmitMessage(null);
    setScore(0);
    scoreRef.current = 0;
    comboRef.current = 0;
    mergeAtRef.current = 0;
    setCombo(0);
    setMaxLevel(1);
    maxLevelRef.current = 1;
    setPieces(0);
    setElapsedSec(0);
    pendingRef.current = [];
    setFloating([]);
    clearEffects();
    setDropReady(true);
    lastDropAtRef.current = 0;
    startedAtRef.current = Date.now();
    registerPlayerInput();
    pausedAtRef.current = null;
    pausedTotalMsRef.current = 0;
    resetRunPowerups();
    deadlineTouchesRef.current.clear();
    const nextSeed = Math.floor(Math.random() * 2_147_483_647);
    setSeed(nextSeed);
    rngRef.current = createRandom(nextSeed);
    const first = pickSpawnLevel(1, rngRef.current, modeConfig.spawnCap);
    const queue = [pickSpawnLevel(1, rngRef.current, modeConfig.spawnCap), pickSpawnLevel(1, rngRef.current, modeConfig.spawnCap), pickSpawnLevel(1, rngRef.current, modeConfig.spawnCap)];
    dropLevelRef.current = first;
    setCurrentLevel(first);
    setNextQueue(queue);
  }

  function shake() {
    if (!started || isGameOverRef.current || isPausedRef.current || shakeChargesRef.current <= 0) return;
    const engine = engineRef.current;
    if (!engine) return;
    registerPlayerInput();
    setShakeChargeState(shakeChargesRef.current - 1, shakeChargeProgressRef.current);
    for (const body of Composite.allBodies(engine.world)) {
      if (body.label !== "animal") continue;
      Body.applyForce(body, body.position, { x: (Math.random() - 0.5) * 0.03, y: -0.03 });
    }
    addScreenShake(9, 420);
  }

  useEffect(() => {
    if (!isGameOver) return;
    setHighScore((prev) => {
      const best = Math.max(prev, scoreRef.current);
      window.localStorage.setItem(bestKeyForMode(gameMode), String(best));
      if (gameMode === "endless") {
        window.localStorage.setItem(BEST_KEY, String(best));
      }
      return best;
    });
    const key = historyKeyForMode(gameMode);
    const history = JSON.parse(window.localStorage.getItem(key) ?? "[]") as Array<{ score: number; mode: GameMode; at: string }>;
    history.unshift({ score: scoreRef.current, mode: gameMode, at: new Date().toISOString() });
    window.localStorage.setItem(key, JSON.stringify(history.slice(0, 10)));
  }, [isGameOver, gameMode]);

  useEffect(() => {
    if (!started || isPaused || isGameOver) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      expireFeverIfNeeded(now);
      if (comboRef.current > 0 && mergeAtRef.current > 0 && now - mergeAtRef.current > COMBO_WINDOW_MS) {
        resetComboState();
      }
      setFeverRemainingMs(feverUntilRef.current > now ? feverUntilRef.current - now : 0);
      setElapsedSec(getRuntimeSec());
    }, 250);
    return () => window.clearInterval(id);
  }, [started, isPaused, isGameOver]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

      const key = event.key.toLowerCase();
      const code = event.code;
      if (key === "p" || code === "KeyP") {
        event.preventDefault();
        togglePause();
      } else if (key === "r" || code === "KeyR") {
        event.preventDefault();
        restartGame();
      } else if (key === "s" || code === "KeyS") {
        event.preventDefault();
        if (!event.repeat) {
          shake();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [started, isPaused, isGameOver, preloadStatus]);

  return (
    <section className="section" style={{ display: "grid", gap: 16 }}>
      <section className="panel merge-intro">
        <div className="merge-intro-copy">
          <div className="eyebrow">utility / game</div>
          <h1>Animal Merge</h1>
          <p className="muted">
            같은 동물을 합쳐 진화시키고 콤보를 쌓아보세요. 데드라인에 3초 이상 쌓이거나 10초 동안 드롭 입력이 없으면 게임이 종료됩니다.
          </p>
        </div>
        <div className="merge-mode-panel">
          <div className="merge-mode-selector" role="radiogroup" aria-label="Game mode">
            {GAME_MODES.map((mode) => {
              const isSelected = mode.id === gameMode;
              return (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={isSelected ? `${mode.label} selected` : started ? `Switch to ${mode.label} and stop current run` : `Switch to ${mode.label}`}
                className={isSelected ? "merge-mode-card is-active" : "merge-mode-card"}
                data-mode={mode.id}
                onClick={() => switchMode(mode.id)}
                title={!isSelected && started ? `Stop current run and switch to ${mode.label}` : mode.description}
              >
                <span className="merge-mode-aura" aria-hidden="true" />
                <span className="merge-mode-icon">
                  <ModeIcon mode={mode.id} />
                </span>
                <span className="merge-mode-copy">
                  <strong>{mode.label}</strong>
                  <small>{MODE_BADGES[mode.id]}</small>
                </span>
                <span className="merge-mode-check" aria-hidden="true" />
              </button>
              );
            })}
          </div>
          <p className="muted merge-mode-caption">
            {GAME_MODES.find((mode) => mode.id === gameMode)?.description}
          </p>
        </div>
      </section>
      {preloadStatus !== "ready" ? (
        <section className="panel" style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Loading game assets</strong>
            <span className="muted">{Math.round((preloadLoaded / Math.max(preloadTotal, 1)) * 100)}%</span>
          </div>
          <div style={{ height: 12, borderRadius: 999, background: "rgba(255,255,255,0.18)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${(preloadLoaded / Math.max(preloadTotal, 1)) * 100}%`,
                background: "linear-gradient(90deg, #7ad8ff 0%, #4fa3ff 55%, #8affcb 100%)",
                transition: "width 180ms ease",
              }}
            />
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>
            {preloadLoaded}/{preloadTotal} loaded
          </p>
          {preloadStatus === "error" ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span className="muted">Some assets failed to load ({preloadFailures.length}).</span>
              <button type="button" className="ghost-button" onClick={() => void preloadAssets()}>
                Retry
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="merge-game-layout">
        <div className="merge-left-column">
        <div className="panel tetris-play-panel merge-play-panel">
          <div className="tetris-play-header merge-stage-head" style={{ flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <span className="tag neutral">Animal Merge</span>
              <div style={{ display: "flex", gap: 8 }}>
                {!started ? (
                  <button className="button" type="button" onClick={startGame} disabled={preloadStatus !== "ready"}>
                    Start Game
                  </button>
                ) : (
                  <>
                    <button className="ghost-button" type="button" onClick={togglePause} disabled={isGameOver}>
                      {isPaused ? "Resume" : "Pause"}
                    </button>
                    <button className="button" type="button" onClick={restartGame}>
                      Restart
                    </button>
                  </>
                )}
                <button
                  className={canShake ? "ghost-button merge-shake-button is-ready" : "ghost-button merge-shake-button"}
                  type="button"
                  onClick={shake}
                  disabled={!canShake}
                  aria-keyshortcuts="S"
                  aria-label={`Shake ${shakeCharges} of ${SHAKE_MAX_CHARGES} available`}
                  title={`Shake ${shakeCharges}/${SHAKE_MAX_CHARGES} - ${shakeStatusLabel} (S)`}
                >
                  <span>Shake</span>
                  <strong>{shakeCharges}/{SHAKE_MAX_CHARGES}</strong>
                </button>
              </div>
            </div>
          </div>
          <div className="merge-top-stats">
            <div className="tetris-stat"><span>Score</span><strong>{score}</strong></div>
            <div className="tetris-stat"><span>Time</span><strong>{elapsedSec}s</strong></div>
            <div className={idleWarningActive ? "tetris-stat merge-idle-stat is-warning" : "tetris-stat merge-idle-stat"}><span>Idle</span><strong>{idleRemainingSec}s</strong></div>
            <div className="tetris-stat"><span>Best</span><strong>{highScore}</strong></div>
          </div>

          <div className="merge-stage-shell">
            <div
              className="merge-board-frame"
              ref={hostRef}
              onMouseDownCapture={(event) => {
                const target = event.target as HTMLElement | null;
                if (target?.closest("input, textarea, button")) return;
                if (event.detail > 1) event.preventDefault();
              }}
              onDoubleClickCapture={(event) => {
                const target = event.target as HTMLElement | null;
                if (target?.closest("input, textarea")) return;
                event.preventDefault();
              }}
              onDragStart={(event) => event.preventDefault()}
            >
              <canvas ref={canvasRef} onClick={(e) => dropAt(e.clientX)} style={{ width: "100%", height: 620, borderRadius: 18, cursor: "crosshair" }} />
          {!started || isPaused || isGameOver ? (
            <div className="merge-state-overlay" role={isGameOver ? "dialog" : "status"} aria-live={isGameOver ? "assertive" : "polite"}>
              <div className={isGameOver ? "merge-state-card merge-gameover-card" : "merge-state-card"}>
                {isGameOver ? (
                  <>
                    <div className="merge-gameover-head">
                      <span>{gameOverTitle}</span>
                      <strong>{score}</strong>
                    </div>
                    <div className="merge-gameover-stats">
                      <div><span>Level</span><strong>{maxLevel}</strong></div>
                      <div><span>Pieces</span><strong>{pieces}</strong></div>
                      <div><span>Time</span><strong>{elapsedSec}s</strong></div>
                    </div>
                    {canSubmitThisRun ? (
                      <>
                        <form
                          className="merge-gameover-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void submitScore();
                          }}
                        >
                          <input
                            className="input merge-gameover-input"
                            value={nickname}
                            onChange={(event) => handleNicknameChange(event.target.value)}
                            maxLength={10}
                            placeholder="Nickname"
                            autoFocus
                          />
                          <button type="submit" className="button" disabled={!canSubmitScore}>
                            Submit
                          </button>
                        </form>
                        {submitMessage ? <p className="merge-submit-message">{submitMessage}</p> : null}
                      </>
                    ) : (
                      <div className="merge-gameover-locked">
                        <strong>Clear required</strong>
                        <span>Whale Rush scores submit after Lv 10.</span>
                      </div>
                    )}
                    <button type="button" className="ghost-button merge-gameover-restart" onClick={restartGame}>
                      Restart
                    </button>
                  </>
                ) : (
                  <>
                    <strong className="merge-state-title">{!started ? "Ready" : "Paused"}</strong>
                    <span className="muted" style={{ marginBottom: 4 }}>
                      {!started ? "Start Game을 눌러 동물 드롭을 시작하세요." : "Resume으로 게임을 이어서 진행하세요."}
                    </span>
                    {!started ? (
                      <button type="button" className="button" onClick={startGame} disabled={preloadStatus !== "ready"}>
                        Start
                      </button>
                    ) : (
                      <button type="button" className="button" onClick={togglePause}>
                        Resume
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : null}
              {!isGameOver ? <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.24)",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 12, opacity: 0.9 }}>Drop</span>
                <img
                  src={ANIMALS[currentLevel - 1]?.image ?? ANIMALS[0].image}
                  alt={ANIMALS[currentLevel - 1]?.name ?? "Snake"}
                  width={26}
                  height={26}
                  style={{ borderRadius: 6 }}
                />
                <span
                  aria-label={dropReady && started && !isPaused && !isGameOver ? "drop-ready" : "drop-wait"}
                  title={dropReady && started && !isPaused && !isGameOver ? "Drop ready" : "Drop cooling"}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: dropReady && started && !isPaused && !isGameOver ? "#7dffb2" : "#ffb766",
                    boxShadow:
                      dropReady && started && !isPaused && !isGameOver
                        ? "0 0 0 3px rgba(125,255,178,0.2)"
                        : "0 0 0 3px rgba(255,183,102,0.2)",
                  }}
                />
              </div> : null}
              {feverActive && !isGameOver ? (
                <div className="merge-fever-banner" aria-hidden="true">
                  <strong>FEVER</strong>
                  <span>{feverRemainingSec}s x{FEVER_SCORE_MULTIPLIER}</span>
                </div>
              ) : null}
              {idleWarningActive ? (
                <div className="merge-idle-warning" role="status" aria-live="polite">
                  <strong>{idleRemainingSec}s</strong>
                  <span>Click to keep the run alive</span>
                </div>
              ) : null}
              {floating.map((item) => (
                <div
                  key={item.id}
                  aria-hidden="true"
                  className="merge-floating-score"
                  style={{ left: item.x - 40, top: item.y - 30 }}
                >
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>
        <section className="panel tetris-side-panel" style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <h2 style={{ marginBottom: 0 }}>Global Leaderboard ({modeConfig.label})</h2>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {ranks.map((r) => (
              <li key={r.id}>
                {r.nickname} - {r.score} · Lv {r.max_level} · {r.elapsed_sec}s
              </li>
            ))}
          </ol>
          {ranks.length === 0 ? <p className="muted" style={{ marginBottom: 0 }}>No ranked runs yet.</p> : null}
        </section>
        </div>

        <aside className="tetris-side-stack">
          <section className="panel tetris-side-panel merge-dashboard-panel">
            <div className="tetris-status-line">
              <span className="tag neutral">{!started ? "Ready" : isGameOver ? "Game Over" : isPaused ? "Paused" : "Playing"}</span>
              <span className="muted">Seed {seed || "-"}</span>
            </div>
            <div className="tetris-stats-grid">
              <div className="tetris-stat"><span>Mode</span><strong>{modeConfig.label}</strong></div>
              <div className="tetris-stat"><span>Level</span><strong>{maxLevel}</strong></div>
              <div className="tetris-stat"><span>Combo</span><strong>{combo}</strong></div>
              <div className="tetris-stat"><span>Pieces</span><strong>{pieces}</strong></div>
              <div className={feverActive ? "tetris-stat merge-fever-stat is-active" : "tetris-stat merge-fever-stat"}>
                <span>Fever</span><strong>{feverActive ? `${feverRemainingSec}s` : `${Math.min(combo, FEVER_COMBO_THRESHOLD)}/${FEVER_COMBO_THRESHOLD}`}</strong>
              </div>
              <div className={pressurePreview > 0 ? "tetris-stat merge-pressure-stat is-active" : "tetris-stat merge-pressure-stat"}>
                <span>Pressure</span><strong>{pressurePreview}%</strong>
              </div>
              {modeConfig.timeLimitSec ? (
                <div className="tetris-stat"><span>Time left</span><strong>{timeRemaining}s</strong></div>
              ) : null}
            </div>
            <div className="merge-side-utility-grid">
              <div className={canShake ? "merge-shake-card is-ready" : shakeCharges <= 0 ? "merge-shake-card is-spent" : "merge-shake-card"}>
                <div className="merge-shake-card-head">
                  <span>Shake</span>
                  <strong>{shakeCharges}/{SHAKE_MAX_CHARGES}</strong>
                </div>
                <div className="merge-shake-card-foot">
                  <span>{shakeCharges >= SHAKE_MAX_CHARGES ? "Full" : `${shakeStatusLabel} ${shakeChargeProgress}/${SHAKE_RECHARGE_MERGES}`}</span>
                  <div className="merge-shake-pips" aria-hidden="true">
                    {Array.from({ length: SHAKE_MAX_CHARGES }, (_, index) => (
                      <span key={index} className={index < shakeCharges ? "is-full" : undefined} />
                    ))}
                  </div>
                </div>
                <div className="merge-shake-progress" aria-hidden="true">
                  <span style={{ width: `${shakeCharges >= SHAKE_MAX_CHARGES ? 100 : (shakeChargeProgress / SHAKE_RECHARGE_MERGES) * 100}%` }} />
                </div>
              </div>
              <div className="merge-next-panel">
                <h2 style={{ marginBottom: 0 }}>Next</h2>
                <div className="merge-next-row">
                {nextQueue.map((level, index) => {
                  const animal = ANIMALS[level - 1];
                  return (
                    <div
                      key={`next-${index}-${level}`}
                      className="merge-next-card"
                    >
                      <img src={animal.image} alt={animal.name} width={48} height={48} style={{ borderRadius: 10 }} />
                      <span>{animal.name}</span>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          </section>
          <section className="panel tetris-side-panel merge-evolution-panel">
            <div className="merge-section-heading">
              <h2 style={{ marginBottom: 0 }}>Evolution</h2>
              <span className="merge-evolution-count">{maxLevel}/{ANIMALS.length}</span>
            </div>
            <div className="merge-evolution-track" role="list">
              {ANIMALS.map((animal) => {
                const isUnlocked = animal.level <= maxLevel;
                const isActive = animal.level === maxLevel;
                const isNext = animal.level === maxLevel + 1;
                const className = [
                  "merge-evolution-step",
                  isUnlocked ? "is-unlocked" : "is-locked",
                  isActive ? "is-active" : "",
                  isNext ? "is-next" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div key={animal.level} className={className} role="listitem" aria-current={isActive ? "step" : undefined}>
                    <div className="merge-evolution-node">
                      <span className="merge-evolution-level">Lv {animal.level}</span>
                      <img src={animal.image} alt={animal.name} width={48} height={48} />
                    </div>
                    <div className="merge-evolution-meta">
                      <strong>{animal.name}</strong>
                      <span>{animal.score} pts</span>
                    </div>
                    <span className="merge-evolution-state" aria-hidden="true" />
                  </div>
                );
              })}
            </div>
          </section>
          <section className="panel tetris-side-panel" style={{ display: "grid", gap: 10 }}>
            <h2 style={{ marginBottom: 0 }}>Controls</h2>
            <div className="merge-controls-grid">
              <span><kbd>Click</kbd> Drop</span>
              <span><kbd>S</kbd> Shake</span>
              <span><kbd>Merge</kbd> Recharge</span>
              <span><kbd>P</kbd> Pause</span>
              <span><kbd>R</kbd> Restart</span>
              <span><kbd>Mode</kbd> Switch</span>
            </div>
          </section>
        </aside>
      </section>

      <style jsx>{`@keyframes floatUp { from { opacity: 1; transform: translateY(0);} to {opacity:0; transform: translateY(-22px);} }
        @keyframes idlePulse { from { opacity: 0.82; transform: translateX(-50%) scale(0.99); } to { opacity: 1; transform: translateX(-50%) scale(1.02); } }
        .merge-intro {
          display: grid;
          grid-template-columns: minmax(220px, 0.62fr) minmax(430px, 1.38fr);
          gap: 18px;
          align-items: center;
          padding-block: 18px;
        }
        .merge-intro-copy {
          min-width: 0;
        }
        .merge-intro h1 {
          margin: 8px 0 6px;
          font-size: clamp(2rem, 3vw, 2.35rem);
          line-height: 1;
        }
        .merge-intro-copy .muted {
          margin: 0;
          line-height: 1.45;
        }
        .merge-game-layout {
          display: grid;
          grid-template-columns: minmax(0, 660px) minmax(360px, 1fr);
          justify-content: stretch;
          align-items: start;
          gap: 16px;
          width: 100%;
        }
        .merge-left-column {
          display: grid;
          gap: 16px;
          min-width: 0;
          width: 100%;
        }
        .merge-play-panel {
          display: grid;
          gap: 14px;
          align-self: start;
        }
        .merge-stage-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .merge-mode-panel {
          min-width: 0;
          width: 100%;
          display: grid;
          justify-items: end;
          gap: 10px;
        }
        .merge-mode-selector {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          width: min(100%, 520px);
        }
        .merge-mode-card {
          --mode-a: #8affc7;
          --mode-b: #7ad8ff;
          position: relative;
          isolation: isolate;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) 10px;
          align-items: center;
          gap: 8px;
          min-height: 60px;
          overflow: hidden;
          padding: 9px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          color: rgba(232, 240, 255, 0.78);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.025)),
            rgba(10, 18, 31, 0.64);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
          cursor: pointer;
          text-align: left;
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease, opacity 160ms ease;
        }
        .merge-mode-card[data-mode="whale-rush"] {
          --mode-a: #ffd54a;
          --mode-b: #ff8f6d;
        }
        .merge-mode-card[data-mode="time-attack"] {
          --mode-a: #7ad8ff;
          --mode-b: #d6b3ff;
        }
        .merge-mode-card:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: color-mix(in srgb, var(--mode-a) 58%, rgba(255, 255, 255, 0.18));
          color: rgba(247, 250, 255, 0.96);
        }
        .merge-mode-card:disabled {
          cursor: not-allowed;
        }
        .merge-mode-card:disabled:not(.is-active) {
          opacity: 0.46;
        }
        .merge-mode-card.is-active {
          border-color: color-mix(in srgb, var(--mode-a) 72%, rgba(255, 255, 255, 0.2));
          color: rgba(255, 255, 255, 0.98);
          background:
            linear-gradient(135deg, color-mix(in srgb, var(--mode-a) 22%, transparent), color-mix(in srgb, var(--mode-b) 12%, transparent)),
            rgba(12, 22, 32, 0.82);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 14px 34px rgba(0, 0, 0, 0.2),
            0 0 22px color-mix(in srgb, var(--mode-a) 18%, transparent);
        }
        .merge-mode-aura {
          position: absolute;
          inset: 0;
          z-index: -1;
          border-radius: inherit;
          background: linear-gradient(135deg, color-mix(in srgb, var(--mode-a) 24%, transparent), transparent 48%, color-mix(in srgb, var(--mode-b) 18%, transparent));
          opacity: 0;
          transition: opacity 160ms ease;
        }
        .merge-mode-card.is-active .merge-mode-aura,
        .merge-mode-card:hover:not(:disabled) .merge-mode-aura {
          opacity: 1;
        }
        .merge-mode-icon {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 12px;
          color: var(--mode-a);
          background:
            linear-gradient(145deg, color-mix(in srgb, var(--mode-a) 18%, transparent), color-mix(in srgb, var(--mode-b) 12%, transparent)),
            rgba(5, 12, 20, 0.68);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 9px 18px rgba(0, 0, 0, 0.24);
        }
        .merge-mode-icon :global(svg) {
          display: block;
          width: 24px;
          height: 24px;
        }
        .merge-mode-icon :global(svg path),
        .merge-mode-icon :global(svg circle),
        .merge-mode-icon :global(svg ellipse),
        .merge-mode-icon :global(svg line),
        .merge-mode-icon :global(svg polyline),
        .merge-mode-icon :global(svg polygon),
        .merge-mode-icon :global(svg rect) {
          fill: none;
          stroke: currentColor;
          stroke-width: 2.1;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .merge-mode-card.is-active .merge-mode-icon {
          color: #111820;
          background: linear-gradient(145deg, var(--mode-a), var(--mode-b));
        }
        .merge-mode-copy {
          display: grid;
          gap: 3px;
          min-width: 0;
        }
        .merge-mode-copy strong {
          overflow: hidden;
          font-size: 13px;
          line-height: 1.1;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .merge-mode-copy small {
          overflow: hidden;
          color: rgba(188, 201, 222, 0.78);
          font-size: 10px;
          font-weight: 800;
          line-height: 1;
          text-overflow: ellipsis;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .merge-mode-card.is-active .merge-mode-copy small {
          color: color-mix(in srgb, var(--mode-a) 68%, white);
        }
        .merge-mode-check {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.15);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }
        .merge-mode-card.is-active .merge-mode-check {
          background: linear-gradient(135deg, var(--mode-a), var(--mode-b));
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--mode-a) 16%, transparent), 0 0 14px color-mix(in srgb, var(--mode-a) 32%, transparent);
        }
        .merge-mode-caption {
          margin: 0;
          font-size: 13px;
          line-height: 1.4;
          text-align: right;
        }
        .merge-stage-shell {
          border-radius: 24px;
          border: 1px solid rgba(139, 224, 207, 0.24);
          padding: 16px;
          background:
            linear-gradient(135deg, rgba(27, 74, 70, 0.36), rgba(62, 42, 57, 0.24) 52%, rgba(77, 63, 33, 0.2)),
            rgba(7, 12, 18, 0.42);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 24px 60px rgba(0, 0, 0, 0.28);
        }
        .merge-top-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }
        .merge-top-stats .tetris-stat {
          gap: 4px;
          padding: 10px 12px;
          border-radius: 14px;
        }
        .tetris-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .tetris-stat {
          display: grid;
          gap: 6px;
          min-width: 0;
          padding: 13px 14px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
        }
        .merge-fever-stat,
        .merge-pressure-stat {
          transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
        }
        .merge-fever-stat.is-active {
          border-color: rgba(255, 213, 74, 0.58);
          background: rgba(255, 213, 74, 0.12);
          box-shadow: 0 0 22px rgba(255, 213, 74, 0.12);
        }
        .merge-pressure-stat.is-active {
          border-color: rgba(245, 104, 106, 0.52);
          background: rgba(245, 104, 106, 0.1);
          box-shadow: 0 0 20px rgba(245, 104, 106, 0.1);
        }
        .merge-shake-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 106px;
        }
        .merge-shake-button strong {
          min-width: 34px;
          padding: 3px 7px;
          border-radius: 999px;
          color: rgba(237, 245, 255, 0.82);
          background: rgba(255, 255, 255, 0.08);
          font-size: 11px;
          line-height: 1;
          text-align: center;
        }
        .merge-shake-button.is-ready strong {
          color: #261713;
          background: linear-gradient(135deg, #ffd54a, #8affc7);
          box-shadow: 0 0 0 3px rgba(255, 213, 74, 0.13);
        }
        .merge-shake-button:disabled {
          cursor: not-allowed;
        }
        .merge-dashboard-panel {
          display: grid;
          gap: 12px;
          align-content: start;
        }
        .merge-side-utility-grid {
          display: grid;
          grid-template-columns: minmax(176px, 0.88fr) minmax(204px, 1.12fr);
          gap: 10px;
          align-items: stretch;
        }
        .merge-shake-card {
          display: grid;
          align-content: space-between;
          gap: 9px;
          padding: 12px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.065), rgba(255, 255, 255, 0.025)),
            rgba(9, 17, 29, 0.54);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
          transition: border-color 160ms ease, background 160ms ease, opacity 160ms ease;
        }
        .merge-shake-card.is-ready {
          border-color: rgba(255, 213, 74, 0.56);
          background:
            linear-gradient(135deg, rgba(255, 213, 74, 0.16), rgba(138, 255, 199, 0.09)),
            rgba(16, 24, 27, 0.72);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 0 24px rgba(255, 213, 74, 0.1);
        }
        .merge-shake-card.is-spent {
          opacity: 0.72;
        }
        .merge-shake-card-head,
        .merge-shake-card-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .merge-shake-card-head span {
          color: rgba(178, 192, 215, 0.84);
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          text-transform: uppercase;
        }
        .merge-shake-card-head strong {
          color: rgba(244, 248, 255, 0.96);
          font-size: 22px;
          line-height: 1;
        }
        .merge-shake-card-foot span {
          color: rgba(222, 232, 246, 0.8);
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
        }
        .merge-shake-pips {
          display: flex;
          gap: 5px;
        }
        .merge-shake-pips span {
          width: 34px;
          height: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }
        .merge-shake-pips span.is-full {
          background: linear-gradient(90deg, #ffd54a, #8affc7);
          box-shadow: 0 0 0 3px rgba(255, 213, 74, 0.11), 0 0 16px rgba(138, 255, 199, 0.18);
        }
        .merge-shake-progress {
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }
        .merge-shake-progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #8affc7, #ffd54a);
          transition: width 180ms ease;
        }
        .merge-idle-stat {
          transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
        }
        .merge-idle-stat.is-warning {
          border-color: rgba(255, 183, 102, 0.62);
          background: rgba(255, 118, 78, 0.12);
          box-shadow: 0 0 0 1px rgba(255, 183, 102, 0.1), 0 0 24px rgba(255, 118, 78, 0.14);
        }
        .merge-idle-warning {
          position: absolute;
          left: 50%;
          top: 68px;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 10px;
          width: min(360px, calc(100% - 32px));
          transform: translateX(-50%);
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 198, 116, 0.62);
          color: #fff6df;
          background: rgba(56, 23, 14, 0.72);
          box-shadow: 0 10px 34px rgba(0, 0, 0, 0.28), 0 0 26px rgba(255, 143, 79, 0.22);
          pointer-events: none;
          backdrop-filter: blur(8px);
          animation: idlePulse 0.72s ease-in-out infinite alternate;
        }
        .merge-idle-warning strong {
          min-width: 40px;
          font-size: 22px;
          line-height: 1;
          color: #ffd54a;
        }
        .merge-idle-warning span {
          min-width: 0;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.25;
        }
        .merge-fever-banner {
          position: absolute;
          left: 50%;
          top: 18px;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 8px;
          transform: translateX(-50%);
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 213, 74, 0.58);
          color: #2b1b12;
          background: linear-gradient(135deg, #ffd54a, #8affc7);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24), 0 0 28px rgba(255, 213, 74, 0.18);
          pointer-events: none;
        }
        .merge-fever-banner strong,
        .merge-fever-banner span {
          font-size: 12px;
          font-weight: 900;
          line-height: 1;
        }
        .merge-board-frame {
          position: relative;
          width: 100%;
          margin: 0 auto;
          min-height: 620px;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid rgba(139, 224, 207, 0.34);
          background: #0b1018;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -26px 44px rgba(255, 177, 91, 0.08),
            0 18px 44px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(245, 104, 106, 0.08);
          touch-action: manipulation;
          user-select: none;
          -webkit-user-select: none;
          -ms-user-select: none;
        }
        .merge-board-frame * {
          user-select: none;
          -webkit-user-select: none;
          -ms-user-select: none;
        }
        .merge-state-overlay {
          position: absolute;
          inset: 0;
          z-index: 4;
          display: grid;
          place-items: center;
          padding: 18px;
          background:
            linear-gradient(180deg, rgba(7, 11, 18, 0.48), rgba(7, 11, 18, 0.62)),
            rgba(7, 11, 18, 0.28);
          backdrop-filter: blur(3px);
        }
        .merge-state-card {
          display: grid;
          gap: 10px;
          width: min(430px, 100%);
          padding: 18px;
          border-radius: 18px;
          border: 1px solid rgba(139, 224, 207, 0.36);
          color: rgba(244, 248, 255, 0.96);
          background:
            linear-gradient(135deg, rgba(26, 65, 62, 0.86), rgba(38, 27, 39, 0.78)),
            rgba(10, 18, 31, 0.9);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 24px 70px rgba(0, 0, 0, 0.46),
            0 0 42px rgba(139, 224, 207, 0.12);
          text-align: center;
        }
        .merge-state-title {
          font-size: 20px;
          line-height: 1.1;
        }
        .merge-gameover-card {
          gap: 12px;
          border-color: rgba(255, 213, 126, 0.52);
          background:
            linear-gradient(135deg, rgba(72, 49, 38, 0.9), rgba(20, 40, 44, 0.9)),
            rgba(10, 18, 31, 0.92);
          text-align: left;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 24px 70px rgba(0, 0, 0, 0.48),
            0 0 46px rgba(255, 213, 126, 0.13);
        }
        .merge-gameover-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 12px;
        }
        .merge-gameover-head span {
          color: #fff4c7;
          font-size: 20px;
          font-weight: 900;
          line-height: 1.05;
        }
        .merge-gameover-head strong {
          color: #ffd54a;
          font-size: 46px;
          line-height: 0.9;
          text-shadow: 0 0 24px rgba(255, 213, 74, 0.26);
        }
        .merge-gameover-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }
        .merge-gameover-stats div {
          display: grid;
          gap: 4px;
          min-width: 0;
          padding: 10px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
        }
        .merge-gameover-stats span {
          color: rgba(196, 209, 229, 0.84);
          font-size: 11px;
          font-weight: 800;
          line-height: 1;
          text-transform: uppercase;
        }
        .merge-gameover-stats strong {
          overflow: hidden;
          color: rgba(247, 250, 255, 0.98);
          font-size: 18px;
          line-height: 1;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .merge-gameover-form {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
          align-items: stretch;
        }
        .merge-gameover-input {
          min-width: 0;
        }
        .merge-gameover-form button {
          min-width: 96px;
        }
        .merge-submit-message {
          margin: -2px 0 0;
          color: rgba(223, 234, 248, 0.86);
          font-size: 12px;
          font-weight: 800;
          line-height: 1.3;
        }
        .merge-gameover-locked {
          display: grid;
          gap: 5px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 213, 126, 0.22);
          color: rgba(244, 248, 255, 0.9);
          background: rgba(255, 213, 126, 0.07);
          text-align: center;
        }
        .merge-gameover-locked strong {
          color: #fff4c7;
          font-size: 13px;
          line-height: 1;
        }
        .merge-gameover-locked span {
          color: rgba(213, 225, 241, 0.76);
          font-size: 12px;
          font-weight: 800;
          line-height: 1.25;
        }
        .merge-gameover-restart {
          justify-self: stretch;
        }
        .merge-floating-score {
          position: absolute;
          color: #ffd54a;
          font-weight: 700;
          line-height: 1;
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
          -webkit-user-select: none;
          -ms-user-select: none;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.38);
          animation: floatUp 0.8s ease forwards;
        }
        .merge-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .merge-evolution-panel {
          display: grid;
          gap: 12px;
          align-content: start;
          overflow: hidden;
        }
        .merge-evolution-count {
          flex: none;
          padding: 5px 9px;
          border-radius: 999px;
          border: 1px solid rgba(139, 224, 207, 0.3);
          color: #d9fff2;
          background: rgba(17, 45, 43, 0.62);
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .merge-evolution-track {
          position: relative;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          padding: 2px 0;
        }
        .merge-evolution-step {
          position: relative;
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr);
          align-items: center;
          gap: 8px;
          min-height: 62px;
          padding: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.025)),
            rgba(9, 17, 29, 0.42);
          transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
        }
        .merge-evolution-step::before {
          display: none;
        }
        .merge-evolution-step.is-unlocked::before,
        .merge-evolution-step.is-next::before {
          background: linear-gradient(180deg, rgba(139, 224, 207, 0.2), rgba(255, 197, 109, 0.78));
          box-shadow: 0 0 12px rgba(255, 197, 109, 0.2);
        }
        .merge-evolution-step.is-unlocked {
          border-color: rgba(139, 224, 207, 0.24);
          background:
            linear-gradient(135deg, rgba(139, 224, 207, 0.13), rgba(255, 197, 109, 0.055)),
            rgba(9, 22, 26, 0.58);
        }
        .merge-evolution-step.is-active {
          border-color: rgba(255, 213, 126, 0.72);
          background:
            linear-gradient(135deg, rgba(255, 213, 126, 0.22), rgba(245, 104, 106, 0.11)),
            rgba(21, 20, 23, 0.72);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 0 24px rgba(255, 197, 109, 0.12);
        }
        .merge-evolution-step.is-locked {
          opacity: 0.58;
        }
        .merge-evolution-step.is-next {
          border-color: rgba(255, 197, 109, 0.28);
        }
        .merge-evolution-node {
          position: relative;
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background:
            linear-gradient(145deg, rgba(139, 224, 207, 0.2), rgba(245, 104, 106, 0.1)),
            rgba(7, 14, 22, 0.72);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            0 10px 24px rgba(0, 0, 0, 0.22);
        }
        .merge-evolution-step.is-active .merge-evolution-node {
          border-color: rgba(255, 213, 126, 0.74);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            0 0 0 3px rgba(255, 213, 126, 0.1),
            0 12px 28px rgba(0, 0, 0, 0.26);
        }
        .merge-evolution-node img {
          display: block;
          width: 34px;
          height: 34px;
          object-fit: cover;
          border-radius: 12px;
          filter: saturate(0.78) brightness(0.82);
        }
        .merge-evolution-step.is-unlocked .merge-evolution-node img,
        .merge-evolution-step.is-next .merge-evolution-node img {
          filter: saturate(1.08) brightness(1);
        }
        .merge-evolution-step.is-active .merge-evolution-node img {
          filter: saturate(1.22) brightness(1.08);
        }
        .merge-evolution-level {
          position: absolute;
          left: -5px;
          top: -6px;
          z-index: 1;
          min-width: 24px;
          padding: 3px 4px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: #fff4c7;
          background: rgba(36, 25, 24, 0.82);
          font-size: 9px;
          font-weight: 900;
          line-height: 1;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
        }
        .merge-evolution-meta {
          display: grid;
          gap: 3px;
          min-width: 0;
        }
        .merge-evolution-meta strong {
          overflow: hidden;
          color: rgba(244, 248, 255, 0.96);
          font-size: 12px;
          line-height: 1.15;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .merge-evolution-meta span {
          color: rgba(178, 192, 215, 0.8);
          font-size: 10px;
          font-weight: 700;
          line-height: 1;
        }
        .merge-evolution-state {
          position: absolute;
          right: 8px;
          top: 8px;
          width: 11px;
          height: 11px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }
        .merge-evolution-step.is-unlocked .merge-evolution-state {
          background: #8be0cf;
          box-shadow: 0 0 0 3px rgba(139, 224, 207, 0.12), 0 0 16px rgba(139, 224, 207, 0.22);
        }
        .merge-evolution-step.is-active .merge-evolution-state {
          width: 16px;
          height: 16px;
          background: radial-gradient(circle at 35% 35%, #fff4c7, #ffd54a 42%, #f5686a 100%);
          box-shadow: 0 0 0 4px rgba(255, 213, 126, 0.14), 0 0 20px rgba(255, 213, 126, 0.32);
        }
        .merge-evolution-step.is-next .merge-evolution-state {
          background: #ffc56d;
          box-shadow: 0 0 0 3px rgba(255, 197, 109, 0.12);
        }
        .merge-next-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 7px;
        }
        .merge-next-panel {
          display: grid;
          gap: 9px;
          min-width: 0;
          padding: 12px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
            rgba(9, 17, 29, 0.46);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }
        .merge-next-card {
          display: grid;
          justify-items: center;
          align-content: center;
          gap: 5px;
          min-width: 0;
          min-height: 82px;
          padding: 8px 5px;
          border-radius: 10px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          font-size: 11px;
          font-weight: 800;
          line-height: 1.1;
        }
        .merge-next-card span {
          overflow: hidden;
          max-width: 100%;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .merge-controls-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .merge-controls-grid span {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          border: 1px solid rgba(122,165,220,0.25);
          border-radius: 10px;
          padding: 10px 12px;
          color: rgba(230,240,255,0.85);
          background: rgba(10,18,34,0.45);
          font-size: 13px;
          font-weight: 800;
          line-height: 1.1;
        }
        .merge-controls-grid kbd {
          flex: none;
          min-width: 28px;
          padding: 4px 6px;
          border: 1px solid rgba(139, 224, 207, 0.22);
          border-radius: 7px;
          color: rgba(244, 248, 255, 0.95);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)),
            rgba(9, 17, 29, 0.72);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
          font-family: inherit;
          font-size: 11px;
          font-weight: 900;
          line-height: 1;
          text-align: center;
        }
        .tetris-side-stack {
          align-self: start;
          min-width: 0;
          width: 100%;
        }
        @media (max-width: 1200px) {
          .merge-game-layout {
            grid-template-columns: minmax(0, 640px) minmax(360px, 1fr);
          }
        }
        @media (max-width: 1040px) {
          .merge-game-layout {
            grid-template-columns: minmax(0, 620px) minmax(300px, 1fr);
          }
          .tetris-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .merge-side-utility-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 980px) {
          .merge-game-layout {
            grid-template-columns: minmax(0, 720px);
            justify-content: center;
          }
        }
        @media (max-width: 760px) {
          .merge-intro {
            grid-template-columns: 1fr;
          }
          .merge-game-layout {
            grid-template-columns: 1fr;
          }
          .merge-mode-panel {
            justify-items: stretch;
          }
          .merge-mode-selector {
            width: 100%;
          }
          .merge-mode-card {
            grid-template-columns: 1fr;
            justify-items: center;
            min-height: 82px;
            padding: 10px 8px;
            text-align: center;
          }
          .merge-mode-check {
            position: absolute;
            right: 8px;
            top: 8px;
          }
          .merge-mode-caption {
            text-align: left;
          }
          .tetris-stats-grid,
          .merge-controls-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 560px) {
          .merge-top-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 430px) {
          .merge-mode-selector {
            grid-template-columns: 1fr;
          }
          .merge-mode-card {
            grid-template-columns: 36px minmax(0, 1fr) 12px;
            justify-items: initial;
            min-height: 60px;
            text-align: left;
          }
          .merge-mode-check {
            position: static;
          }
          .merge-state-overlay {
            padding: 12px;
          }
          .merge-state-card {
            padding: 14px;
          }
          .merge-gameover-head {
            align-items: start;
          }
          .merge-gameover-head span {
            font-size: 17px;
          }
          .merge-gameover-head strong {
            font-size: 38px;
          }
          .merge-gameover-form {
            grid-template-columns: 1fr;
          }
          .merge-gameover-form button {
            width: 100%;
          }
          .tetris-stats-grid,
          .merge-controls-grid,
          .merge-side-utility-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
