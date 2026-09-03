import { CircleCheck, CircleX, Flame, Minus, Snowflake } from "lucide-react";
import { STAGE_META, TIER_META } from "@/lib/constants";
import type { LeadStage, ScoreTier } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Badges pair a colored mark with a written label, so state is never carried by
 * color alone. The label text stays in ink tokens rather than the mark color —
 * light hues are illegible as text on the surface.
 */
export function StageBadge({ stage, className }: { stage: LeadStage; className?: string }) {
  const meta = STAGE_META[stage];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-sunken px-2 py-0.5 text-[12px] font-medium text-ink-secondary",
        className,
      )}
    >
      {stage === "won" ? (
        <CircleCheck className="h-3 w-3 text-good" aria-hidden="true" />
      ) : stage === "lost" ? (
        <CircleX className="h-3 w-3 text-critical" aria-hidden="true" />
      ) : (
        <span className={cn("h-2 w-2 rounded-full", meta.dot)} aria-hidden="true" />
      )}
      {meta.label}
    </span>
  );
}

const TIER_ICON = {
  high: Flame,
  medium: Minus,
  low: Snowflake,
} as const;

export function ScorePill({
  tier,
  score,
  className,
}: {
  tier: ScoreTier;
  score?: number;
  className?: string;
}) {
  const meta = TIER_META[tier];
  const Icon = TIER_ICON[tier];
  return (
    <span
      title={meta.hint}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-sunken px-2 py-0.5 text-[12px] font-medium text-ink-secondary ring-1 ring-inset",
        meta.ring,
        className,
      )}
    >
      <Icon
        className={cn(
          "h-3 w-3",
          tier === "high" ? "text-good" : tier === "medium" ? "text-warning" : "text-serious",
        )}
        aria-hidden="true"
      />
      {meta.label}
      {typeof score === "number" ? (
        <span className="tabular-nums text-ink-muted">{score}</span>
      ) : null}
    </span>
  );
}

export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-line bg-sunken px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
