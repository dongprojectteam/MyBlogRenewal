import { Buffer } from "node:buffer";

import iconv from "iconv-lite";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RepairCandidate = {
  label: string;
  value: string;
  score: number;
};

const MAX_TEXT_LENGTH = 50000;

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

function scoreText(value: string) {
  const hangul = countMatches(value, /[가-힣]/g);
  const latin = countMatches(value, /[A-Za-z0-9]/g);
  const spaces = countMatches(value, /\s/g);
  const replacement = countMatches(value, /[\uFFFD]/g);
  const controls = countMatches(value, /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g);
  const suspicious = countMatches(value, /[ÃÂ¤åæêëìíîïð¿½]/g);

  return hangul * 8 + latin * 0.25 + spaces * 0.1 - replacement * 18 - controls * 12 - suspicious * 1.7;
}

function tryTransform(label: string, transform: () => string, candidates: RepairCandidate[]) {
  try {
    const value = transform();
    if (!value.trim()) return;
    if (candidates.some((candidate) => candidate.value === value)) return;
    candidates.push({
      label,
      value,
      score: Number(scoreText(value).toFixed(2)),
    });
  } catch {
    // A failed transform is just not a useful candidate.
  }
}

function decodeUriLoose(value: string) {
  return decodeURIComponent(value.replace(/\+/g, "%20"));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.slice(0, MAX_TEXT_LENGTH) : "";

  if (!text.trim()) {
    return NextResponse.json({ candidates: [] });
  }

  const candidates: RepairCandidate[] = [
    {
      label: "Original",
      value: text,
      score: Number(scoreText(text).toFixed(2)),
    },
  ];

  tryTransform("CP949 bytes decoded as UTF-8", () => iconv.decode(iconv.encode(text, "cp949"), "utf8"), candidates);
  tryTransform("EUC-KR bytes decoded as UTF-8", () => iconv.decode(iconv.encode(text, "euc-kr"), "utf8"), candidates);
  tryTransform("Windows-1252 bytes decoded as UTF-8", () => iconv.decode(iconv.encode(text, "win1252"), "utf8"), candidates);
  tryTransform("Latin-1 bytes decoded as UTF-8", () => Buffer.from(text, "latin1").toString("utf8"), candidates);
  tryTransform("UTF-8 bytes decoded as CP949", () => iconv.decode(Buffer.from(text, "utf8"), "cp949"), candidates);
  tryTransform("UTF-8 bytes decoded as EUC-KR", () => iconv.decode(Buffer.from(text, "utf8"), "euc-kr"), candidates);
  tryTransform("URI percent-decoded", () => decodeUriLoose(text), candidates);

  const sorted = candidates.sort((a, b) => b.score - a.score).slice(0, 8);

  return NextResponse.json({ candidates: sorted });
}
