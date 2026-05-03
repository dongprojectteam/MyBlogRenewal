"use client";

import { useId, useState } from "react";

type FileDownloadButtonProps = {
  fileId: string;
};

export function FileDownloadButton({ fileId }: FileDownloadButtonProps) {
  const iframeName = useId().replace(/:/g, "");
  const [isDownloading, setIsDownloading] = useState(false);

  const handleSubmit = () => {
    setIsDownloading(true);

    window.setTimeout(() => {
      setIsDownloading(false);
    }, 4000);
  };

  return (
    <>
      <form action="/admin/files/download" method="get" target={iframeName} onSubmit={handleSubmit}>
        <input type="hidden" name="id" value={fileId} />
        <button className="button" type="submit" disabled={isDownloading} aria-busy={isDownloading}>
          {isDownloading ? "다운로드 준비 중..." : "download"}
        </button>
      </form>
      <iframe title={`download-${fileId}`} name={iframeName} hidden onLoad={() => setIsDownloading(false)} />
    </>
  );
}
