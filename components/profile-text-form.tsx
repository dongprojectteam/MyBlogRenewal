"use client";

import { useActionState } from "react";

import { saveProfileTextFormAction } from "@/app/actions";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import type { Profile } from "@/types";

type FormState = {
  status: "idle" | "success" | "error";
  message: string;
};

type ProfileTextFormProps = {
  profile: Profile;
};

const initialState: FormState = {
  status: "idle",
  message: "",
};

export function ProfileTextForm({ profile }: ProfileTextFormProps) {
  const [state, formAction] = useActionState(saveProfileTextFormAction, initialState);

  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="id" value={profile.id} />
      <div className="field">
        <label className="label" htmlFor="profile-greeting">
          인사말
        </label>
        <input className="input" id="profile-greeting" name="greeting" defaultValue={profile.greeting} />
      </div>
      <div className="field">
        <label className="label" htmlFor="profile-bio">
          소개
        </label>
        <textarea className="textarea" id="profile-bio" name="bio" defaultValue={profile.bio} />
      </div>
      {state.status === "error" ? <div className="notice notice-error">{state.message}</div> : null}
      {state.status === "success" ? <div className="notice notice-success">{state.message}</div> : null}
      <div className="actions">
        <AdminSubmitButton idleText="저장" pendingText="저장 중..." />
      </div>
    </form>
  );
}
