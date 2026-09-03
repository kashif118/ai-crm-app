"use client";

import { ChevronLeft, ChevronRight, Clock, GripVertical } from "lucide-react";
import { ScorePill } from "@/components/ui/Badge";
import type { ScoredLead } from "@/components/leads/LeadsTable";
import { cn, formatCompactCurrency, formatRelative, initials } from "@/lib/utils";

export function DealCard({
  lead,
  onOpen,
  onMovePrev,
  onMoveNext,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  lead: ScoredLead;
  onOpen: () => void;
  onMovePrev: (() => void) | null;
  onMoveNext: (() => void) | null;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  // Taken from the score rather than re-derived from the clock: the recency
  // signal already went negative past the staleness threshold, and reading the
  // current time during render would make this component impure.
  const stale = lead.ai.factors.some(
    (factor) => factor.label === "Contact recency" && factor.impact < 0,
  );

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", lead.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      className={cn(
        "elevate elevate-hover group cursor-grab rounded-lg border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(11,11,11,0.04)] active:cursor-grabbing",
        dragging && "opacity-40",
      )}
      aria-label={`${lead.company}, ${lead.name}, ${formatCompactCurrency(lead.value)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink">{lead.company}</p>
          <p className="truncate text-[12px] text-ink-muted">{lead.name}</p>
        </div>
        <GripVertical
          className="h-3.5 w-3.5 shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold tabular-nums text-ink">
          {formatCompactCurrency(lead.value)}
        </span>
        <ScorePill tier={lead.ai.tier} score={lead.ai.score} />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5">
        <span
          className={cn(
            "flex items-center gap-1 text-[11px]",
            stale ? "text-serious" : "text-ink-muted",
          )}
        >
          <Clock className="h-3 w-3" aria-hidden="true" />
          {formatRelative(lead.lastContactedAt)}
        </span>

        <span className="flex items-center gap-1">
          {/* Keyboard and touch equivalent of dragging the card */}
          <button
            type="button"
            disabled={!onMovePrev}
            aria-label={`Move ${lead.company} to the previous stage`}
            onClick={(event) => {
              event.stopPropagation();
              onMovePrev?.();
            }}
            className="rounded p-0.5 text-ink-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full bg-sunken text-[9px] font-semibold text-ink-secondary"
            title={lead.owner}
          >
            {initials(lead.owner)}
          </span>
          <button
            type="button"
            disabled={!onMoveNext}
            aria-label={`Move ${lead.company} to the next stage`}
            onClick={(event) => {
              event.stopPropagation();
              onMoveNext?.();
            }}
            className="rounded p-0.5 text-ink-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      </div>
    </article>
  );
}
