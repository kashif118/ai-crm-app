import type { LeadStage, ScoreTier } from "./types";

export interface StageMeta {
  label: string;
  /** Short description used in the Kanban column header tooltip. */
  hint: string;
  /** Tailwind class painting the stage dot. */
  dot: string;
  /** CSS variable the charts read for this stage's fill. */
  cssVar: string;
  /** Closed stages are terminal — they leave the active pipeline. */
  closed: boolean;
}

/**
 * Stage colors: the five open stages use a single-hue ordinal ramp (light →
 * dark as the deal advances), which is the correct encoding for ordered
 * categories. The two closed stages use reserved status colors, because "won"
 * and "lost" are outcomes rather than positions in an order.
 */
export const STAGE_META: Record<LeadStage, StageMeta> = {
  new: {
    label: "New",
    hint: "Fresh leads that have not been worked yet",
    dot: "bg-stage-1",
    cssVar: "var(--stage-1)",
    closed: false,
  },
  contacted: {
    label: "Contacted",
    hint: "First outreach has been made",
    dot: "bg-stage-2",
    cssVar: "var(--stage-2)",
    closed: false,
  },
  qualified: {
    label: "Qualified",
    hint: "Budget, authority, need and timing confirmed",
    dot: "bg-stage-3",
    cssVar: "var(--stage-3)",
    closed: false,
  },
  proposal: {
    label: "Proposal",
    hint: "Pricing and scope are with the buyer",
    dot: "bg-stage-4",
    cssVar: "var(--stage-4)",
    closed: false,
  },
  negotiation: {
    label: "Negotiation",
    hint: "Terms, redlines and procurement",
    dot: "bg-stage-5",
    cssVar: "var(--stage-5)",
    closed: false,
  },
  won: {
    label: "Won",
    hint: "Closed won — signed and booked",
    dot: "bg-good",
    cssVar: "var(--good)",
    closed: true,
  },
  lost: {
    label: "Lost",
    hint: "Closed lost — no deal",
    dot: "bg-critical",
    cssVar: "var(--critical)",
    closed: true,
  },
};

export interface TierMeta {
  label: string;
  dot: string;
  text: string;
  ring: string;
  hint: string;
}

/**
 * Score tiers use the reserved status palette. They always ship with an icon
 * and a written label, so the color is never the only channel.
 */
export const TIER_META: Record<ScoreTier, TierMeta> = {
  high: {
    label: "High",
    dot: "bg-good",
    text: "text-good-text",
    ring: "ring-good/30",
    hint: "Prioritise — strong fit and momentum",
  },
  medium: {
    label: "Medium",
    dot: "bg-warning",
    text: "text-ink-secondary",
    ring: "ring-warning/40",
    hint: "Worth working, but needs a stronger signal",
  },
  low: {
    label: "Low",
    dot: "bg-serious",
    text: "text-ink-secondary",
    ring: "ring-serious/40",
    hint: "Nurture — low fit or gone cold",
  },
};

/** Sales reps used by the seed data and the owner picker. */
export const OWNERS = [
  "Avery Chen",
  "Jordan Blake",
  "Priya Nair",
  "Marcus Webb",
] as const;

export const STORAGE_KEY = "ai-crm:state:v1";
export const THEME_KEY = "ai-crm:theme";
