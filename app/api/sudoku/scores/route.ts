import { NextResponse } from "next/server";

import { listSudokuScores, saveSudokuScore } from "@/lib/data";
import { isSudokuLevelId } from "@/lib/sudoku/level-profiles";

export const dynamic = "force-dynamic";

type ScorePayload = {
  playerName?: string;
  levelId?: number;
  timeMs?: number;
  seed?: number;
  puzzle?: string;
  playerGrid?: string;
  givenMask?: string;
};

function readLevel(value: string | null): number {
  const n = Number(value);
  return isSudokuLevelId(n) ? n : 1;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const level = readLevel(url.searchParams.get("level"));

  try {
    const scores = await listSudokuScores(level);
    return NextResponse.json({ scores });
  } catch (error) {
    const message = error instanceof Error ? error.message : "스도쿠 리더보드를 불러오지 못했습니다.";
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

  const levelId = Number(payload.levelId);
  if (!isSudokuLevelId(levelId)) {
    return NextResponse.json({ error: "레벨은 1에서 10 사이여야 합니다." }, { status: 400 });
  }

  try {
    const result = await saveSudokuScore({
      playerName: String(payload.playerName ?? ""),
      levelId,
      timeMs: Number(payload.timeMs ?? 0),
      seed: Number(payload.seed ?? 0),
      puzzle: String(payload.puzzle ?? ""),
      playerGrid: String(payload.playerGrid ?? ""),
      givenMask: String(payload.givenMask ?? ""),
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "스도쿠 기록을 저장하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
