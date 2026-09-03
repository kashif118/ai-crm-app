import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/**
 * Stat-tile contract: label · value · delta (signed, vs a named period) ·
 * trend. The value uses proportional figures — `tabular-nums` makes a large
 * standalone number look loose.
 */
export function StatTile({
  label,
  value,
  delta,
  deltaLabel = "vs last month",
  series,
  icon: Icon,
  /** False when an increase is bad (e.g. cost, churn). */
  upIsGood = true,
}: {
  label: string;
  value: string;
  delta: number | null;
  deltaLabel?: string;
  series: number[];
  icon: LucideIcon;
  upIsGood?: boolean;
}) {
  const direction = delta === null ? "flat" : delta > 0.05 ? "up" : delta < -0.05 ? "down" : "flat";
  const good = direction === "flat" ? null : (direction === "up") === upIsGood;
  const DeltaIcon =
    direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <Card interactive className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink-secondary">{label}</p>
          <p className="mt-2 text-[30px] font-semibold leading-none tracking-tight text-ink">
            {value}
          </p>
        </div>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sunken"
          aria-hidden="true"
        >
          <Icon className="h-4 w-4 text-ink-muted" />
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p
          className={cn(
            "flex items-center gap-1 text-[13px] font-medium",
            good === null ? "text-ink-muted" : good ? "text-good-text" : "text-critical-text",
          )}
        >
          <DeltaIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="tabular-nums">
            {delta === null
              ? "no prior period"
              : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
          </span>
          <span className="font-normal text-ink-muted">{delta === null ? "" : deltaLabel}</span>
        </p>
        <Sparkline values={series} />
      </div>
    </Card>
  );
}
