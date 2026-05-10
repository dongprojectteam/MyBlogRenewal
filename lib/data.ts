import { randomUUID } from "node:crypto";

import { hasSupabaseEnv } from "@/lib/env";
import { seedFiles, seedNote, seedProfile, seedSudokuScores, seedTetrisScores, seedVisualizations } from "@/lib/seed";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { gridToString } from "@/lib/sudoku/grid";
import { isSudokuLevelId } from "@/lib/sudoku/level-profiles";
import { parseSudokuSubmission } from "@/lib/sudoku/validate";
import { safeYear, toProjectUrl, toSlugishPath } from "@/lib/utils";
import type {
  AdminNote,
  Profile,
  ProfileBundle,
  UploadedFile,
  Visualization,
  TetrisMode,
  TetrisScore,
  SudokuScore,
} from "@/types";

const ADMIN_BUCKET = "admin-files";
const PROFILE_BUCKET = "profile-images";
const DEFAULT_PROFILE_ID = "11111111-1111-1111-1111-111111111111";
const TETRIS_SCORE_LIMIT = 20;
const SUDOKU_SCORE_LIMIT = 50;
const TETRIS_MODES = ["marathon", "sprint", "ultra", "survival", "daily"] as const;

export type SaveTetrisScoreInput = {
  playerName: string;
  mode: TetrisMode;
  score: number;
  lines: number;
  level: number;
  timeMs: number;
  pieces: number;
  seed: number;
  dailyKey?: string | null;
};

function sortByOrder<T extends { sort_order: number }>(items: T[]) {
  return items.sort((a, b) => a.sort_order - b.sort_order);
}

function sortProfileProjects<T extends { sort_order: number; end_year?: number | null; start_year?: number | null; updated_at?: string; created_at?: string }>(
  items: T[],
) {
  return items.sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;

    const aYear = a.end_year ?? a.start_year ?? 0;
    const bYear = b.end_year ?? b.start_year ?? 0;
    if (aYear !== bYear) return bYear - aYear;

    const aDate = Date.parse(a.updated_at ?? a.created_at ?? "");
    const bDate = Date.parse(b.updated_at ?? b.created_at ?? "");
    return (Number.isFinite(bDate) ? bDate : 0) - (Number.isFinite(aDate) ? aDate : 0);
  });
}

function buildSafeStoragePath(id: string, fileName: string) {
  const ext = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() ?? "" : "";
  const suffix = ext ? `.${ext.replace(/[^a-z0-9]/g, "")}` : "";
  return `${id}/file${suffix}`;
}

export function isTetrisMode(value: string | null | undefined): value is TetrisMode {
  return Boolean(value && TETRIS_MODES.includes(value as TetrisMode));
}

function sanitizePlayerName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 18);
}

function toSafeInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function isDailyKey(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function normalizeTetrisScore(input: SaveTetrisScoreInput): TetrisScore {
  const player_name = sanitizePlayerName(input.playerName);
  if (player_name.length < 2) {
    throw new Error("플레이어 이름은 2자 이상 입력해 주세요.");
  }

  if (!isTetrisMode(input.mode)) {
    throw new Error("지원하지 않는 테트리스 모드입니다.");
  }

  const lines = toSafeInteger(input.lines, 0, 9999);
  const time_ms = toSafeInteger(input.timeMs, 0, 86_400_000);

  if (input.mode === "sprint" && lines < 40) {
    throw new Error("Sprint 기록은 40라인을 완료한 뒤 저장할 수 있습니다.");
  }

  if (input.mode !== "sprint" && input.score <= 0) {
    throw new Error("점수가 있는 게임만 리더보드에 저장할 수 있습니다.");
  }

  return {
    id: randomUUID(),
    player_name,
    mode: input.mode,
    score: toSafeInteger(input.score, 0, 99_999_999),
    lines,
    level: toSafeInteger(input.level, 1, 99),
    time_ms,
    pieces: toSafeInteger(input.pieces, 0, 99_999),
    seed: toSafeInteger(input.seed, 0, 2_147_483_647),
    daily_key: input.mode === "daily" && isDailyKey(input.dailyKey) ? input.dailyKey ?? null : null,
  };
}

function sortTetrisScores(scores: TetrisScore[], mode: TetrisMode) {
  const sorted = [...scores];

  if (mode === "sprint") {
    return sorted.sort((a, b) => {
      if (a.time_ms !== b.time_ms) return a.time_ms - b.time_ms;
      if (a.score !== b.score) return b.score - a.score;
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    });
  }

  return sorted.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.lines !== b.lines) return b.lines - a.lines;
    if (a.time_ms !== b.time_ms) return a.time_ms - b.time_ms;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });
}

export async function getPublicVisualizations(): Promise<Visualization[]> {
  if (!hasSupabaseEnv()) return sortByOrder([...seedVisualizations]).filter((item) => item.visible);

  // Home route is server-rendered, so we can safely query with admin client.
  // This avoids empty results when public RLS policies are restrictive.
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("visualizations")
    .select("*")
    .eq("visible", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getAllVisualizations(): Promise<Visualization[]> {
  if (!hasSupabaseEnv()) return sortByOrder([...seedVisualizations]);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("visualizations").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveVisualization(input: FormData) {
  if (!hasSupabaseEnv()) return;

  const id = String(input.get("id") || "");
  const title = String(input.get("title") || "").trim();
  const description = String(input.get("description") || "").trim();
  const url = toSlugishPath(String(input.get("url") || "").trim());
  const image_url = String(input.get("image_url") || "").trim() || null;
  const visible = input.get("visible") === "on";
  const sort_order = Number(input.get("sort_order") || 0);

  const payload = { title, description, url, image_url, visible, sort_order };
  const supabase = getSupabaseAdminClient();

  if (id) {
    const { error } = await supabase.from("visualizations").update(payload).eq("id", id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("visualizations").insert([{ id: randomUUID(), ...payload }]);
  if (error) throw error;
}

export async function deleteVisualization(id: string) {
  if (!hasSupabaseEnv()) return;
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("visualizations").delete().eq("id", id);
  if (error) throw error;
}

export async function getProfileBundle(): Promise<ProfileBundle> {
  if (!hasSupabaseEnv()) {
    const bundle = structuredClone(seedProfile);
    bundle.projects = sortProfileProjects(bundle.projects);
    return bundle;
  }

  const supabase = getSupabaseAdminClient();
  const [{ data: profileRows, error: profileError }, { data: projectRows, error: projectError }, { data: linkRows, error: linkError }] =
    await Promise.all([
      supabase
        .from("profile")
        .select("*")
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("profile_projects")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("updated_at", { ascending: false }),
      supabase.from("profile_links").select("*").order("sort_order", { ascending: true }),
    ]);

  if (profileError) throw profileError;
  if (projectError) throw projectError;
  if (linkError) throw linkError;

  const profile =
    profileRows?.[0] ??
    ({
      id: DEFAULT_PROFILE_ID,
      greeting: "안녕하세요. DOPT입니다.",
      bio: "",
      photo_path: null,
    } satisfies Profile);

  return {
    profile,
    projects: sortProfileProjects(projectRows ?? []),
    links: linkRows ?? [],
  };
}

export async function saveProfileText(input: FormData) {
  if (!hasSupabaseEnv()) return;

  const id = String(input.get("id") || DEFAULT_PROFILE_ID);
  const greeting = String(input.get("greeting") || "").trim();
  const bio = String(input.get("bio") || "").trim();
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.from("profile").upsert([{ id, greeting, bio }], { onConflict: "id" });
  if (error) throw error;
}

export async function saveProfileProject(input: FormData) {
  if (!hasSupabaseEnv()) return;
  const supabase = getSupabaseAdminClient();
  const id = String(input.get("id") || "");
  const payload = {
    title: String(input.get("title") || "").trim(),
    description: String(input.get("description") || "").trim(),
    project_url: toProjectUrl(String(input.get("project_url") || "").trim()),
    start_year: safeYear(input.get("start_year")),
    end_year: safeYear(input.get("end_year")),
    screenshot_url: String(input.get("screenshot_url") || "").trim() || null,
    sort_order: Number(input.get("sort_order") || 0),
  };

  if (id) {
    const { error } = await supabase.from("profile_projects").update(payload).eq("id", id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("profile_projects").insert([{ id: randomUUID(), ...payload }]);
  if (error) throw error;
}

export async function deleteProfileProject(id: string) {
  if (!hasSupabaseEnv()) return;
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("profile_projects").delete().eq("id", id);
  if (error) throw error;
}

export async function saveProfileLink(input: FormData) {
  if (!hasSupabaseEnv()) return;
  const supabase = getSupabaseAdminClient();
  const id = String(input.get("id") || "");
  const payload = {
    label: String(input.get("label") || "").trim(),
    url: String(input.get("url") || "").trim(),
    sort_order: Number(input.get("sort_order") || 0),
  };

  if (id) {
    const { error } = await supabase.from("profile_links").update(payload).eq("id", id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("profile_links").insert([{ id: randomUUID(), ...payload }]);
  if (error) throw error;
}

export async function deleteProfileLink(id: string) {
  if (!hasSupabaseEnv()) return;
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("profile_links").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadProfilePhoto(file: File, profileId: string) {
  if (!hasSupabaseEnv()) return;
  const ext = file.name.split(".").pop() || "png";
  const storagePath = `${profileId}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const supabase = getSupabaseAdminClient();
  const { error: uploadError } = await supabase.storage.from(PROFILE_BUCKET).upload(storagePath, arrayBuffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { error } = await supabase.from("profile").update({ photo_path: storagePath }).eq("id", profileId);
  if (error) throw error;
}

export async function getProfilePhotoUrl(photoPath: string | null) {
  if (!photoPath || !hasSupabaseEnv()) return null;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(PROFILE_BUCKET).createSignedUrl(photoPath, 60 * 60 * 24 * 7);
  if (error) throw error;
  return data.signedUrl;
}

export async function listAdminNotes(): Promise<AdminNote[]> {
  if (!hasSupabaseEnv()) return [structuredClone(seedNote)];

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_notes")
    .select("*")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getLatestAdminNote(): Promise<AdminNote | null> {
  const notes = await listAdminNotes();
  return notes[0] ?? null;
}

export async function saveAdminNote(input: FormData) {
  if (!hasSupabaseEnv()) return;
  const supabase = getSupabaseAdminClient();
  const id = String(input.get("id") || randomUUID());
  const content = String(input.get("content") || "");
  const { error } = await supabase.from("admin_notes").upsert([{ id, content }], { onConflict: "id" });
  if (error) throw error;
}

export async function deleteAdminNote(id: string) {
  if (!hasSupabaseEnv()) return;
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("admin_notes").delete().eq("id", id);
  if (error) throw error;
}

export async function listUploadedFiles(): Promise<UploadedFile[]> {
  if (!hasSupabaseEnv()) return [...seedFiles];
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("uploaded_files").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveUploadedFile(file: File) {
  if (!hasSupabaseEnv()) return;
  const supabase = getSupabaseAdminClient();
  const id = randomUUID();
  const storagePath = buildSafeStoragePath(id, file.name);
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(ADMIN_BUCKET).upload(storagePath, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error } = await supabase.from("uploaded_files").insert([
    {
      id,
      file_name: file.name,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type || "application/octet-stream",
    },
  ]);
  if (error) throw error;
}

export async function getFileDownloadUrl(id: string) {
  if (!hasSupabaseEnv()) return null;
  const supabase = getSupabaseAdminClient();
  const { data: rows, error } = await supabase.from("uploaded_files").select("*").eq("id", id).limit(1);
  if (error) throw error;
  const file = rows?.[0];
  if (!file) return null;

  const { data, error: signedUrlError } = await supabase.storage
    .from(ADMIN_BUCKET)
    .createSignedUrl(file.storage_path, 60);
  if (signedUrlError) throw signedUrlError;
  return data.signedUrl;
}

export async function getUploadedFileById(id: string): Promise<UploadedFile | null> {
  if (!hasSupabaseEnv()) return null;

  const supabase = getSupabaseAdminClient();
  const { data: rows, error } = await supabase.from("uploaded_files").select("*").eq("id", id).limit(1);
  if (error) throw error;

  return rows?.[0] ?? null;
}

export async function downloadUploadedFile(storagePath: string) {
  if (!hasSupabaseEnv()) return null;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(ADMIN_BUCKET).download(storagePath);
  if (error) throw error;

  return data;
}

export async function deleteUploadedFile(id: string) {
  if (!hasSupabaseEnv()) return;

  const supabase = getSupabaseAdminClient();
  const file = await getUploadedFileById(id);
  if (!file) return;

  const { error: storageError } = await supabase.storage.from(ADMIN_BUCKET).remove([file.storage_path]);
  if (storageError) throw storageError;

  const { error: rowError } = await supabase.from("uploaded_files").delete().eq("id", id);
  if (rowError) throw rowError;
}

export async function listTetrisScores(mode: TetrisMode, dailyKey?: string | null): Promise<TetrisScore[]> {
  if (!isTetrisMode(mode)) return [];

  if (!hasSupabaseEnv()) {
    const localScores = seedTetrisScores.filter((item) => {
      if (item.mode !== mode) return false;
      if (mode === "daily" && isDailyKey(dailyKey)) return item.daily_key === dailyKey;
      return true;
    });

    return sortTetrisScores(localScores, mode).slice(0, TETRIS_SCORE_LIMIT);
  }

  const supabase = getSupabaseAdminClient();
  let query = supabase.from("tetris_scores").select("*").eq("mode", mode);

  if (mode === "daily" && isDailyKey(dailyKey)) {
    query = query.eq("daily_key", dailyKey);
  }

  if (mode === "sprint") {
    query = query.order("time_ms", { ascending: true }).order("score", { ascending: false });
  } else {
    query = query
      .order("score", { ascending: false })
      .order("lines", { ascending: false })
      .order("time_ms", { ascending: true });
  }

  const { data, error } = await query.limit(TETRIS_SCORE_LIMIT);
  if (error) throw error;
  return (data ?? []) as TetrisScore[];
}

export async function saveTetrisScore(input: SaveTetrisScoreInput): Promise<{ saved: boolean; score: TetrisScore }> {
  const score = normalizeTetrisScore(input);

  if (!hasSupabaseEnv()) {
    return { saved: false, score };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("tetris_scores").insert([score]).select("*").single();
  if (error) throw error;

  return { saved: true, score: data as TetrisScore };
}

export type SaveSudokuScoreInput = {
  playerName: string;
  levelId: number;
  timeMs: number;
  seed: number;
  puzzle: string;
  playerGrid: string;
  givenMask: string;
};

function sortSudokuScores(scores: SudokuScore[]) {
  return [...scores].sort((a, b) => {
    if (a.time_ms !== b.time_ms) return a.time_ms - b.time_ms;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });
}

function normalizeSudokuScoreRow(input: SaveSudokuScoreInput): {
  id: string;
  player_name: string;
  level_id: number;
  time_ms: number;
  seed: number;
  puzzle: string;
} {
  const player_name = sanitizePlayerName(input.playerName);
  if (player_name.length < 2) {
    throw new Error("플레이어 이름은 2자 이상 입력해 주세요.");
  }

  const parsed = parseSudokuSubmission({
    playerName: player_name,
    levelId: input.levelId,
    timeMs: input.timeMs,
    seed: input.seed,
    puzzle: input.puzzle,
    playerGrid: input.playerGrid,
    givenMask: input.givenMask,
  });

  return {
    id: randomUUID(),
    player_name,
    level_id: parsed.levelId,
    time_ms: parsed.timeMs,
    seed: parsed.seed,
    puzzle: gridToString(parsed.puzzle),
  };
}

export async function listSudokuScores(levelId: number): Promise<SudokuScore[]> {
  if (!isSudokuLevelId(levelId)) return [];

  if (!hasSupabaseEnv()) {
    const local = seedSudokuScores.filter((item) => item.level_id === levelId);
    return sortSudokuScores(local).slice(0, SUDOKU_SCORE_LIMIT);
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sudoku_scores")
    .select("id, player_name, level_id, time_ms, seed, created_at")
    .eq("level_id", levelId)
    .order("time_ms", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(SUDOKU_SCORE_LIMIT);

  if (error) throw error;
  return (data ?? []) as SudokuScore[];
}

export async function saveSudokuScore(input: SaveSudokuScoreInput): Promise<{ saved: boolean; score: SudokuScore }> {
  const row = normalizeSudokuScoreRow(input);
  const score: SudokuScore = {
    id: row.id,
    player_name: row.player_name,
    level_id: row.level_id,
    time_ms: row.time_ms,
    seed: row.seed,
  };

  if (!hasSupabaseEnv()) {
    return { saved: false, score: { ...score, created_at: new Date().toISOString() } };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("sudoku_scores").insert([row]).select("id, player_name, level_id, time_ms, seed, created_at").single();
  if (error) throw error;

  return { saved: true, score: data as SudokuScore };
}
