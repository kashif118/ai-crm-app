"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useElementWidth } from "@/hooks/useElementWidth";
import type { MetricSeriesPoint } from "@/lib/analytics";
import { cn, formatCompactCurrency, formatCurrency } from "@/lib/utils";

const PAD = { top: 16, right: 20, bottom: 26, left: 56 };
const PLOT_HEIGHT = 208;
/** The container is sized to include the x-axis band, never just the plot. */
const CHART_HEIGHT = PLOT_HEIGHT + PAD.top + PAD.bottom;

/** Rounds the axis to clean numbers so ticks read 0 / 50K / 100K. */
function niceScale(max: number, tickCount = 4): { max: number; ticks: number[] } {
  if (max <= 0) return { max: 1, ticks: [0, 1] };
  const rough = max / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalised = rough / magnitude;
  const step =
    (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10) *
    magnitude;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= niceMax + step / 1000; value += step) ticks.push(value);
  return { max: niceMax, ticks };
}

/**
 * Booked revenue by month — one series, so no legend box: the card title says
 * what is plotted. Values are reachable three ways (endpoint label, hover or
 * keyboard tooltip, and the table view), so nothing is gated behind hover.
 */
export function RevenueChart({ series }: { series: MetricSeriesPoint[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const scale = useMemo(
    () => niceScale(Math.max(...series.map((point) => point.value), 0)),
    [series],
  );

  const innerWidth = Math.max(width - PAD.left - PAD.right, 10);
  const xFor = (index: number) =>
    PAD.left + (series.length <= 1 ? innerWidth / 2 : (index / (series.length - 1)) * innerWidth);
  const yFor = (value: number) =>
    PAD.top + PLOT_HEIGHT - (value / scale.max) * PLOT_HEIGHT;

  const linePath = series
    .map((point, index) => `${index === 0 ? "M" : "L"}${xFor(index).toFixed(1)},${yFor(point.value).toFixed(1)}`)
    .join(" ");
  const areaPath =
    series.length > 0
      ? `${linePath} L${xFor(series.length - 1).toFixed(1)},${(PAD.top + PLOT_HEIGHT).toFixed(1)} L${xFor(0).toFixed(1)},${(PAD.top + PLOT_HEIGHT).toFixed(1)} Z`
      : "";

  const lastIndex = series.length - 1;
  const total = series.reduce((sum, point) => sum + point.value, 0);
  const activePoint = active === null ? null : series[active];

  // Show every other month label when the axis gets tight.
  const labelStride = innerWidth < 380 ? 3 : innerWidth < 560 ? 2 : 1;

  const moveActive = (delta: number) => {
    setActive((current) => {
      const next = (current ?? lastIndex) + delta;
      return Math.min(Math.max(next, 0), lastIndex);
    });
  };

  return (
    <Card interactive>
      <CardHeader
        title="Revenue growth"
        subtitle={`${formatCurrency(total)} booked over the last 12 months`}
        action={
          <button
            type="button"
            onClick={() => setShowTable((value) => !value)}
            className="rounded-md px-2 py-1 text-[12px] font-medium text-ink-muted transition-colors hover:bg-hover hover:text-ink"
            aria-pressed={showTable}
          >
            {showTable ? "Chart" : "Table"}
          </button>
        }
      />

      {showTable ? (
        <RevenueTable series={series} />
      ) : (
        <div ref={ref} className="relative px-2 pb-2">
          <svg
            width={width || 0}
            height={CHART_HEIGHT}
            role="img"
            aria-label={`Booked revenue by month. ${series
              .map((point) => `${point.label}: ${formatCurrency(point.value)}`)
              .join(", ")}.`}
            className="block touch-pan-y outline-none"
            tabIndex={0}
            onFocus={() => setActive((current) => current ?? lastIndex)}
            onBlur={() => setActive(null)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                moveActive(1);
              } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                moveActive(-1);
              } else if (event.key === "Escape") {
                setActive(null);
              }
            }}
            onMouseLeave={() => setActive(null)}
            onMouseMove={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              const x = event.clientX - bounds.left;
              const ratio = (x - PAD.left) / innerWidth;
              const index = Math.round(ratio * lastIndex);
              setActive(Math.min(Math.max(index, 0), lastIndex));
            }}
          >
            {width > 0 ? (
              <>
                {/* Gridlines and axis: solid hairlines, one step off the surface */}
                {scale.ticks.map((tick) => (
                  <g key={tick}>
                    <line
                      x1={PAD.left}
                      x2={width - PAD.right}
                      y1={yFor(tick)}
                      y2={yFor(tick)}
                      stroke={tick === 0 ? "var(--axis)" : "var(--grid)"}
                      strokeWidth={1}
                    />
                    <text
                      x={PAD.left - 10}
                      y={yFor(tick) + 4}
                      textAnchor="end"
                      className="fill-ink-muted text-[11px] tabular-nums"
                    >
                      {formatCompactCurrency(tick)}
                    </text>
                  </g>
                ))}

                <path d={areaPath} fill="var(--accent)" fillOpacity={0.1} />
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Crosshair for the hovered / focused month */}
                {active !== null ? (
                  <line
                    x1={xFor(active)}
                    x2={xFor(active)}
                    y1={PAD.top}
                    y2={PAD.top + PLOT_HEIGHT}
                    stroke="var(--line-strong)"
                    strokeWidth={1}
                  />
                ) : null}

                {/* End dot, always visible, with a 2px surface ring */}
                <circle cx={xFor(lastIndex)} cy={yFor(series[lastIndex].value)} r={6} fill="var(--surface)" />
                <circle cx={xFor(lastIndex)} cy={yFor(series[lastIndex].value)} r={4} fill="var(--accent)" />

                {active !== null && active !== lastIndex ? (
                  <>
                    <circle cx={xFor(active)} cy={yFor(series[active].value)} r={6} fill="var(--surface)" />
                    <circle cx={xFor(active)} cy={yFor(series[active].value)} r={4} fill="var(--accent)" />
                  </>
                ) : null}

                {/* One selective direct label: the endpoint */}
                {innerWidth > 320 ? (
                  <text
                    x={xFor(lastIndex)}
                    y={Math.max(yFor(series[lastIndex].value) - 14, PAD.top + 8)}
                    textAnchor="end"
                    className="fill-ink text-[11px] font-semibold tabular-nums"
                  >
                    {formatCompactCurrency(series[lastIndex].value)}
                  </text>
                ) : null}

                {/* X-axis month labels */}
                {series.map((point, index) =>
                  index % labelStride === 0 || index === lastIndex ? (
                    <text
                      key={point.key}
                      x={xFor(index)}
                      y={PAD.top + PLOT_HEIGHT + 18}
                      textAnchor="middle"
                      className="fill-ink-muted text-[11px]"
                    >
                      {point.label}
                    </text>
                  ) : null,
                )}
              </>
            ) : null}
          </svg>

          {activePoint ? (
            <div
              role="status"
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-2.5 py-1.5 shadow-lg"
              style={{
                left: Math.min(Math.max(xFor(active ?? 0), 70), Math.max(width - 70, 70)),
                top: 4,
              }}
            >
              <p className="text-[11px] text-ink-muted">{activePoint.label}</p>
              <p className="text-[13px] font-semibold tabular-nums text-ink">
                {formatCurrency(activePoint.value)}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}

function RevenueTable({ series }: { series: MetricSeriesPoint[] }) {
  const max = Math.max(...series.map((point) => point.value), 1);
  return (
    <div className="scroll-thin max-h-[268px] overflow-y-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Booked revenue by month</caption>
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-line text-left">
            <th scope="col" className="px-5 py-2 text-[12px] font-medium text-ink-muted">
              Month
            </th>
            <th scope="col" className="px-5 py-2 text-right text-[12px] font-medium text-ink-muted">
              Revenue
            </th>
            <th scope="col" className="px-5 py-2 text-right text-[12px] font-medium text-ink-muted">
              Share of peak
            </th>
          </tr>
        </thead>
        <tbody>
          {series.map((point) => (
            <tr key={point.key} className="border-b border-line last:border-0">
              <th scope="row" className="px-5 py-2 text-left font-normal text-ink-secondary">
                {point.label}
              </th>
              <td className="px-5 py-2 text-right tabular-nums text-ink">
                {formatCurrency(point.value)}
              </td>
              <td
                className={cn(
                  "px-5 py-2 text-right tabular-nums",
                  point.value === max ? "font-medium text-ink" : "text-ink-muted",
                )}
              >
                {Math.round((point.value / max) * 100)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
