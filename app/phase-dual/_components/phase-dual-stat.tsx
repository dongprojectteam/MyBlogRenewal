export function PhaseDualStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="phase-dual-hud-stat">
      <span className="phase-dual-hud-label">{label}</span>
      <span className="phase-dual-hud-value">{value}</span>
    </div>
  );
}
