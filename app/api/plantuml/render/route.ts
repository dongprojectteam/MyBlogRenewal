import { deflateRawSync } from "node:zlib";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_PLANTUML_SERVER_URL = "https://www.plantuml.com/plantuml";
const MAX_SOURCE_BYTES = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15000;
const SUPPORTED_FORMATS = new Set(["svg"]);

type PlantUmlPayload = {
  source?: unknown;
  format?: unknown;
};

function encode6Bit(value: number): string {
  if (value < 10) return String.fromCharCode(48 + value);
  if (value < 36) return String.fromCharCode(65 + value - 10);
  if (value < 62) return String.fromCharCode(97 + value - 36);
  if (value === 62) return "-";
  return "_";
}

function append3Bytes(byte1: number, byte2: number, byte3: number): string {
  const c1 = byte1 >> 2;
  const c2 = ((byte1 & 0x3) << 4) | (byte2 >> 4);
  const c3 = ((byte2 & 0xf) << 2) | (byte3 >> 6);
  const c4 = byte3 & 0x3f;

  return `${encode6Bit(c1 & 0x3f)}${encode6Bit(c2 & 0x3f)}${encode6Bit(c3 & 0x3f)}${encode6Bit(c4 & 0x3f)}`;
}

function encodePlantUml(source: string): string {
  const compressed = deflateRawSync(Buffer.from(source, "utf8"), { level: 9 });
  let result = "";

  for (let index = 0; index < compressed.length; index += 3) {
    const byte1 = compressed[index] ?? 0;
    const byte2 = compressed[index + 1] ?? 0;
    const byte3 = compressed[index + 2] ?? 0;
    result += append3Bytes(byte1, byte2, byte3);
  }

  return result;
}

function getPlantUmlServerUrl() {
  return (process.env.PLANTUML_SERVER_URL || DEFAULT_PLANTUML_SERVER_URL).replace(/\/+$/, "");
}

export async function POST(request: Request) {
  let payload: PlantUmlPayload;

  try {
    payload = (await request.json()) as PlantUmlPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const source = typeof payload.source === "string" ? payload.source : "";
  const format = typeof payload.format === "string" ? payload.format.toLowerCase() : "svg";

  if (!source.trim()) {
    return NextResponse.json({ error: "PlantUML source is required." }, { status: 400 });
  }

  if (!SUPPORTED_FORMATS.has(format)) {
    return NextResponse.json({ error: "Unsupported PlantUML output format." }, { status: 400 });
  }

  if (Buffer.byteLength(source, "utf8") > MAX_SOURCE_BYTES) {
    return NextResponse.json({ error: "PlantUML source exceeds the 1 MB limit." }, { status: 413 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const encoded = encodePlantUml(source);
    const url = `${getPlantUmlServerUrl()}/${format}/${encoded}`;
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "image/svg+xml,text/plain,*/*" },
      signal: controller.signal,
    });

    const body = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: body.trim() || "PlantUML server failed to render the diagram." },
        { status: 502 },
      );
    }

    return NextResponse.json({ svg: body });
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === "AbortError"
        ? "PlantUML render request timed out."
        : "PlantUML render request failed.";

    return NextResponse.json({ error: message }, { status: 504 });
  } finally {
    clearTimeout(timeoutId);
  }
}
