import { randomUUID } from "node:crypto";

import { hasSupabaseEnv } from "@/lib/env";
import { seedFiles, seedNote, seedProfile, seedVisualizations } from "@/lib/seed";
import { getSupabaseAdminClient, getSupabasePublicClient } from "@/lib/supabase";
import { toSlugishPath } from "@/lib/utils";
import type {
  AdminNote,
  Profile,
  ProfileBundle,
  UploadedFile,
  Visualization,
} from "@/types";

const ADMIN_BUCKET = "admin-files";
const PROFILE_BUCKET = "profile-images";

function sortByOrder<T extends { sort_order: number }>(items: T[]) {
  return items.sort((a, b) => a.sort_order - b.sort_order);
}

export async function getPublicVisualizations(): Promise<Visualization[]> {
  if (!hasSupabaseEnv()) return sortByOrder([...seedVisualizations]).filter((item) => item.visible);

  const supabase = getSupabasePublicClient();
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
  const visible = input.get("visible") === "on";
  const sort_order = Number(input.get("sort_order") || 0);

  const payload = { title, description, url, visible, sort_order };
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
  if (!hasSupabaseEnv()) return structuredClone(seedProfile);

  const supabase = getSupabasePublicClient();
  const [{ data: profileRows, error: profileError }, { data: projectRows, error: projectError }, { data: linkRows, error: linkError }] =
    await Promise.all([
      supabase.from("profile").select("*").limit(1),
      supabase.from("profile_projects").select("*").order("sort_order", { ascending: true }),
      supabase.from("profile_links").select("*").order("sort_order", { ascending: true }),
    ]);

  if (profileError) throw profileError;
  if (projectError) throw projectError;
  if (linkError) throw linkError;

  const profile =
    profileRows?.[0] ??
    ({
      id: randomUUID(),
      greeting: "안녕하세요. DOPT입니다.",
      bio: "",
      photo_path: null,
    } satisfies Profile);

  return {
    profile,
    projects: projectRows ?? [],
    links: linkRows ?? [],
  };
}

export async function saveProfileText(input: FormData) {
  if (!hasSupabaseEnv()) return;

  const id = String(input.get("id") || randomUUID());
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
    project_url: toSlugishPath(String(input.get("project_url") || "").trim()),
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
  const storagePath = `${id}/${file.name}`;
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
