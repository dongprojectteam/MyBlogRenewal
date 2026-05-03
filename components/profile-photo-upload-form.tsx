"use client";

import { useState } from "react";

export function ProfilePhotoUploadForm({ profileId }: { profileId: string }) {
  const [isUploading, setIsUploading] = useState(false);

  return (
    <form
      action="/admin/profile/photo"
      method="post"
      encType="multipart/form-data"
      className="stack"
      onSubmit={() => setIsUploading(true)}
    >
      <input type="hidden" name="profile_id" value={profileId} />
      <div className="field">
        <label className="label" htmlFor="profile-photo-input">
          이미지 업로드
        </label>
        <input className="file-input" id="profile-photo-input" type="file" name="photo" accept="image/*" />
      </div>
      {isUploading ? <div className="loading-inline">사진 업로드 중입니다. 잠시만 기다려 주세요.</div> : null}
      <button className="button" type="submit" disabled={isUploading} aria-busy={isUploading}>
        {isUploading ? "업로드 중..." : "사진 업로드"}
      </button>
    </form>
  );
}
