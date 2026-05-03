"use server";

import { revalidatePath } from "next/cache";

import {
  deleteAdminNote,
  deleteProfileLink,
  deleteProfileProject,
  deleteVisualization,
  saveAdminNote,
  saveProfileLink,
  saveProfileProject,
  saveProfileText,
  saveVisualization,
} from "@/lib/data";

export async function saveVisualizationAction(formData: FormData) {
  await saveVisualization(formData);
  revalidatePath("/");
  revalidatePath("/admin/visualizations");
}

export async function deleteVisualizationAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  await deleteVisualization(id);
  revalidatePath("/");
  revalidatePath("/admin/visualizations");
}

export async function saveAdminNoteAction(formData: FormData) {
  await saveAdminNote(formData);
  revalidatePath("/admin/notes");
  revalidatePath("/admin/dashboard");
}

export async function deleteAdminNoteAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  await deleteAdminNote(id);
  revalidatePath("/admin/notes");
  revalidatePath("/admin/dashboard");
}

export async function saveProfileTextAction(formData: FormData) {
  await saveProfileText(formData);
  revalidatePath("/about");
  revalidatePath("/admin/profile");
}

export async function saveProfileProjectAction(formData: FormData) {
  await saveProfileProject(formData);
  revalidatePath("/about");
  revalidatePath("/admin/profile");
}

export async function deleteProfileProjectAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  await deleteProfileProject(id);
  revalidatePath("/about");
  revalidatePath("/admin/profile");
}

export async function saveProfileLinkAction(formData: FormData) {
  await saveProfileLink(formData);
  revalidatePath("/about");
  revalidatePath("/admin/profile");
}

export async function deleteProfileLinkAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  await deleteProfileLink(id);
  revalidatePath("/about");
  revalidatePath("/admin/profile");
}
