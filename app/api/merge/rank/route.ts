import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase";

type GameMode = "endless" | "whale-rush" | "time-attack";
type GameResult = "win" | "lose" | "timeout" | "idle";

const VALID_MODES: GameMode[] = ["endless", "whale-rush", "time-attack"];
const VALID_RESULTS: GameResult[] = ["win", "lose", "timeout", "idle"];

type RankRecord = {
  id: string;
  nickname: string;
  mode: GameMode;
  score: number;
  max_level: number;
  elapsed_sec: number;
  pieces: number;
  seed: number;
  result: GameResult;
  created_at?: string;
};

const TABLE = "animal_merge_ranks";
const FALLBACK: RankRecord[] = [];

function cleanNickname(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 10);
}

function int(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function cleanMode(value: string): GameMode {
  if (VALID_MODES.includes(value as GameMode)) return value as GameMode;
  return "endless";
}

function isValidMode(value: string | null | undefined): value is GameMode {
  return Boolean(value && VALID_MODES.includes(value as GameMode));
}

function cleanResult(value: string | null | undefined, mode: GameMode, maxLevel: number): GameResult {
  if (value && VALID_RESULTS.includes(value as GameResult)) return value as GameResult;
  if (mode === "whale-rush" && maxLevel >= 10) return "win";
  if (mode === "time-attack") return "timeout";
  return "lose";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const modeParam = url.searchParams.get("mode");
    if (modeParam && !isValidMode(modeParam)) {
      return NextResponse.json({ error: "Invalid game mode.", ranks: [] }, { status: 400 });
    }
    const mode = modeParam ?? "endless";

    if (!hasSupabaseEnv()) {
      const ranks = [...FALLBACK]
        .filter((item) => item.mode === mode && (mode !== "whale-rush" || item.result === "win"))
        .sort(sortRanks)
        .slice(0, 10);
      return NextResponse.json({ ranks });
    }

    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from(TABLE)
      .select("id,nickname,mode,score,max_level,elapsed_sec,pieces,seed,result,created_at")
      .eq("mode", mode);

    if (mode === "whale-rush") {
      query = query.eq("result", "win").order("elapsed_sec", { ascending: true }).order("score", { ascending: false });
    } else {
      query = query.order("score", { ascending: false }).order("max_level", { ascending: false }).order("created_at", { ascending: true });
    }

    const { data, error } = await query.limit(10);

    if (error) throw error;
    return NextResponse.json({ ranks: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch ranks.";
    return NextResponse.json({ error: message, ranks: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      nickname?: string;
      mode?: string;
      score?: number;
      maxLevel?: number;
      elapsedSec?: number;
      pieces?: number;
      seed?: number;
      result?: string | null;
    };
    const nickname = cleanNickname(body.nickname ?? "");
    if (!isValidMode(body.mode)) {
      return NextResponse.json({ error: "Invalid game mode." }, { status: 400 });
    }
    const mode = body.mode;
    const score = int(body.score ?? 0, 0, 99_999_999);
    const maxLevel = int(body.maxLevel ?? 1, 1, 10);
    const elapsedSec = int(body.elapsedSec ?? 0, 0, 86_400);
    const pieces = int(body.pieces ?? 0, 0, 99_999);
    const seed = int(body.seed ?? 0, 0, 2_147_483_647);
    const result = cleanResult(body.result, mode, maxLevel);

    if (nickname.length < 2) {
      return NextResponse.json({ error: "Nickname must be 2-10 chars." }, { status: 400 });
    }

    if (score <= 0 || pieces <= 0) {
      return NextResponse.json({ error: "Only completed scoring runs can be ranked." }, { status: 400 });
    }

    if (mode === "whale-rush" && (result !== "win" || maxLevel < 10)) {
      return NextResponse.json({ error: "Only cleared Whale Rush runs can be ranked." }, { status: 400 });
    }

    const payload: RankRecord = {
      id: randomUUID(),
      nickname,
      mode,
      score,
      max_level: maxLevel,
      elapsed_sec: elapsedSec,
      pieces,
      seed,
      result,
    };

    if (!hasSupabaseEnv()) {
      FALLBACK.push(payload);
      return NextResponse.json({ saved: false, rank: payload });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.from(TABLE).insert([payload]).select("*").single();
    if (error) throw error;

    return NextResponse.json({ saved: true, rank: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save score.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function sortRanks(a: RankRecord, b: RankRecord) {
  if (a.mode === "whale-rush" && b.mode === "whale-rush") {
    if (a.result !== b.result) return a.result === "win" ? -1 : 1;
    if (a.elapsed_sec !== b.elapsed_sec) return a.elapsed_sec - b.elapsed_sec;
  }
  if (a.score !== b.score) return b.score - a.score;
  if (a.max_level !== b.max_level) return b.max_level - a.max_level;
  return (a.created_at ?? "").localeCompare(b.created_at ?? "");
}
