"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { STAGE_META } from "@/lib/constants";
import type { FunnelStagePoint } from "@/lib/analytics";
import { cn, formatCompactCurrency, formatCurrency, formatNumber } from "@/lib/utils";

/**
 * Stage progression is an *ordered* category, so the bars use a single-hue
 * ordinal ramp (light → dark as the deal advances) rather than eight identity
 * hues. Both the light and dark ramps were checked with the palette validator
 * against these surfaces: monotone lightness, visible step gaps, and the
 * lightest step still clearing the surface.
 */
export function PipelineFunnel({ stages }: { stages: FunnelStagePoint[] }) {
  const [showTable, setShowTable] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  const widest = stages[0]?.count ?? 0;
  const overall =
    widest === 0 ? 0 : ((stages[stages.length - 1]?.count ?? 0) / widest) * 100;

  return (
    <Card interactive>
      <CardHeader
        title="Pipeline funnel"
        subtitle={`${overall.toFixed(0)}% of leads reach negotiation`}
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
        <FunnelTable stages={stages} />
      ) : (
        <div className="px-5 py-4">
          {stages.map((stage) => {
            const meta = STAGE_META[stage.stage];
            const barWidth = Math.max(stage.ratio * 100, stage.count > 0 ? 4 : 0);

            return (
              <div key={stage.stage}>
                <div
                  className="group relative rounded-md py-1.5 transition-colors"
                  onMouseEnter={() => setActive(stage.stage)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(stage.stage)}
                  onBlur={() => setActive(null)}
                  tabIndex={0}
                  aria-label={`${meta.label}: ${stage.count} leads worth ${formatCurrency(stage.value)}`}
                >
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-medium text-ink-secondary">
                      {meta.label}
                    </span>
                    <span className="text-[12px] tabular-nums text-ink-muted">
                      {formatCompactCurrency(stage.value)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Bar: 20px thick, square at the baseline, 4px rounded data-end */}
                    <div className="relative h-5 flex-1">
                      <div
                        className="absolute inset-y-0 left-0 rounded-r-[4px] transition-[width] duration-300"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: meta.cssVar,
                        }}
                      />
                    </div>
                    {/* The count sits outside the bar, in an ink token.
                        Inside the fill it would have to switch between white
                        and near-black per stage *and* per theme — the mid steps
                        of the ramp clear 4.5:1 against neither. Outside, one
                        rule is legible on every bar in both themes. */}
                    <span className="w-9 shrink-0 text-right text-[12px] font-semibold tabular-nums text-ink">
                      {formatNumber(stage.count)}
                    </span>
                  </div>

                  {active === stage.stage ? (
                    <div className="pointer-events-none absolute right-0 top-0 z-10 rounded-lg border border-line bg-surface px-2.5 py-1.5 shadow-lg">
                      <p className="text-[11px] text-ink-muted">{meta.hint}</p>
                      <p className="text-[13px] font-semibold tabular-nums text-ink">
                        {formatNumber(stage.count)} leads · {formatCurrency(stage.value)}
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* Step conversion between stages */}
                {stage.stepConversion !== null ? (
                  <p className="flex items-center gap-1 py-0.5 pl-0.5 text-[11px] text-ink-muted">
                    <ChevronDown className="h-3 w-3" aria-hidden="true" />
                    <span className="tabular-nums">
                      {(stage.stepConversion * 100).toFixed(0)}%
                    </span>
                    <span>carried forward</span>
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function FunnelTable({ stages }: { stages: FunnelStagePoint[] }) {
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Leads reaching each pipeline stage</caption>
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="px-5 py-2 text-[12px] font-medium text-ink-muted">
              Stage
            </th>
            <th scope="col" className="px-5 py-2 text-right text-[12px] font-medium text-ink-muted">
              Leads
            </th>
            <th scope="col" className="px-5 py-2 text-right text-[12px] font-medium text-ink-muted">
              Value
            </th>
            <th scope="col" className="px-5 py-2 text-right text-[12px] font-medium text-ink-muted">
              Step
            </th>
          </tr>
        </thead>
        <tbody>
          {stages.map((stage) => (
            <tr key={stage.stage} className="border-b border-line last:border-0">
              <th scope="row" className="px-5 py-2 text-left font-normal text-ink-secondary">
                <span className="inline-flex items-center gap-2">
                  <span
                    className={cn("h-2 w-2 rounded-full", STAGE_META[stage.stage].dot)}
                    aria-hidden="true"
                  />
                  {STAGE_META[stage.stage].label}
                </span>
              </th>
              <td className="px-5 py-2 text-right tabular-nums text-ink">
                {formatNumber(stage.count)}
              </td>
              <td className="px-5 py-2 text-right tabular-nums text-ink-secondary">
                {formatCurrency(stage.value)}
              </td>
              <td className="px-5 py-2 text-right tabular-nums text-ink-muted">
                {stage.stepConversion === null
                  ? "—"
                  : `${(stage.stepConversion * 100).toFixed(0)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
