"use client";

import { FormEvent, useState } from "react";

export function FileDeleteForm({ fileId }: { fileId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsDeleting(true);

    try {
      const formData = new FormData();
      formData.set("id", fileId);

      const response = await fetch("/admin/files/delete", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });

      window.location.assign(response.url);
    } catch {
      window.location.assign("/admin/files?error=delete_failed");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <button className="danger-button" type="submit" disabled={isDeleting} aria-busy={isDeleting}>
        {isDeleting ? "삭제 중..." : "삭제"}
      </button>
    </form>
  );
}
