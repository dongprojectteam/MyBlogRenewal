import type { CSSProperties } from "react";

import type { AssetLoadState } from "../_types";

export function TetrisLoadingScreen({ status, error }: { status: AssetLoadState; error: string }) {
  const isError = status === "error";

  return (
    <section className="tetris-loading-screen" aria-live="polite" aria-busy={!isError}>
      <div className="tetris-loading-grid" aria-hidden="true">
        {Array.from({ length: 40 }, (_, index) => (
          <span
            key={index}
            style={
              {
                "--delay": `${(index % 10) * 42 + Math.floor(index / 10) * 70}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="tetris-loading-copy">
        <span className="tag neutral">{isError ? "Asset Error" : "Loading"}</span>
        <h1>{isError ? "리소스를 불러오지 못했습니다" : "Tetris Arena"}</h1>
        <p>{isError ? error : "게임 리소스를 준비하고 있습니다."}</p>
        {isError ? (
          <button type="button" className="button" onClick={() => window.location.reload()}>
            Retry
          </button>
        ) : (
          <div className="tetris-loading-bar" aria-hidden="true">
            <span />
          </div>
        )}
      </div>
    </section>
  );
}
