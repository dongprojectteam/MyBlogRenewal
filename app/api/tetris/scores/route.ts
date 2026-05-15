import { NextResponse } from "next/server";

import { getTetrisLeaderboardStats, getTetrisTopPercent, isTetrisMode, listTetrisScores, saveTetrisScore } from "@/lib/data";
import type { TetrisMode } from "@/types";

export const dynamic = "force-dynamic";

type ScorePayload = {
  playerName?: string;
  mode?: string;
  score?: number;
  lines?: number;
  level?: number;
  timeMs?: number;
  pieces?: number;
  seed?: number;
  dailyKey?: string | null;
};

function readMode(value: string | null): TetrisMode {
  return isTetrisMode(value) ? value : "marathon";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = readMode(url.searchParams.get("mode"));
  const dailyKey = url.searchParams.get("dailyKey");

  try {
    const [scores, stats] = await Promise.all([listTetrisScores(mode, dailyKey), getTetrisLeaderboardStats(mode, dailyKey)]);
    return NextResponse.json({ scores, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "테트리스 리더보드를 불러오지 못했습니다.";
    return NextResponse.json({ error: message, scores: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let payload: ScorePayload;

  try {
    payload = (await request.json()) as ScorePayload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!isTetrisMode(payload.mode)) {
    return NextResponse.json({ error: "지원하지 않는 테트리스 모드입니다." }, { status: 400 });
  }

  try {
    const result = await saveTetrisScore({
      playerName: String(payload.playerName ?? ""),
      mode: payload.mode,
      score: Number(payload.score ?? 0),
      lines: Number(payload.lines ?? 0),
      level: Number(payload.level ?? 1),
      timeMs: Number(payload.timeMs ?? 0),
      pieces: Number(payload.pieces ?? 0),
      seed: Number(payload.seed ?? 0),
      dailyKey: payload.dailyKey ?? null,
    });

    const topPercent = await getTetrisTopPercent(result.score, payload.mode, payload.dailyKey ?? null);
    return NextResponse.json({ ...result, topPercent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "테트리스 기록을 저장하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
