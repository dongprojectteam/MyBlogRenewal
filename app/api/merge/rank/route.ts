import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RankRecord = {
  id: string;
  nickname: string;
  score: number;
  max_level: number;
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

export async function GET() {
  try {
    if (!hasSupabaseEnv()) {
      return NextResponse.json({ ranks: [...FALLBACK].sort((a, b) => b.score - a.score).slice(0, 10) });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("id,nickname,score,max_level,created_at")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) throw error;
    return NextResponse.json({ ranks: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch ranks.";
    return NextResponse.json({ error: message, ranks: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { nickname?: string; score?: number; maxLevel?: number };
    const nickname = cleanNickname(body.nickname ?? "");
    const score = int(body.score ?? 0, 0, 99_999_999);
    const maxLevel = int(body.maxLevel ?? 1, 1, 10);

    if (nickname.length < 2) {
      return NextResponse.json({ error: "Nickname must be 2-10 chars." }, { status: 400 });
    }

    const payload: RankRecord = { id: randomUUID(), nickname, score, max_level: maxLevel };

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

