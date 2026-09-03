/**
 * A 12-point trend line for stat tiles. Drawn in the de-emphasis ink with the
 * current period marked in the accent, per the stat-tile contract — it hints at
 * shape, it is not a chart you read values off. The real values live in the
 * revenue chart and its table view.
 */
export function Sparkline({
  values,
  width = 96,
  height = 28,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return <div style={{ width, height }} aria-hidden="true" />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;

  const x = (index: number) =>
    pad + (index / (values.length - 1)) * (width - pad * 2);
  const y = (value: number) =>
    height - pad - ((value - min) / span) * (height - pad * 2);

  const path = values.map((value, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const lastX = x(values.length - 1);
  const lastY = y(values[values.length - 1]);

  return (
    <svg width={width} height={height} aria-hidden="true" focusable="false">
      <path
        d={path}
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 2px surface ring keeps the end dot legible where it meets the line */}
      <circle cx={lastX} cy={lastY} r={4} fill="var(--surface)" />
      <circle cx={lastX} cy={lastY} r={2.5} fill="var(--accent)" />
    </svg>
  );
}
