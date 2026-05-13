import type { CSSProperties } from "react";

import type { PhaseDualAssetLoadState } from "../_types";

export function PhaseDualLoadingScreen({ status, error }: { status: PhaseDualAssetLoadState; error: string }) {
  const isError = status === "error";

  return (
    <section className="phase-dual-loading-screen" aria-live="polite" aria-busy={!isError}>
      <div className="phase-dual-loading-grid" aria-hidden="true">
        {Array.from({ length: 49 }, (_, index) => (
          <span
            key={index}
            style={
              {
                "--delay": `${(index % 7) * 54 + Math.floor(index / 7) * 38}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="phase-dual-loading-copy">
        <span className="tag neutral">{isError ? "Asset Error" : "Loading"}</span>
        <h1>{isError ? "리소스를 불러오지 못했습니다" : "Phase Dual"}</h1>
        <p>{isError ? error : "게임 사운드 에셋을 준비하고 있습니다."}</p>
        {isError ? (
          <button type="button" className="button" onClick={() => window.location.reload()}>
            Retry
          </button>
        ) : (
          <div className="phase-dual-loading-bar" aria-hidden="true">
            <span />
          </div>
        )}
      </div>
    </section>
  );
}
