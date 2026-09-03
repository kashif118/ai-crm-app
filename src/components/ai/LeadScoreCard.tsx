"use client";

import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { ScorePill } from "@/components/ui/Badge";
import { TIER_META } from "@/lib/constants";
import type { LeadScore } from "@/lib/types";
import { cn } from "@/lib/utils";

const TIER_COLOR: Record<LeadScore["tier"], string> = {
  high: "var(--good)",
  medium: "var(--warning)",
  low: "var(--serious)",
};

/**
 * The lead scoring widget: a 0-100 score, the signals behind it, and the next
 * best action. Every point is attributed, so the score is auditable rather than
 * a number the rep has to take on faith.
 */
export function LeadScoreCard({
  score,
  className,
  compact = false,
}: {
  score: LeadScore;
  className?: string;
  compact?: boolean;
}) {
  const color = TIER_COLOR[score.tier];

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary">
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            AI lead score
          </p>
          <ScorePill tier={score.tier} />
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[28px] font-semibold leading-none text-ink">{score.score}</span>
          <span className="text-[13px] text-ink-muted">/ 100</span>
        </div>

        {/* Meter: fill carries severity, track is the same hue lightened */}
        <div
          className="relative mt-2.5 h-2 w-full overflow-hidden rounded-full"
          role="meter"
          aria-valuenow={score.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Lead score ${score.score} out of 100, ${TIER_META[score.tier].label} priority`}
        >
          <div className="absolute inset-0 opacity-20" style={{ backgroundColor: color }} />
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
            style={{ width: `${score.score}%`, backgroundColor: color }}
          />
        </div>

        <p className="mt-2.5 text-[13px] leading-relaxed text-ink-secondary">
          {score.rationale}
        </p>
      </div>

      <div className="rounded-lg border border-line bg-sunken p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
          Next best action
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink">{score.nextAction}</p>
      </div>

      {!compact ? (
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            Signals
          </p>
          <ul className="space-y-2">
            {score.factors.map((factor) => (
              <li key={factor.label} className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex h-5 shrink-0 items-center gap-0.5 rounded px-1.5 text-[11px] font-semibold tabular-nums",
                    factor.impact >= 0
                      ? "bg-good/10 text-good-text"
                      : "bg-critical/10 text-critical-text",
                  )}
                >
                  {factor.impact >= 0 ? (
                    <TrendingUp className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="h-3 w-3" aria-hidden="true" />
                  )}
                  {factor.impact > 0 ? `+${factor.impact}` : factor.impact}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-ink">{factor.label}</span>
                  <span className="block text-[12px] leading-snug text-ink-muted">
                    {factor.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
