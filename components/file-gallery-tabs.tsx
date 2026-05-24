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
    <div className="panel admin-compact-panel">
      <div className="tabs-header">
        <h3>Uploaded Files</h3>
        <div className="segmented-control" role="tablist" aria-label="File view mode">
          <button
            className={activeTab === "files" ? "segment active" : "segment"}
            type="button"
            role="tab"
            aria-selected={activeTab === "files"}
            onClick={() => setActiveTab("files")}
          >
            Files
          </button>
          <button
            className={activeTab === "images" ? "segment active" : "segment"}
            type="button"
            role="tab"
            aria-selected={activeTab === "images"}
            onClick={() => setActiveTab("images")}
          >
            Images {imageFiles.length}
          </button>
        </div>
      </div>

      {activeTab === "files" ? (
        files.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            No files have been uploaded yet.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Download</th>
                  <th>Delete</th>
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
          No image files yet.
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
            {visibleImageCount < imageFiles.length ? "Loading more images..." : "All images loaded."}
          </div>
        </>
      )}
    </div>
  );
}
