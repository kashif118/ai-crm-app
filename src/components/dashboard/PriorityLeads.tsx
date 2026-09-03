"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Users } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScorePill, StageBadge } from "@/components/ui/Badge";
import { rankLeads } from "@/lib/scoring";
import { isOpenStage } from "@/lib/types";
import type { Lead } from "@/lib/types";
import { formatCompactCurrency, initials } from "@/lib/utils";

/** The AI's call list: open deals ranked by score, with the reason attached. */
export function PriorityLeads({ leads }: { leads: Lead[] }) {
  const ranked = rankLeads(leads.filter((lead) => isOpenStage(lead.stage))).slice(0, 4);

  return (
    <Card interactive className="flex h-full flex-col">
      <CardHeader
        title={
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            AI priority list
          </span>
        }
        subtitle="Who to work next, and why"
        action={
          <Link
            href="/leads"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-ink-muted transition-colors hover:bg-hover hover:text-ink"
          >
            All leads
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        }
      />

      {ranked.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No open deals"
          description="Every deal is closed. Add a lead to start a new pipeline."
        />
      ) : (
        <ul className="flex-1 divide-y divide-line">
          {ranked.map((lead) => (
            <li key={lead.id} className="px-5 py-3.5">
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken text-[11px] font-semibold text-ink-secondary"
                  aria-hidden="true"
                >
                  {initials(lead.name)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">{lead.company}</p>
                      <p className="truncate text-[12px] text-ink-muted">{lead.name}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[13px] font-semibold tabular-nums text-ink">
                        {formatCompactCurrency(lead.value)}
                      </span>
                      <ScorePill tier={lead.ai.tier} score={lead.ai.score} />
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <StageBadge stage={lead.stage} />
                  </div>

                  <p className="mt-2 text-[12px] leading-snug text-ink-secondary">
                    {lead.ai.nextAction}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
