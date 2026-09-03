"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, Pencil, Trash2, UserRoundSearch } from "lucide-react";
import { ScorePill, StageBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { LeadScore, Lead } from "@/lib/types";
import { cn, formatCurrency, formatRelative, initials } from "@/lib/utils";

export type SortKey = "company" | "name" | "stage" | "value" | "score" | "lastContactedAt";
export type SortDirection = "asc" | "desc";

export interface ScoredLead extends Lead {
  ai: LeadScore;
}

const COLUMNS: Array<{
  key: SortKey | null;
  label: string;
  align?: "right";
  className?: string;
}> = [
  { key: "name", label: "Contact" },
  { key: "company", label: "Company", className: "hidden md:table-cell" },
  { key: "stage", label: "Status" },
  { key: "value", label: "Deal value", align: "right" },
  { key: "score", label: "AI score", className: "hidden sm:table-cell" },
  { key: "lastContactedAt", label: "Last contact", className: "hidden lg:table-cell" },
  { key: null, label: "Actions", align: "right" },
];

export function LeadsTable({
  leads,
  sortKey,
  sortDirection,
  onSort,
  onSelect,
  onEdit,
  onDelete,
  emptyAction,
}: {
  leads: ScoredLead[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  onSelect: (lead: ScoredLead) => void;
  onEdit: (lead: ScoredLead) => void;
  onDelete: (lead: ScoredLead) => void;
  emptyAction?: React.ReactNode;
}) {
  if (leads.length === 0) {
    return (
      <EmptyState
        icon={UserRoundSearch}
        title="No leads match those filters"
        description="Try a different search term, or clear the status filter to see the full book."
        action={emptyAction}
      />
    );
  }

  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">
          Leads, sorted by {sortKey} {sortDirection === "asc" ? "ascending" : "descending"}
        </caption>
        <thead>
          <tr className="border-b border-line">
            {COLUMNS.map((column) => {
              const active = column.key !== null && column.key === sortKey;
              const SortIcon = !active
                ? ChevronsUpDown
                : sortDirection === "asc"
                  ? ArrowUp
                  : ArrowDown;

              return (
                <th
                  key={column.label}
                  scope="col"
                  aria-sort={
                    active ? (sortDirection === "asc" ? "ascending" : "descending") : undefined
                  }
                  className={cn(
                    "px-4 py-2.5 text-left text-[12px] font-medium text-ink-muted",
                    column.align === "right" && "text-right",
                    column.className,
                  )}
                >
                  {column.key ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.key as SortKey)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded transition-colors hover:text-ink",
                        active && "text-ink",
                        column.align === "right" && "flex-row-reverse",
                      )}
                    >
                      {column.label}
                      <SortIcon className="h-3 w-3" aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="sr-only">{column.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              onClick={() => onSelect(lead)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(lead);
                }
              }}
              className="group cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-hover focus:bg-hover focus:outline-none"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken text-[11px] font-semibold text-ink-secondary"
                    aria-hidden="true"
                  >
                    {initials(lead.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{lead.name}</span>
                    <span className="block truncate text-[12px] text-ink-muted">{lead.email}</span>
                    <span className="block truncate text-[12px] text-ink-muted md:hidden">
                      {lead.company}
                    </span>
                  </span>
                </div>
              </td>

              <td className="hidden px-4 py-3 md:table-cell">
                <span className="block truncate text-ink-secondary">{lead.company}</span>
                <span className="block truncate text-[12px] text-ink-muted">{lead.phone}</span>
              </td>

              <td className="px-4 py-3">
                <StageBadge stage={lead.stage} />
              </td>

              <td className="px-4 py-3 text-right font-medium tabular-nums text-ink">
                {formatCurrency(lead.value)}
              </td>

              <td className="hidden px-4 py-3 sm:table-cell">
                <ScorePill tier={lead.ai.tier} score={lead.ai.score} />
              </td>

              <td className="hidden px-4 py-3 text-ink-muted lg:table-cell">
                {formatRelative(lead.lastContactedAt)}
              </td>

              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-0.5">
                  <button
                    type="button"
                    aria-label={`Edit ${lead.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(lead);
                    }}
                    className="rounded-md p-1.5 text-ink-muted opacity-0 transition-colors hover:bg-sunken hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${lead.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(lead);
                    }}
                    className="rounded-md p-1.5 text-ink-muted opacity-0 transition-colors hover:bg-sunken hover:text-critical-text focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
