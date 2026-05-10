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

type Rank = { id: string; nickname: string; mode: GameMode; score: number; max_level: number; created_at?: string };

type FloatingCombo = { id: number; x: number; y: number; text: string };
type PreloadStatus = "idle" | "loading" | "ready" | "error";

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
const DROP_COOLDOWN_MS = 180;
const SPAWN_MERGE_PROTECT_MS = 260;
const DEFAULT_TIME_ATTACK_SEC = 90;

type GameMode = "endless" | "whale-rush" | "time-attack";

const GAME_MODES: Array<{ id: GameMode; label: string; description: string }> = [
  { id: "endless", label: "Endless", description: "무제한 모드: 언제까지든 버텨보세요." },
  { id: "whale-rush", label: "Whale Rush", description: "빠르게 10 Whale을 달성하세요." },
  { id: "time-attack", label: "Time Attack", description: "정해진 시간 내 최고 점수를 노리세요." },
];

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
  return Math.min(spawnCap, Math.max(1, Math.floor(random() * Math.min(maxUnlocked + 1, spawnCap)) + 1));
}

export function MergeClient() {
  const BOARD = { top: 78, left: 64, right: 64, bottom: 606 };
  const DEADLINE_RATIO = 0.9;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const runnerRef = useRef<Runner | null>(null);
  const bodiesRef = useRef<Map<number, Matter.Body>>(new Map());
  const pendingRef = useRef<{ level: number; x: number; y: number }[]>([]);
  const dropLevelRef = useRef(1);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const mergeAtRef = useRef(0);
  const shakeUsedRef = useRef(false);
  const deadlineTouchesRef = useRef<Map<number, number>>(new Map());
  const latestDroppedBodyIdRef = useRef<number | null>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const mergeAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastDropAtRef = useRef(0);
  const rngRef = useRef<() => number>(() => Math.random());

  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [maxLevel, setMaxLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>("endless");
  const [gameResult, setGameResult] = useState<"win" | "lose" | "timeout" | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [nickname, setNickname] = useState("");
  const [ranks, setRanks] = useState<Rank[]>([]);
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
  const [seed, setSeed] = useState<number>(0);

  const modeConfig = useMemo(() => {
    switch (gameMode) {
      case "whale-rush":
        return { label: "Whale Rush", spawnCap: 4, targetLevel: 10, timeLimitSec: 0 };
      case "time-attack":
        return { label: "Time Attack", spawnCap: 4, targetLevel: null, timeLimitSec: DEFAULT_TIME_ATTACK_SEC };
      default:
        return { label: "Endless", spawnCap: 4, targetLevel: null, timeLimitSec: 0 };
    }
  }, [gameMode]);

  const timeRemaining = modeConfig.timeLimitSec ? Math.max(0, modeConfig.timeLimitSec - elapsedSec) : 0;

  useEffect(() => {
    const savedBest = Number(window.localStorage.getItem(BEST_KEY) ?? "0");
    setHighScore(Number.isFinite(savedBest) ? savedBest : 0);
    void fetchRanks();
    void preloadAssets();
  }, []);

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

    const engine = Engine.create({ gravity: { x: 0, y: 0.7 } });
    const world = engine.world;
    const width = host.clientWidth;
    const height = 620;
    canvas.width = width;
    canvas.height = height;

    const pitWidth = width - BOARD.left - BOARD.right;
    const floor = Matter.Bodies.rectangle(width / 2, BOARD.bottom + 18, pitWidth, 36, { isStatic: true, label: "wall" });
    const left = Matter.Bodies.rectangle(BOARD.left - 16, (BOARD.top + BOARD.bottom) / 2, 32, BOARD.bottom - BOARD.top + 60, {
      isStatic: true,
      label: "wall",
    });
    const right = Matter.Bodies.rectangle(width - BOARD.right + 16, (BOARD.top + BOARD.bottom) / 2, 32, BOARD.bottom - BOARD.top + 60, {
      isStatic: true,
      label: "wall",
    });
    const deadlineY = BOARD.top + (BOARD.bottom - BOARD.top) * (1 - DEADLINE_RATIO);
    const topSensor = Matter.Bodies.rectangle(width / 2, deadlineY, pitWidth - 8, 8, { isSensor: true, isStatic: true, label: "deadline" });
    World.add(world, [floor, left, right, topSensor]);

    engineRef.current = engine;
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);

    const handler = Events.on(engine, "collisionStart", (evt) => {
      for (const pair of evt.pairs) {
        const { bodyA, bodyB } = pair;
        const aLevel = Number(bodyA.plugin.level ?? 0);
        const bLevel = Number(bodyB.plugin.level ?? 0);
        const deadlineA = bodyA.label === "deadline" && bLevel > 0 ? bodyB : null;
        const deadlineB = bodyB.label === "deadline" && aLevel > 0 ? bodyA : null;
        if (deadlineA) {
          if (latestDroppedBodyIdRef.current === deadlineA.id) continue;
          if (!deadlineTouchesRef.current.has(deadlineA.id)) {
            deadlineTouchesRef.current.set(deadlineA.id, performance.now());
          }
          continue;
        }
        if (deadlineB) {
          if (latestDroppedBodyIdRef.current === deadlineB.id) continue;
          if (!deadlineTouchesRef.current.has(deadlineB.id)) {
            deadlineTouchesRef.current.set(deadlineB.id, performance.now());
          }
          continue;
        }

        const latestId = latestDroppedBodyIdRef.current;
        if (latestId !== null && (bodyA.id === latestId || bodyB.id === latestId)) {
          latestDroppedBodyIdRef.current = null;
        }

        if (aLevel === 0 || bLevel === 0 || aLevel !== bLevel || aLevel >= 10) continue;
        const nowMs = performance.now();
        const aProtectedUntil = Number(bodyA.plugin.protectedUntil ?? 0);
        const bProtectedUntil = Number(bodyB.plugin.protectedUntil ?? 0);
        if (aProtectedUntil > nowMs || bProtectedUntil > nowMs) continue;
        if (bodyA.plugin.merged || bodyB.plugin.merged) continue;
        bodyA.plugin.merged = true;
        bodyB.plugin.merged = true;

        const x = (bodyA.position.x + bodyB.position.x) / 2;
        const y = (bodyA.position.y + bodyB.position.y) / 2;
        pendingRef.current.push({ level: aLevel + 1, x, y });
        Composite.remove(world, bodyA);
        Composite.remove(world, bodyB);

        const now = Date.now();
        comboRef.current = now - mergeAtRef.current <= 2000 ? comboRef.current + 1 : 1;
        mergeAtRef.current = now;
        setCombo(comboRef.current);

        const animal = ANIMALS[aLevel - 1];
        const earned = Math.round(animal.score * (1 + comboRef.current * 0.5));
        scoreRef.current += earned;
        setScore(scoreRef.current);
        setMaxLevel((prev) => Math.max(prev, aLevel + 1));

        const id = Date.now() + Math.random();
        setFloating((prev) => [...prev, { id, x, y, text: `+${earned} x${comboRef.current}` }]);
        window.setTimeout(() => setFloating((prev) => prev.filter((item) => item.id !== id)), 800);

        const audio = mergeAudioRef.current?.cloneNode(true);
        if (audio instanceof HTMLAudioElement) {
          audio.volume = 0.45;
          void audio.play().catch(() => undefined);
        }
      }
    });
    const endHandler = Events.on(engine, "collisionEnd", (evt) => {
      for (const pair of evt.pairs) {
        const { bodyA, bodyB } = pair;
        const aLevel = Number(bodyA.plugin.level ?? 0);
        const bLevel = Number(bodyB.plugin.level ?? 0);
        if (bodyA.label === "deadline" && bLevel > 0) {
          deadlineTouchesRef.current.delete(bodyB.id);
        }
        if (bodyB.label === "deadline" && aLevel > 0) {
          deadlineTouchesRef.current.delete(bodyA.id);
        }
      }
    });

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx || !engineRef.current) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(12,18,30,0.45)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const pitWidth = canvas.width - BOARD.left - BOARD.right;
      const pitX = BOARD.left;
      const wallTop = BOARD.top - 4;
      const wallHeight = BOARD.bottom - BOARD.top + 10;
      const deadlineY = BOARD.top + (BOARD.bottom - BOARD.top) * (1 - DEADLINE_RATIO);

      // Side wall rails
      ctx.fillStyle = "rgba(120,190,255,0.16)";
      ctx.fillRect(pitX - 8, wallTop, 8, wallHeight);
      ctx.fillRect(pitX + pitWidth, wallTop, 8, wallHeight);

      // Side wall glow/highlight
      const leftGlow = ctx.createLinearGradient(pitX - 8, 0, pitX + 2, 0);
      leftGlow.addColorStop(0, "rgba(150,220,255,0.28)");
      leftGlow.addColorStop(1, "rgba(150,220,255,0)");
      ctx.fillStyle = leftGlow;
      ctx.fillRect(pitX - 8, wallTop, 10, wallHeight);

      const rightGlow = ctx.createLinearGradient(pitX + pitWidth - 2, 0, pitX + pitWidth + 8, 0);
      rightGlow.addColorStop(0, "rgba(150,220,255,0)");
      rightGlow.addColorStop(1, "rgba(150,220,255,0.28)");
      ctx.fillStyle = rightGlow;
      ctx.fillRect(pitX + pitWidth - 2, wallTop, 10, wallHeight);

      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "rgba(255,120,120,0.8)";
      ctx.beginPath();
      ctx.moveTo(pitX + 6, deadlineY);
      ctx.lineTo(pitX + pitWidth - 6, deadlineY);
      ctx.stroke();
      ctx.setLineDash([]);

      while (pendingRef.current.length > 0) {
        const next = pendingRef.current.shift();
        if (!next) break;
        spawnBody(next.level, next.x, next.y, true);
      }

      for (const body of Composite.allBodies(engineRef.current.world)) {
        const level = Number(body.plugin.level ?? 0);
        if (level <= 0) continue;
        const animal = ANIMALS[level - 1];
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        const img = imagesRef.current.get(animal.image);
        if (!img) {
          ctx.restore();
          continue;
        }
        const size = animal.radius * 2;
        ctx.beginPath();
        ctx.arc(0, 0, animal.radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, -animal.radius, -animal.radius, size, size);
        ctx.restore();
      }

      if (!isGameOver && !isPaused) {
        const now = performance.now();
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

        const runtimeSec = startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current) / 1000) : 0;
        if (modeConfig.targetLevel && maxLevel >= modeConfig.targetLevel) {
          setGameResult("win");
          setIsGameOver(true);
        } else if (modeConfig.timeLimitSec && runtimeSec >= modeConfig.timeLimitSec) {
          setGameResult("timeout");
          setIsGameOver(true);
        } else if (shouldEnd) {
          setGameResult("lose");
          setIsGameOver(true);
        }
      }

      requestAnimationFrame(draw);
    };

    const resize = () => {
      if (!hostRef.current || !canvasRef.current) return;
      const w = hostRef.current.clientWidth;
      canvasRef.current.width = w;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    draw();

    return () => {
      observer.disconnect();
      Events.off(engine, "collisionStart", handler);
      Events.off(engine, "collisionEnd", endHandler);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      engineRef.current = null;
      runnerRef.current = null;
      bodiesRef.current.clear();
      deadlineTouchesRef.current.clear();
      latestDroppedBodyIdRef.current = null;
    };
  }, [started, gameKey, isGameOver, isPaused]);

  function spawnBody(level: number, x: number, y = 100, fromMerge = false) {
    const engine = engineRef.current;
    if (!engine) return;
    const animal = ANIMALS[level - 1];
    const body = Matter.Bodies.circle(x, y, animal.radius, {
      restitution: animal.restitution,
      friction: animal.friction,
      density: animal.density,
      label: "animal",
      plugin: { level, merged: false, protectedUntil: performance.now() + SPAWN_MERGE_PROTECT_MS },
    });
    World.add(engine.world, body);
    bodiesRef.current.set(body.id, body);
    if (!fromMerge) {
      latestDroppedBodyIdRef.current = body.id;
    }
    if (fromMerge) Body.scale(body, 1.15, 1.15);
  }

  function dropAt(clientX: number) {
    if (!started || isGameOver || isPaused) return;
    const now = performance.now();
    if (now - lastDropAtRef.current < DROP_COOLDOWN_MS) return;
    lastDropAtRef.current = now;
    setDropReady(false);
    window.setTimeout(() => setDropReady(true), DROP_COOLDOWN_MS);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(BOARD.left + 24, Math.min(rect.width - BOARD.right - 24, clientX - rect.left));
    spawnBody(dropLevelRef.current, x, BOARD.top + 18);
    setPieces((v) => v + 1);
    const nextCurrent = nextQueue[0] ?? 1;
    const appended = pickSpawnLevel(maxLevel, rngRef.current, modeConfig.spawnCap);
    const shifted = [...nextQueue.slice(1), appended];
    dropLevelRef.current = nextCurrent;
    setCurrentLevel(nextCurrent);
    setNextQueue(shifted);
    setScore((v) => v);
  }

  async function fetchRanks() {
    const res = await fetch("/api/merge/rank", { cache: "no-store" });
    const data = (await res.json()) as { ranks?: Rank[] };
    setRanks(data.ranks ?? []);
  }

  async function submitScore() {
    const name = nickname.trim();
    if (name.length < 2) return;
    await fetch("/api/merge/rank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: name, mode: gameMode, score, maxLevel }),
    });
    await fetchRanks();
  }

  function startGame() {
    if (preloadStatus !== "ready") return;
    setStarted(true);
    setIsGameOver(false);
    setGameResult(null);
    setIsPaused(false);
    setGameKey((v) => v + 1);
    setScore(0);
    scoreRef.current = 0;
    comboRef.current = 0;
    setCombo(0);
    setMaxLevel(1);
    setPieces(0);
    setElapsedSec(0);
    setDropReady(true);
    lastDropAtRef.current = 0;
    startedAtRef.current = Date.now();
    shakeUsedRef.current = false;
    deadlineTouchesRef.current.clear();
    latestDroppedBodyIdRef.current = null;
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
      Runner.run(runner, engine);
      setIsPaused(false);
    } else {
      Runner.stop(runner);
      setIsPaused(true);
    }
  }

  function restartGame() {
    if (preloadStatus !== "ready") return;
    setStarted(true);
    setIsGameOver(false);
    setGameResult(null);
    setIsPaused(false);
    setGameKey((v) => v + 1);
    setScore(0);
    scoreRef.current = 0;
    comboRef.current = 0;
    setCombo(0);
    setMaxLevel(1);
    setPieces(0);
    setElapsedSec(0);
    setDropReady(true);
    lastDropAtRef.current = 0;
    startedAtRef.current = Date.now();
    shakeUsedRef.current = false;
    deadlineTouchesRef.current.clear();
    latestDroppedBodyIdRef.current = null;
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
    if (shakeUsedRef.current) return;
    const engine = engineRef.current;
    if (!engine) return;
    shakeUsedRef.current = true;
    for (const body of Composite.allBodies(engine.world)) {
      if (body.label !== "animal") continue;
      Body.applyForce(body, body.position, { x: (Math.random() - 0.5) * 0.03, y: -0.03 });
    }
  }

  useEffect(() => {
    if (!isGameOver) return;
    setHighScore((prev) => {
      const best = Math.max(prev, scoreRef.current);
      window.localStorage.setItem(BEST_KEY, String(best));
      return best;
    });
    const history = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? "[]") as Array<{ score: number; at: string }>;
    history.unshift({ score: scoreRef.current, at: new Date().toISOString() });
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  }, [isGameOver]);

  useEffect(() => {
    if (!started || isPaused || isGameOver) return;
    const id = window.setInterval(() => {
      if (!startedAtRef.current) return;
      setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)));
    }, 250);
    return () => window.clearInterval(id);
  }, [started, isPaused, isGameOver]);

  return (
    <section className="section" style={{ display: "grid", gap: 16 }}>
      <section className="panel" style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="eyebrow">utility / game</div>
          <h1 style={{ marginBottom: 4 }}>Animal Merge</h1>
          <p className="muted" style={{ marginBottom: 0 }}>
            같은 동물을 합쳐 진화시키고 콤보를 쌓아보세요. 데드라인에 3초 이상 쌓이면 게임이 종료됩니다.
          </p>
        </div>
        <div style={{ minWidth: 240, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {GAME_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={mode.id === gameMode ? "button" : "ghost-button"}
                onClick={() => !started && setGameMode(mode.id)}
                disabled={started}
                style={{ minWidth: 120 }}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.4, textAlign: "right" }}>
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

      <section style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 16 }}>
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
                <button className="ghost-button" type="button" onClick={shake} disabled={!started || isGameOver || isPaused}>
                  Shake
                </button>
              </div>
            </div>
          </div>
          <div className="merge-top-stats">
            <div className="tetris-stat"><span>Score</span><strong>{score}</strong></div>
            <div className="tetris-stat"><span>Time</span><strong>{elapsedSec}s</strong></div>
            <div className="tetris-stat"><span>Best</span><strong>{highScore}</strong></div>
          </div>

          <div className="merge-stage-shell">
            <div className="merge-board-frame" ref={hostRef}>
              <canvas ref={canvasRef} onClick={(e) => dropAt(e.clientX)} style={{ width: "100%", height: 620, borderRadius: 18, cursor: "crosshair" }} />
          {!started || isPaused || isGameOver ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                background: "rgba(7,11,18,0.42)",
                backdropFilter: "blur(2px)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  textAlign: "center",
                  padding: "16px 18px",
                  borderRadius: 14,
                  border: "1px solid rgba(145,218,255,0.45)",
                  background: "rgba(13,21,36,0.7)",
                }}
              >
                <strong style={{ fontSize: 20 }}>{!started ? "Ready" : isGameOver ? "Game Over" : "Paused"}</strong>
                <span className="muted" style={{ marginBottom: 4 }}>
                  {!started ? "Start Game을 눌러 동물 드롭을 시작하세요." : isGameOver ? "Restart로 새 판을 시작할 수 있습니다." : "Resume으로 게임을 이어서 진행하세요."}
                </span>
                {!started ? (
                  <button type="button" className="button" onClick={startGame} disabled={preloadStatus !== "ready"}>
                    Start
                  </button>
                ) : isPaused ? (
                  <button type="button" className="button" onClick={togglePause}>
                    Resume
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
              <div
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
              </div>
              {floating.map((item) => (
                <div key={item.id} style={{ position: "absolute", left: item.x - 40, top: item.y - 30, color: "#ffd54a", fontWeight: 700, animation: "floatUp 0.8s ease forwards" }}>{item.text}</div>
              ))}
            </div>
          </div>
        </div>
        <section className="panel tetris-side-panel" style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <h2 style={{ marginBottom: 0 }}>Global Leaderboard</h2>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {ranks.map((r) => (
              <li key={r.id}>
                {r.nickname} - {r.score}
              </li>
            ))}
          </ol>
        </section>
        </div>

        <aside className="tetris-side-stack">
          <section className="panel tetris-side-panel" style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <div className="tetris-status-line">
              <span className="tag neutral">{!started ? "Ready" : isGameOver ? "Game Over" : isPaused ? "Paused" : "Playing"}</span>
              <span className="muted">Seed {seed || "-"}</span>
            </div>
            <div className="tetris-stats-grid">
              <div className="tetris-stat"><span>Mode</span><strong>{modeConfig.label}</strong></div>
              <div className="tetris-stat"><span>Level</span><strong>{maxLevel}</strong></div>
              <div className="tetris-stat"><span>Combo</span><strong>{combo}</strong></div>
              <div className="tetris-stat"><span>Pieces</span><strong>{pieces}</strong></div>
              {modeConfig.timeLimitSec ? (
                <div className="tetris-stat"><span>Time left</span><strong>{timeRemaining}s</strong></div>
              ) : null}
            </div>
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
          </section>
          <section className="panel tetris-side-panel" style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <h2 style={{ marginBottom: 0 }}>Evolution</h2>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {ANIMALS.map((a) => (
              <li key={a.level} style={{ opacity: a.level <= maxLevel ? 1 : 0.4 }}>{a.name}</li>
            ))}
          </ol>
          </section>
          <section className="panel tetris-side-panel" style={{ display: "grid", gap: 10 }}>
            <h2 style={{ marginBottom: 0 }}>Controls</h2>
            <div className="merge-controls-grid">
              <span>🖱️ Drop</span>
              <span>📳 Shake</span>
              <span>⌨️ P Pause/Resume</span>
              <span>⌨️ R Restart</span>
            </div>
          </section>
        </aside>
      </section>

      {isGameOver ? (
        <section className="panel" style={{ display: "grid", gap: 8 }}>
          <h2 style={{ marginBottom: 0 }}>Game Over</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            {gameResult === "win" ? "Whale Rush Clear!" : gameResult === "timeout" ? "Time Up!" : "Final Score"} {score}. Submit your score to global leaderboard.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={10} placeholder="Nickname (2-10)" />
            <button type="button" className="button" onClick={submitScore}>Submit</button>
          </div>
        </section>
      ) : null}
      <style jsx>{`@keyframes floatUp { from { opacity: 1; transform: translateY(0);} to {opacity:0; transform: translateY(-22px);} }
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
        .merge-stage-shell {
          border-radius: 24px;
          border: 1px solid rgba(123, 187, 255, 0.2);
          padding: 18px;
          background: radial-gradient(110% 100% at 50% 0%, rgba(33, 74, 136, 0.2), rgba(5, 11, 22, 0.08));
        }
        .merge-top-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }
        .tetris-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .tetris-stat {
          display: grid;
          gap: 6px;
          padding: 14px 16px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
        }
        .merge-board-frame {
          position: relative;
          width: 100%;
          margin: 0 auto;
          min-height: 620px;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(107, 173, 248, 0.32);
          background: rgba(3, 10, 22, 0.92);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
        }
        .merge-next-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }
        .merge-next-card {
          display: grid;
          justify-items: center;
          gap: 6px;
          padding: 8px 6px;
          border-radius: 10px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          font-size: 12px;
        }
        .merge-controls-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .merge-controls-grid span {
          border: 1px solid rgba(122,165,220,0.25);
          border-radius: 10px;
          padding: 10px 12px;
          color: rgba(230,240,255,0.85);
          background: rgba(10,18,34,0.45);
        }
        .tetris-side-stack {
          align-self: start;
        }
        @media (max-width: 1200px) {
          .merge-top-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 980px) { section > section:nth-child(2) { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}


