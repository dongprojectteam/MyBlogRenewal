"use client";

import { useEffect, useRef } from "react";

import { PHASE_DUAL_DIRECTIONS, applyLinkRule, type PhaseDualLinkRule } from "../_lib/engine";

const arrow: Record<string, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

export function RuleMiniSimulation({ rule }: { rule: PhaseDualLinkRule }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = 220;
    const height = 96;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const draw = (now: number) => {
      const dir = PHASE_DUAL_DIRECTIONS[Math.floor(now / 2000) % PHASE_DUAL_DIRECTIONS.length];
      const linked = applyLinkRule(dir, rule);

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(15,23,42,0.72)";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(148,163,184,0.28)";
      ctx.lineWidth = 1;

      const drawGrid = (x0: number, label: string, symbol: string) => {
        ctx.fillStyle = "rgba(226,232,240,0.85)";
        ctx.font = "700 11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(label, x0, 16);
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            ctx.strokeRect(x0 + c * 18, 26 + r * 18, 18, 18);
          }
        }
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(x0 + 18 + 4, 44 + 4, 10, 10);
        ctx.fillStyle = "rgba(226,232,240,0.95)";
        ctx.font = "700 18px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(symbol, x0 + 66, 57);
      };

      drawGrid(18, "A", arrow[dir]);
      drawGrid(132, "B", arrow[linked]);
      ctx.fillStyle = "rgba(245,158,11,0.95)";
      ctx.font = "700 16px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText("→", 102, 56);
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [rule]);

  return <canvas ref={canvasRef} className="phase-dual-rule-sim" aria-label="규칙 미니 시뮬레이션" />;
}
