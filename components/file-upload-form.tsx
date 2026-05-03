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
    <form className="panel" style={{ padding: 20 }} onSubmit={handleSubmit}>
      <h3>파일 업로드</h3>
      <div className="field">
        <label className="label" htmlFor="admin-file-input">
          파일 선택
        </label>
        <input className="file-input" id="admin-file-input" type="file" name="file" />
      </div>
      {isUploading ? <div className="loading-inline">업로드 중입니다. 잠시만 기다려 주세요.</div> : null}
      <div className="actions">
        <button className="button" type="submit" disabled={isUploading} aria-busy={isUploading}>
          {isUploading ? "업로드 중..." : "업로드"}
        </button>
      </div>
    </form>
  );
}
