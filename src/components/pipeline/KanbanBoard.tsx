"use client";

import { useState } from "react";
import { DealCard } from "./DealCard";
import type { ScoredLead } from "@/components/leads/LeadsTable";
import { STAGE_META } from "@/lib/constants";
import { LEAD_STAGES } from "@/lib/types";
import type { LeadStage } from "@/lib/types";
import { cn, formatCompactCurrency } from "@/lib/utils";

/**
 * Column-based pipeline with native HTML5 drag-and-drop — no drag library, so
 * the page stays light. Because dragging is unavailable on touch and to
 * keyboard users, every card also carries previous/next stage buttons that do
 * exactly the same thing.
 */
export function KanbanBoard({
  leads,
  onMove,
  onOpen,
}: {
  leads: ScoredLead[];
  onMove: (id: string, stage: LeadStage) => void;
  onOpen: (lead: ScoredLead) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<LeadStage | null>(null);

  const byStage = (stage: LeadStage) => leads.filter((lead) => lead.stage === stage);

  return (
    <div className="scroll-thin -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {LEAD_STAGES.map((stage, stageIndex) => {
        const meta = STAGE_META[stage];
        const items = byStage(stage);
        const total = items.reduce((sum, lead) => sum + lead.value, 0);
        const isTarget = dropTarget === stage;

        return (
          <section
            key={stage}
            aria-label={`${meta.label} — ${items.length} deals`}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              if (dropTarget !== stage) setDropTarget(stage);
            }}
            onDragLeave={(event) => {
              // Ignore bubbling from children leaving into the same column.
              if (event.currentTarget.contains(event.relatedTarget as Node)) return;
              setDropTarget((current) => (current === stage ? null : current));
            }}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain");
              if (id) onMove(id, stage);
              setDropTarget(null);
              setDraggingId(null);
            }}
            className={cn(
              "flex w-[272px] shrink-0 flex-col rounded-card border bg-page/40 transition-colors",
              isTarget ? "border-accent bg-accent-wash" : "border-line",
            )}
          >
            <header className="sticky top-0 rounded-t-card border-b border-line bg-surface px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)}
                    aria-hidden="true"
                  />
                  <span className="truncate text-[13px] font-semibold text-ink">{meta.label}</span>
                </span>
                <span className="shrink-0 rounded-full bg-sunken px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-ink-secondary">
                  {items.length}
                </span>
              </div>
              <p className="mt-1 text-[12px] tabular-nums text-ink-muted">
                {formatCompactCurrency(total)}
              </p>
            </header>

            <div className="scroll-thin flex max-h-[calc(100vh-16rem)] min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2">
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[12px] text-ink-muted">
                  {isTarget ? "Drop here" : "No deals"}
                </p>
              ) : (
                items.map((lead) => (
                  <DealCard
                    key={lead.id}
                    lead={lead}
                    dragging={draggingId === lead.id}
                    onDragStart={() => setDraggingId(lead.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropTarget(null);
                    }}
                    onOpen={() => onOpen(lead)}
                    onMovePrev={
                      stageIndex > 0
                        ? () => onMove(lead.id, LEAD_STAGES[stageIndex - 1])
                        : null
                    }
                    onMoveNext={
                      stageIndex < LEAD_STAGES.length - 1
                        ? () => onMove(lead.id, LEAD_STAGES[stageIndex + 1])
                        : null
                    }
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
