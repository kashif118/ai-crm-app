"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CalendarClock,
  Mail,
  MessageSquareText,
  Pencil,
  Phone,
  PhoneCall,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AssistantPanel } from "@/components/ai/AssistantPanel";
import { LeadScoreCard } from "@/components/ai/LeadScoreCard";
import { Button } from "@/components/ui/Button";
import { StageBadge } from "@/components/ui/Badge";
import type { ScoredLead } from "./LeadsTable";
import { cn, formatCurrency, formatDate, formatRelative, initials } from "@/lib/utils";

type Tab = "overview" | "assistant";

/**
 * Right-hand drawer for a single lead: the scoring breakdown, the record, and
 * an assistant scoped to this deal.
 */
export function LeadDetailDrawer({
  lead,
  onClose,
  onEdit,
  onDelete,
  onLogTouch,
}: {
  lead: ScoredLead | null;
  onClose: () => void;
  onEdit: (lead: ScoredLead) => void;
  onDelete: (lead: ScoredLead) => void;
  onLogTouch: (lead: ScoredLead) => void;
}) {
  const open = lead !== null;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-full max-w-[420px] flex-col border-l border-line bg-surface shadow-2xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-label={lead ? `${lead.company} details` : "Lead details"}
        aria-hidden={!open}
      >
        {/* Keyed by lead, so opening a different record starts on the Overview
            tab and gives the assistant a fresh conversation. */}
        {lead ? (
          <DrawerContent
            key={lead.id}
            lead={lead}
            onClose={onClose}
            onEdit={onEdit}
            onDelete={onDelete}
            onLogTouch={onLogTouch}
          />
        ) : null}
      </aside>
    </>
  );
}

function DrawerContent({
  lead,
  onClose,
  onEdit,
  onDelete,
  onLogTouch,
}: {
  lead: ScoredLead;
  onClose: () => void;
  onEdit: (lead: ScoredLead) => void;
  onDelete: (lead: ScoredLead) => void;
  onLogTouch: (lead: ScoredLead) => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <>
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sunken text-[13px] font-semibold text-ink-secondary"
          aria-hidden="true"
        >
          {initials(lead.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink">{lead.name}</p>
          <p className="truncate text-[13px] text-ink-muted">{lead.company}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close details">
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-b border-line px-3" role="tablist">
        {(["overview", "assistant"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "relative px-3 py-2.5 text-[13px] font-medium transition-colors",
              tab === value ? "text-ink" : "text-ink-muted hover:text-ink-secondary",
            )}
          >
            {value === "overview" ? "Overview" : "Ask AI"}
            {tab === value ? (
              <span
                className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent"
                aria-hidden="true"
              />
            ) : null}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="scroll-thin min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <StageBadge stage={lead.stage} />
            <span className="text-lg font-semibold tabular-nums text-ink">
              {formatCurrency(lead.value)}
            </span>
          </div>

          <LeadScoreCard score={lead.ai} />

          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
              Record
            </p>
            <dl className="space-y-2.5">
              <DetailRow icon={Mail} label="Email">
                <a href={`mailto:${lead.email}`} className="text-accent hover:underline">
                  {lead.email}
                </a>
              </DetailRow>
              <DetailRow icon={Phone} label="Phone">
                {lead.phone || "—"}
              </DetailRow>
              <DetailRow icon={Building2} label="Company">
                {lead.company}
              </DetailRow>
              <DetailRow icon={Tag} label="Source">
                {lead.source}
              </DetailRow>
              <DetailRow icon={User} label="Owner">
                {lead.owner}
              </DetailRow>
              <DetailRow icon={CalendarClock} label="Last contact">
                {formatRelative(lead.lastContactedAt)} · {lead.touches} touches
              </DetailRow>
              <DetailRow icon={CalendarClock} label="Created">
                {formatDate(lead.createdAt)}
              </DetailRow>
            </dl>
          </div>

          {lead.notes ? (
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                Notes
              </p>
              <p className="rounded-lg border border-line bg-sunken p-3 text-[13px] leading-relaxed text-ink-secondary">
                {lead.notes}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <AssistantPanel focusLeadId={lead.id} compact className="min-h-0 flex-1" />
      )}

      {tab === "overview" ? (
        <div className="flex items-center gap-2 border-t border-line px-5 py-3">
          <Button variant="primary" size="sm" onClick={() => onLogTouch(lead)}>
            <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
            Log touch
          </Button>
          <Button size="sm" onClick={() => setTab("assistant")}>
            <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
            Ask AI
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(lead)} aria-label="Edit lead">
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(lead)}
              aria-label="Delete lead"
              className="hover:text-critical-text"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
      <dt className="w-24 shrink-0 text-[13px] text-ink-muted">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-[13px] text-ink-secondary">{children}</dd>
    </div>
  );
}
