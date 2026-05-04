"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { FileDeleteForm } from "@/components/file-delete-form";
import { FileDownloadButton } from "@/components/file-download-button";
import { formatBytes } from "@/lib/utils";
import type { UploadedFile } from "@/types";

const IMAGE_BATCH_SIZE = 18;

type FileGalleryTabsProps = {
  files: UploadedFile[];
};

export function FileGalleryTabs({ files }: FileGalleryTabsProps) {
  const [activeTab, setActiveTab] = useState<"files" | "images">("files");
  const [visibleImageCount, setVisibleImageCount] = useState(IMAGE_BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const imageFiles = useMemo(() => files.filter((file) => file.mime_type.startsWith("image/")), [files]);
  const visibleImages = imageFiles.slice(0, visibleImageCount);

  useEffect(() => {
    if (activeTab !== "images") return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleImageCount((count) => Math.min(count + IMAGE_BATCH_SIZE, imageFiles.length));
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeTab, imageFiles.length]);

  return (
    <div className="panel" style={{ padding: 20 }}>
      <div className="tabs-header">
        <h3>업로드한 파일</h3>
        <div className="segmented-control" role="tablist" aria-label="파일 보기 방식">
          <button
            className={activeTab === "files" ? "segment active" : "segment"}
            type="button"
            role="tab"
            aria-selected={activeTab === "files"}
            onClick={() => setActiveTab("files")}
          >
            파일
          </button>
          <button
            className={activeTab === "images" ? "segment active" : "segment"}
            type="button"
            role="tab"
            aria-selected={activeTab === "images"}
            onClick={() => setActiveTab("images")}
          >
            이미지 {imageFiles.length}
          </button>
        </div>
      </div>

      {activeTab === "files" ? (
        files.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            업로드한 파일이 없습니다.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>파일명</th>
                  <th>크기</th>
                  <th>다운로드</th>
                  <th>삭제</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id}>
                    <td>{file.file_name}</td>
                    <td>{formatBytes(file.file_size)}</td>
                    <td>
                      <FileDownloadButton fileId={file.id} />
                    </td>
                    <td>
                      <FileDeleteForm fileId={file.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : imageFiles.length === 0 ? (
        <p className="muted" style={{ marginBottom: 0 }}>
          이미지 파일이 아직 없습니다.
        </p>
      ) : (
        <>
          <div className="photo-grid">
            {visibleImages.map((file) => (
              <a
                key={file.id}
                className="photo-tile"
                href={`/admin/files/preview?id=${encodeURIComponent(file.id)}`}
                target="_blank"
                rel="noreferrer"
                title={file.file_name}
              >
                <img src={`/admin/files/preview?id=${encodeURIComponent(file.id)}`} alt={file.file_name} loading="lazy" />
                <span>{file.file_name}</span>
              </a>
            ))}
          </div>
          <div ref={sentinelRef} className="gallery-sentinel">
            {visibleImageCount < imageFiles.length ? "이미지 더 불러오는 중..." : "모든 이미지를 불러왔습니다."}
          </div>
        </>
      )}
    </div>
  );
}
