/**
 * Domain model.
 *
 * A single `stage` field is the source of truth for where a lead sits in the
 * funnel. The leads table renders it as "Status" and the Kanban board renders
 * it as a column, so a card dragged on the board and a row edited in the table
 * can never disagree.
 */

export const LEAD_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

/** Stages that count as live pipeline (not yet closed). */
export const OPEN_STAGES: FunnelStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
];

/** The ordered stages the funnel chart plots. */
export const FUNNEL_STAGES = OPEN_STAGES;

/** The subset of stages that represent a position in the funnel. */
export type FunnelStage = "new" | "contacted" | "qualified" | "proposal" | "negotiation";

/**
 * Where a stage sits in the funnel. Won counts as having reached the end;
 * lost tells you nothing on its own, so callers keep the stored furthest
 * stage instead.
 */
export function funnelPositionOf(stage: LeadStage): FunnelStage | null {
  if (stage === "won") return "negotiation";
  if (stage === "lost") return null;
  return stage;
}

/** The deeper of two funnel positions. */
export function deepestStage(a: FunnelStage, b: FunnelStage | null): FunnelStage {
  if (!b) return a;
  return OPEN_STAGES.indexOf(b) > OPEN_STAGES.indexOf(a) ? b : a;
}

export type ScoreTier = "high" | "medium" | "low";

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  stage: LeadStage;
  /**
   * The deepest open stage this lead ever reached, which `stage` alone cannot
   * tell you: a lead that got to Negotiation and then lost reads as "lost".
   * Without it the funnel chart cannot show real drop-off.
   */
  furthestStage: FunnelStage;
  /** Deal value in whole units of the reporting currency (USD). */
  value: number;
  source: LeadSource;
  owner: string;
  notes: string;
  /** ISO date string. */
  createdAt: string;
  /** ISO date string — last meaningful touch (call, email, meeting). */
  lastContactedAt: string | null;
  /** ISO date string — set when the lead moves to `won` or `lost`. */
  closedAt: string | null;
  /** Number of logged touches; feeds the engagement signal in lead scoring. */
  touches: number;
}

export const LEAD_SOURCES = [
  "Inbound",
  "Referral",
  "Outbound",
  "Event",
  "Partner",
  "Paid Ads",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export type ActivityKind =
  | "created"
  | "updated"
  | "stage-changed"
  | "deleted"
  | "note"
  | "task-completed";

export interface Activity {
  id: string;
  kind: ActivityKind;
  /** Human-readable summary, e.g. "Moved Acme Corp to Negotiation". */
  message: string;
  leadId: string | null;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  leadId: string | null;
  /** ISO date string. */
  dueAt: string;
  done: boolean;
  priority: "high" | "normal";
}

export interface CrmState {
  leads: Lead[];
  activities: Activity[];
  tasks: Task[];
}

/** Payload accepted by the create/update lead form. */
export type LeadDraft = Omit<
  Lead,
  "id" | "createdAt" | "closedAt" | "touches" | "lastContactedAt" | "furthestStage"
> & {
  lastContactedAt: string | null;
};

/* -------------------------------------------------------------------------- */
/* AI assistant                                                               */
/* -------------------------------------------------------------------------- */

export interface ScoreFactor {
  label: string;
  /** Signed contribution to the 0–100 score. */
  impact: number;
  detail: string;
}

export interface LeadScore {
  /** 0–100. */
  score: number;
  tier: ScoreTier;
  factors: ScoreFactor[];
  nextAction: string;
  rationale: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Which engine produced an assistant turn. */
  engine?: "claude" | "local";
  createdAt: string;
}

/** True while a lead is still live pipeline — i.e. neither won nor lost. */
export function isOpenStage(stage: LeadStage): stage is FunnelStage {
  return stage !== "won" && stage !== "lost";
}
