import { FUNNEL_STAGES, isOpenStage } from "./types";
import type { Lead, LeadStage, Task } from "./types";
import { monthKey, monthLabel } from "./utils";

/**
 * Every number on the dashboard is derived from the lead list here, so the
 * charts react to edits made anywhere else in the app. Nothing is pre-baked.
 */

export interface MetricSeriesPoint {
  key: string;
  label: string;
  value: number;
}

export interface Metric {
  value: number;
  /** Percentage change vs the previous period; null when there is no base. */
  delta: number | null;
  series: MetricSeriesPoint[];
}

export interface DashboardMetrics {
  totalLeads: Metric;
  activeDeals: Metric;
  conversionRate: Metric;
  monthlyRevenue: Metric;
  pipelineValue: number;
  averageDealSize: number;
}

export interface FunnelStagePoint {
  stage: LeadStage;
  label: string;
  count: number;
  value: number;
  /** Share of the widest stage, 0-1 — drives the bar width. */
  ratio: number;
  /** Share of the previous stage that reached this one, 0-1. */
  stepConversion: number | null;
}

/** The last `count` month keys, oldest first, ending with the current month. */
export function lastMonthKeys(count: number, now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d.toISOString()));
  }
  return keys;
}

function endOfMonth(key: string): Date {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month, 0, 23, 59, 59, 999);
}

function isOpen(lead: Lead): boolean {
  return isOpenStage(lead.stage);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function toSeries(keys: string[], valueOf: (key: string) => number): MetricSeriesPoint[] {
  return keys.map((key) => ({ key, label: monthLabel(key), value: valueOf(key) }));
}

function deltaFromSeries(series: MetricSeriesPoint[]): number | null {
  if (series.length < 2) return null;
  return pctChange(series[series.length - 1].value, series[series.length - 2].value);
}

export function buildMetrics(leads: Lead[], now: Date = new Date()): DashboardMetrics {
  const keys = lastMonthKeys(12, now);

  // Total leads — cumulative count of everything created up to each month end.
  const totalSeries = toSeries(keys, (key) => {
    const cutoff = endOfMonth(key);
    return leads.filter((lead) => new Date(lead.createdAt) <= cutoff).length;
  });

  // Active deals — open at each month end (created by then, not yet closed).
  const activeSeries = toSeries(keys, (key) => {
    const cutoff = endOfMonth(key);
    return leads.filter((lead) => {
      if (new Date(lead.createdAt) > cutoff) return false;
      if (!lead.closedAt) return true;
      return new Date(lead.closedAt) > cutoff;
    }).length;
  });

  // Conversion rate — won as a share of everything closed in the month.
  const conversionSeries = toSeries(keys, (key) => {
    const closed = leads.filter((lead) => lead.closedAt && monthKey(lead.closedAt) === key);
    if (closed.length === 0) return 0;
    const won = closed.filter((lead) => lead.stage === "won").length;
    return (won / closed.length) * 100;
  });

  // Revenue — booked value of deals won in the month.
  const revenueSeries = toSeries(keys, (key) =>
    leads
      .filter((lead) => lead.stage === "won" && lead.closedAt && monthKey(lead.closedAt) === key)
      .reduce((total, lead) => total + lead.value, 0),
  );

  const open = leads.filter(isOpen);
  const closedAll = leads.filter((lead) => lead.stage === "won" || lead.stage === "lost");
  const wonAll = leads.filter((lead) => lead.stage === "won");

  return {
    totalLeads: {
      value: leads.length,
      delta: deltaFromSeries(totalSeries),
      series: totalSeries,
    },
    activeDeals: {
      value: open.length,
      delta: deltaFromSeries(activeSeries),
      series: activeSeries,
    },
    conversionRate: {
      value: closedAll.length === 0 ? 0 : (wonAll.length / closedAll.length) * 100,
      delta: deltaFromSeries(conversionSeries),
      series: conversionSeries,
    },
    monthlyRevenue: {
      value: revenueSeries[revenueSeries.length - 1]?.value ?? 0,
      delta: deltaFromSeries(revenueSeries),
      series: revenueSeries,
    },
    pipelineValue: open.reduce((total, lead) => total + lead.value, 0),
    averageDealSize: wonAll.length === 0 ? 0 : Math.round(
      wonAll.reduce((total, lead) => total + lead.value, 0) / wonAll.length,
    ),
  };
}

/**
 * Historical funnel: of every lead ever created, how many reached each stage.
 *
 * This reads `furthestStage`, not the current one — a deal that got to
 * Negotiation and then lost still counts as having reached Negotiation. Using
 * the current stage would drop lost deals out of the funnel entirely and make
 * the drop-off between stages meaningless.
 */
export function buildFunnel(leads: Lead[]): FunnelStagePoint[] {
  const stageOrder = FUNNEL_STAGES;

  const points = stageOrder.map((stage, index) => {
    const atOrBeyond = leads.filter(
      (lead) => stageOrder.indexOf(lead.furthestStage) >= index,
    );
    return {
      stage,
      label: stage.charAt(0).toUpperCase() + stage.slice(1),
      count: atOrBeyond.length,
      value: atOrBeyond.reduce((total, lead) => total + lead.value, 0),
      ratio: 0,
      stepConversion: null as number | null,
    };
  });

  const widest = points[0]?.count ?? 0;
  return points.map((point, index) => ({
    ...point,
    ratio: widest === 0 ? 0 : point.count / widest,
    stepConversion:
      index === 0 || points[index - 1].count === 0
        ? null
        : point.count / points[index - 1].count,
  }));
}

/** Open tasks, soonest first — overdue items float to the top naturally. */
export function upcomingTasks(tasks: Task[], limit = 5): Task[] {
  return tasks
    .filter((task) => !task.done)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, limit);
}
