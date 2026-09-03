"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import { LeadFormModal } from "@/components/leads/LeadFormModal";
import { LeadsTable } from "@/components/leads/LeadsTable";
import type { ScoredLead, SortDirection, SortKey } from "@/components/leads/LeadsTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/EmptyState";
import { useCrm } from "@/providers/CrmProvider";
import { OWNERS, STAGE_META } from "@/lib/constants";
import { scoreLead } from "@/lib/scoring";
import { LEAD_STAGES } from "@/lib/types";
import type { Lead, LeadDraft, LeadStage } from "@/lib/types";
import { cn, formatCompactCurrency } from "@/lib/utils";

type StageFilter = LeadStage | "all";
type OwnerFilter = string | "all";

const SELECT_CLASS =
  "h-9 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink outline-none transition-colors hover:border-line-strong focus:border-accent";

export default function LeadsPage() {
  const { leads, hydrated, addLead, updateLead, deleteLead, logTouch } = useCrm();

  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Lead | null>(null);

  // Scoring runs over the whole book once, then filtering and sorting work on
  // the scored list — so the AI column can be sorted like any other.
  const scored = useMemo<ScoredLead[]>(
    () => leads.map((lead) => ({ ...lead, ai: scoreLead(lead) })),
    [leads],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matches = scored.filter((lead) => {
      if (stageFilter !== "all" && lead.stage !== stageFilter) return false;
      if (ownerFilter !== "all" && lead.owner !== ownerFilter) return false;
      if (!needle) return true;
      return (
        lead.name.toLowerCase().includes(needle) ||
        lead.company.toLowerCase().includes(needle) ||
        lead.email.toLowerCase().includes(needle) ||
        lead.phone.toLowerCase().includes(needle) ||
        lead.notes.toLowerCase().includes(needle)
      );
    });

    const stageRank = (stage: LeadStage) => LEAD_STAGES.indexOf(stage);
    const direction = sortDirection === "asc" ? 1 : -1;

    return matches.sort((a, b) => {
      switch (sortKey) {
        case "value":
          return (a.value - b.value) * direction;
        case "score":
          return (a.ai.score - b.ai.score) * direction;
        case "stage":
          return (stageRank(a.stage) - stageRank(b.stage)) * direction;
        case "lastContactedAt": {
          // Never-contacted leads sort as the oldest possible touch.
          const left = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0;
          const right = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0;
          return (left - right) * direction;
        }
        case "company":
          return a.company.localeCompare(b.company) * direction;
        default:
          return a.name.localeCompare(b.name) * direction;
      }
    });
  }, [scored, query, stageFilter, ownerFilter, sortKey, sortDirection]);

  const selected = selectedId ? (filtered.find((lead) => lead.id === selectedId) ?? scored.find((lead) => lead.id === selectedId) ?? null) : null;
  const filtersActive = query !== "" || stageFilter !== "all" || ownerFilter !== "all";
  const totalValue = filtered.reduce((sum, lead) => sum + lead.value, 0);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Numbers are most useful highest-first; names alphabetically.
      setSortDirection(key === "company" || key === "name" ? "asc" : "desc");
    }
  };

  const handleSubmit = (draft: LeadDraft) => {
    if (editing) updateLead(editing.id, draft);
    else addLead(draft);
    setEditing(null);
  };

  const clearFilters = () => {
    setQuery("");
    setStageFilter("all");
    setOwnerFilter("all");
  };

  if (!hydrated) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-12" />
        <Skeleton className="h-[520px]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* One filter row above everything it scopes */}
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
            placeholder="Search name, company, email or notes…"
            aria-label="Search leads"
            className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-muted hover:border-line-strong focus:border-accent"
          />
        </div>

        <label className="sr-only" htmlFor="stage-filter">
          Filter by status
        </label>
        <select
          id="stage-filter"
          value={stageFilter}
          onChange={(event) => setStageFilter(event.target.value as StageFilter)}
          className={SELECT_CLASS}
        >
          <option value="all">All statuses</option>
          {LEAD_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_META[stage].label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="owner-filter">
          Filter by owner
        </label>
        <select
          id="owner-filter"
          value={ownerFilter}
          onChange={(event) => setOwnerFilter(event.target.value)}
          className={cn(SELECT_CLASS, "hidden sm:block")}
        >
          <option value="all">All owners</option>
          {OWNERS.map((owner) => (
            <option key={owner} value={owner}>
              {owner}
            </option>
          ))}
        </select>

        {filtersActive ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </Button>
        ) : null}

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add lead
        </Button>
      </div>

      <p className="text-[12px] text-ink-muted" aria-live="polite">
        Showing <span className="font-medium text-ink-secondary">{filtered.length}</span> of{" "}
        {leads.length} leads · {formatCompactCurrency(totalValue)} combined value
      </p>

      <Card interactive>
        <LeadsTable
          leads={filtered}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onSelect={(lead) => setSelectedId(lead.id)}
          onEdit={(lead) => {
            setEditing(lead);
            setFormOpen(true);
          }}
          onDelete={(lead) => setPendingDelete(lead)}
          emptyAction={
            filtersActive ? (
              <Button size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add your first lead
              </Button>
            )
          }
        />
      </Card>

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
        onSubmit={handleSubmit}
      />

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete this lead?"
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
              Delete lead
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-secondary">
          {pendingDelete ? (
            <>
              <span className="font-medium text-ink">{pendingDelete.name}</span> at{" "}
              {pendingDelete.company} will be removed, along with any follow-up tasks attached to
              them. This cannot be undone.
            </>
          ) : null}
        </p>
      </Modal>
    </div>
  );
}
