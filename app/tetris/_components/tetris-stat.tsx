export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="tetris-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
