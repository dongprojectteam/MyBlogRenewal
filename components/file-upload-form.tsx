"use client";

import { useState } from "react";

export function FileUploadForm() {
  const [isUploading, setIsUploading] = useState(false);

  return (
    <form
      action="/admin/files/upload"
      method="post"
      encType="multipart/form-data"
      className="panel"
      style={{ padding: 20 }}
      onSubmit={() => setIsUploading(true)}
    >
      <h3>파일 업로드</h3>
      <div className="field">
        <label className="label" htmlFor="admin-file-input">
          파일 선택
        </label>
        <input className="file-input" id="admin-file-input" type="file" name="file" disabled={isUploading} />
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
