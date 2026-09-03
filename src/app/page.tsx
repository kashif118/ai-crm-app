"use client";

import { useMemo } from "react";
import { Briefcase, DollarSign, Target, Users } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { PipelineFunnel } from "@/components/dashboard/PipelineFunnel";
import { PriorityLeads } from "@/components/dashboard/PriorityLeads";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { StatTile } from "@/components/dashboard/StatTile";
import { TaskList } from "@/components/dashboard/TaskList";
import { Skeleton } from "@/components/ui/EmptyState";
import { useCrm } from "@/providers/CrmProvider";
import { buildFunnel, buildMetrics } from "@/lib/analytics";
import { formatCompactCurrency, formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const { leads, activities, hydrated } = useCrm();

  const metrics = useMemo(() => buildMetrics(leads), [leads]);
  const funnel = useMemo(() => buildFunnel(leads), [leads]);

  if (!hydrated) return <DashboardSkeleton />;

  return (
    <div className="space-y-5">
      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total leads"
          value={formatNumber(metrics.totalLeads.value)}
          delta={metrics.totalLeads.delta}
          series={metrics.totalLeads.series.map((point) => point.value)}
          icon={Users}
        />
        <StatTile
          label="Active deals"
          value={formatNumber(metrics.activeDeals.value)}
          delta={metrics.activeDeals.delta}
          series={metrics.activeDeals.series.map((point) => point.value)}
          icon={Briefcase}
        />
        <StatTile
          label="Conversion rate"
          value={`${metrics.conversionRate.value.toFixed(1)}%`}
          delta={metrics.conversionRate.delta}
          series={metrics.conversionRate.series.map((point) => point.value)}
          icon={Target}
        />
        <StatTile
          label="Monthly revenue"
          value={formatCompactCurrency(metrics.monthlyRevenue.value)}
          delta={metrics.monthlyRevenue.delta}
          series={metrics.monthlyRevenue.series.map((point) => point.value)}
          icon={DollarSign}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart series={metrics.monthlyRevenue.series} />
        </div>
        <PipelineFunnel stages={funnel} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <PriorityLeads leads={leads} />
        <TaskList />
        <ActivityFeed activities={activities} />
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[132px]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[312px] lg:col-span-2" />
        <Skeleton className="h-[312px]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[280px]" />
        ))}
      </div>
    </div>
  );
}
