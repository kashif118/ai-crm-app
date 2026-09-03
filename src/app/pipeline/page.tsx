"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import { LeadFormModal } from "@/components/leads/LeadFormModal";
import type { ScoredLead } from "@/components/leads/LeadsTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/EmptyState";
import { useCrm } from "@/providers/CrmProvider";
import { OWNERS } from "@/lib/constants";
import { scoreLead } from "@/lib/scoring";
import { isOpenStage } from "@/lib/types";
import type { Lead, LeadDraft } from "@/lib/types";
import { formatCompactCurrency } from "@/lib/utils";

export default function PipelinePage() {
  const { leads, hydrated, moveLead, addLead, updateLead, deleteLead, logTouch } = useCrm();

  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Lead | null>(null);

  const scored = useMemo<ScoredLead[]>(
    () => leads.map((lead) => ({ ...lead, ai: scoreLead(lead) })),
    [leads],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return scored.filter((lead) => {
      if (ownerFilter !== "all" && lead.owner !== ownerFilter) return false;
      if (!needle) return true;
      return (
        lead.company.toLowerCase().includes(needle) || lead.name.toLowerCase().includes(needle)
      );
    });
  }, [scored, query, ownerFilter]);

  const selected = selectedId ? (scored.find((lead) => lead.id === selectedId) ?? null) : null;
  const openValue = visible
    .filter((lead) => isOpenStage(lead.stage))
    .reduce((sum, lead) => sum + lead.value, 0);

  if (!hydrated) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-12" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-[420px] w-[272px] shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter the board by company or contact…"
            aria-label="Filter pipeline"
            className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-muted hover:border-line-strong focus:border-accent"
          />
        </div>

        <label className="sr-only" htmlFor="pipeline-owner">
          Filter by owner
        </label>
        <select
          id="pipeline-owner"
          value={ownerFilter}
          onChange={(event) => setOwnerFilter(event.target.value)}
          className="h-9 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink outline-none transition-colors hover:border-line-strong focus:border-accent"
        >
          <option value="all">All owners</option>
          {OWNERS.map((owner) => (
            <option key={owner} value={owner}>
              {owner}
            </option>
          ))}
        </select>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add deal
        </Button>
      </div>

      <p className="text-[12px] text-ink-muted" aria-live="polite">
        {formatCompactCurrency(openValue)} in open pipeline · drag a card between columns, or use
        the arrows on a card to move it
      </p>

      <KanbanBoard
        leads={visible}
        onMove={moveLead}
        onOpen={(lead) => setSelectedId(lead.id)}
      />

      <LeadDetailDrawer
        lead={selected}
        onClose={() => setSelectedId(null)}
        onEdit={(lead) => {
          setEditing(lead);
          setFormOpen(true);
        }}
        onDelete={(lead) => setPendingDelete(lead)}
        onLogTouch={(lead) => logTouch(lead.id)}
      />

      <LeadFormModal
        open={formOpen}
        lead={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={(draft: LeadDraft) => {
          if (editing) updateLead(editing.id, draft);
          else addLead(draft);
          setEditing(null);
        }}
      />

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete this deal?"
        size="max-w-md"
        footer={
          <>
            <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (pendingDelete) {
                  deleteLead(pendingDelete.id);
                  if (selectedId === pendingDelete.id) setSelectedId(null);
                }
                setPendingDelete(null);
              }}
            >
              Delete deal
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-secondary">
          {pendingDelete
            ? `${pendingDelete.company} will be removed from the pipeline. This cannot be undone.`
            : null}
        </p>
      </Modal>
    </div>
  );
}
