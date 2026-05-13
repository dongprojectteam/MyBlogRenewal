import { NextResponse } from "next/server";

import { listPhaseDualScores, savePhaseDualScore } from "@/lib/data";
import { formatDailyKey, getDailyPuzzleByDate } from "@/app/phase-dual/_lib/puzzles";

export const dynamic = "force-dynamic";

type ScorePayload = {
  playerName?: string;
  dailyKey?: string;
  puzzleId?: string;
  score?: number;
  moves?: number;
  timeMs?: number;
  undos?: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function resolveDailyKey(value: string | null) {
  if (value && DATE_RE.test(value)) return value;
  return formatDailyKey(new Date());
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dailyKey = resolveDailyKey(url.searchParams.get("date"));
  const [year, month, day] = dailyKey.split("-").map((part) => Number(part));
  const puzzleId = getDailyPuzzleByDate(new Date(Date.UTC(year, month - 1, day))).id;

  try {
    const scores = await listPhaseDualScores(dailyKey);
    return NextResponse.json({ scores, dailyKey, puzzleId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "리더보드를 불러오지 못했습니다.";
    return NextResponse.json({ error: message, scores: [], dailyKey, puzzleId }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let payload: ScorePayload;
  try {
    payload = (await request.json()) as ScorePayload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  try {
    const result = await savePhaseDualScore({
      playerName: String(payload.playerName ?? ""),
      dailyKey: String(payload.dailyKey ?? ""),
      puzzleId: String(payload.puzzleId ?? ""),
      score: Number(payload.score ?? 0),
      moves: Number(payload.moves ?? 0),
      timeMs: Number(payload.timeMs ?? 0),
      undos: Number(payload.undos ?? 0),
    });

    if (result.conflict) {
      return NextResponse.json(
        { error: "오늘 이미 제출한 닉네임입니다.", conflict: true, score: result.score },
        { status: 409 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "기록을 저장하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
