"use client";

import { FormEvent, useState } from "react";

export function FileUploadForm() {
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsUploading(true);

    try {
      const form = event.currentTarget;
      const response = await fetch("/admin/files/upload", {
        method: "POST",
        body: new FormData(form),
        credentials: "same-origin",
      });

      window.location.assign(response.url);
    } catch {
      window.location.assign("/admin/files?error=upload_failed");
    }
  }

  return (
    <form className="panel admin-compact-panel" onSubmit={handleSubmit}>
      <h3>File Upload</h3>
      <div className="field">
        <label className="label" htmlFor="admin-file-input">
          Choose File
        </label>
        <input className="file-input" id="admin-file-input" type="file" name="file" />
      </div>
      {isUploading ? <div className="loading-inline">Uploading. Please wait.</div> : null}
      <div className="actions">
        <button className="button" type="submit" disabled={isUploading} aria-busy={isUploading}>
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </form>
  );
}
