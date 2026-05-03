"use server";

import { revalidatePath } from "next/cache";

import {
  deleteAdminNote,
  deleteUploadedFile,
  deleteProfileLink,
  deleteProfileProject,
  deleteVisualization,
  saveAdminNote,
  saveProfileLink,
  saveProfileProject,
  saveProfileText,
  saveVisualization,
} from "@/lib/data";

type FormState = {
  status: "idle" | "success" | "error";
  message: string;
};

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === "object" && error !== null) {
    const maybeMessage = Reflect.get(error, "message");
    if (typeof maybeMessage === "string" && maybeMessage) return maybeMessage;

    const maybeDetails = Reflect.get(error, "details");
    if (typeof maybeDetails === "string" && maybeDetails) return maybeDetails;

    const maybeHint = Reflect.get(error, "hint");
    if (typeof maybeHint === "string" && maybeHint) return maybeHint;
  }

  return "소개 페이지 저장 중 오류가 발생했습니다.";
}

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

export async function deleteUploadedFileAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  await deleteUploadedFile(id);
  revalidatePath("/admin/files");
  revalidatePath("/admin/dashboard");
}

export async function saveProfileTextAction(formData: FormData) {
  await saveProfileText(formData);
  revalidatePath("/about");
  revalidatePath("/admin/profile");
}

export async function saveProfileTextFormAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    await saveProfileText(formData);
    revalidatePath("/about");
    revalidatePath("/admin/profile");
    return {
      status: "success",
      message: "소개 페이지 내용이 저장되었습니다.",
    };
  } catch (error) {
    return {
      status: "error",
      message: getActionErrorMessage(error),
    };
  }
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
