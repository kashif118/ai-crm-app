"use client";

import { useMemo } from "react";
import { Bot, Database, ShieldCheck, Sparkles } from "lucide-react";
import { AssistantPanel } from "@/components/ai/AssistantPanel";
import { Card, CardHeader } from "@/components/ui/Card";
import { ScorePill } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/EmptyState";
import { useCrm } from "@/providers/CrmProvider";
import { buildMetrics } from "@/lib/analytics";
import { rankLeads } from "@/lib/scoring";
import { isOpenStage } from "@/lib/types";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";

export default function AssistantPage() {
  const { leads, hydrated } = useCrm();

  const { metrics, ranked } = useMemo(() => {
    const open = leads.filter((lead) => isOpenStage(lead.stage));
    return { metrics: buildMetrics(leads), ranked: rankLeads(open).slice(0, 5) };
  }, [leads]);

  if (!hydrated) {
    return (
      <div className="grid gap-4 lg:grid-cols-3" aria-busy="true">
        <Skeleton className="h-[640px] lg:col-span-2" />
        <Skeleton className="h-[640px]" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="flex h-[calc(100vh-9rem)] min-h-[520px] flex-col lg:col-span-2">
        <CardHeader
          title={
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              AI sales assistant
            </span>
          }
          subtitle="Ask about any deal, or have it write the email for you"
        />
        <AssistantPanel className="min-h-0 flex-1" />
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
                What it can see
              </span>
            }
            subtitle="The snapshot sent with every question"
          />
          <dl className="divide-y divide-line">
            <ContextRow label="Leads" value={String(metrics.totalLeads.value)} />
            <ContextRow label="Open deals" value={String(metrics.activeDeals.value)} />
            <ContextRow label="Open pipeline" value={formatCurrency(metrics.pipelineValue)} />
            <ContextRow
              label="Revenue this month"
              value={formatCurrency(metrics.monthlyRevenue.value)}
            />
            <ContextRow
              label="Win rate"
              value={`${metrics.conversionRate.value.toFixed(1)}%`}
            />
            <ContextRow
              label="Average won deal"
              value={formatCurrency(metrics.averageDealSize)}
            />
          </dl>
        </Card>

        <Card>
          <CardHeader title="Top-scoring deals" subtitle="Ranked by the lead scoring engine" />
          <ul className="divide-y divide-line">
            {ranked.map((lead) => (
              <li key={lead.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{lead.company}</p>
                  <p className="truncate text-[12px] text-ink-muted">
                    {lead.name} · {formatCompactCurrency(lead.value)}
                  </p>
                </div>
                <ScorePill tier={lead.ai.tier} score={lead.ai.score} />
              </li>
            ))}
            {ranked.length === 0 ? (
              <li className="px-5 py-4 text-[13px] text-ink-muted">No open deals to rank.</li>
            ) : null}
          </ul>
        </Card>

        <Card className="p-5">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
            <ShieldCheck className="h-3.5 w-3.5 text-good" aria-hidden="true" />
            How this works
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
            Questions are answered against the pipeline snapshot above, never against invented
            data. With an{" "}
            <code className="rounded bg-sunken px-1 py-0.5 font-mono text-[12px]">
              ANTHROPIC_API_KEY
            </code>{" "}
            configured, the request is routed to Claude. Without one, the built-in rule engine
            answers instead, so the feature works on a fresh deploy.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-muted">
            <Bot className="h-3 w-3" aria-hidden="true" />
            Every reply is labelled with the engine that produced it.
          </p>
        </Card>
      </div>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-2.5">
      <dt className="text-[13px] text-ink-muted">{label}</dt>
      <dd className="text-[13px] font-medium tabular-nums text-ink">{value}</dd>
    </div>
  );
}
