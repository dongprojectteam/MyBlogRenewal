"use client";

import { useState } from "react";

export function ProfilePhotoUploadForm({ profileId }: { profileId: string }) {
  const [isUploading, setIsUploading] = useState(false);

  return (
    <form
      action="/admin/profile/photo"
      method="post"
      encType="multipart/form-data"
      className="compact-form"
      onSubmit={() => setIsUploading(true)}
    >
      <input type="hidden" name="profile_id" value={profileId} />
      <div className="field">
        <label className="label" htmlFor="profile-photo-input">
          Image Upload
        </label>
        <input className="file-input" id="profile-photo-input" type="file" name="photo" accept="image/*" />
      </div>
      {isUploading ? <div className="loading-inline">Uploading photo. Please wait.</div> : null}
      <div className="actions admin-form-actions">
        <button className="button" type="submit" disabled={isUploading} aria-busy={isUploading}>
          {isUploading ? "Uploading..." : "Upload Photo"}
        </button>
      </div>
    </form>
  );
}
