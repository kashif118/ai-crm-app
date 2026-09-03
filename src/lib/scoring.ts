import { CONSUMER_EMAIL_DOMAINS, daysBetween, emailDomain } from "./utils";
import type { Lead, LeadScore, ScoreFactor, ScoreTier } from "./types";

/**
 * Lead scoring engine.
 *
 * Deliberately transparent: every point in the 0-100 score is attributed to a
 * named signal, so the UI can show *why* a lead scored the way it did rather
 * than asking the user to trust a black box. The same factor list is handed to
 * the Claude-backed assistant as grounding context.
 */

/**
 * Calibration.
 *
 * Every signal is a *signed* deviation from a neutral 50, not a bonus on top
 * of zero. An average lead therefore lands near the middle of the range and
 * the tiers stay selective — a scale where four deals in five come out "High"
 * tells the rep nothing, which is the failure mode this engine exists to
 * avoid. The positive extremes are deliberately unreachable together: the
 * best realistic lead scores in the high eighties, not 100.
 */
const BASELINE = 50;

const STAGE_POINTS: Record<Lead["stage"], number> = {
  new: -8,
  contacted: -2,
  qualified: 4,
  proposal: 9,
  negotiation: 12,
  won: 12,
  lost: -22,
};

const SOURCE_POINTS: Record<Lead["source"], number> = {
  Referral: 5,
  Inbound: 4,
  Partner: 2,
  Event: 0,
  Outbound: -3,
  "Paid Ads": -5,
};

const SOURCE_CLOSE_RATE: Record<Lead["source"], string> = {
  Referral: "38%",
  Inbound: "29%",
  Partner: "24%",
  Event: "19%",
  Outbound: "12%",
  "Paid Ads": "9%",
};

/** Deal sizes above this are treated as top-of-band for the value signal. */
const VALUE_CEILING = 120_000;

export function scoreLead(lead: Lead, now: Date = new Date()): LeadScore {
  const factors: ScoreFactor[] = [];

  // 1. Deal value - square-rooted so a 10x deal is not a 10x signal.
  const valueRatio = Math.min(lead.value / VALUE_CEILING, 1);
  const valuePoints = Math.round(Math.sqrt(valueRatio) * 20) - 8;
  factors.push({
    label: "Deal value",
    impact: valuePoints,
    detail:
      valueRatio >= 0.6
        ? "Well above the average deal size in this pipeline."
        : valueRatio >= 0.25
          ? "A typical deal size for this pipeline."
          : "Small deal - cheap to win, but low upside.",
  });

  // 2. Pipeline position.
  factors.push({
    label: "Pipeline stage",
    impact: STAGE_POINTS[lead.stage],
    detail:
      lead.stage === "lost"
        ? "Closed lost - no active opportunity."
        : `Currently in ${lead.stage}. Later stages convert far more often.`,
  });

  // 3. Recency of the last real touch.
  const idleDays = lead.lastContactedAt
    ? daysBetween(new Date(lead.lastContactedAt), now)
    : daysBetween(new Date(lead.createdAt), now);
  const recency = recencySignal(lead, idleDays);
  factors.push(recency);

  // 4. Engagement depth.
  factors.push({
    label: "Engagement",
    impact: Math.round((Math.min(lead.touches, 8) / 8) * 11) - 5,
    detail:
      lead.touches >= 5
        ? `${lead.touches} logged touches - the buyer is investing time.`
        : lead.touches > 0
          ? `${lead.touches} logged touches so far.`
          : "No logged interactions yet.",
  });

  // 5. Firmographic fit, inferred from the email domain.
  const domain = emailDomain(lead.email);
  const isConsumer = CONSUMER_EMAIL_DOMAINS.includes(domain);
  factors.push({
    label: "Company fit",
    impact: isConsumer ? -8 : domain ? 4 : -2,
    detail: isConsumer
      ? "Personal email address - unverified buying authority."
      : domain
        ? `Corporate domain (${domain}) matches the ICP.`
        : "No email on file to verify the account.",
  });

  // 6. Channel quality.
  factors.push({
    label: "Source",
    impact: SOURCE_POINTS[lead.source] ?? 0,
    detail: `${lead.source} leads historically close at ${SOURCE_CLOSE_RATE[lead.source] ?? "15%"}.`,
  });

  // 7. Stall penalty - old and still at the top of the funnel.
  const ageDays = daysBetween(new Date(lead.createdAt), now);
  if (ageDays > 45 && (lead.stage === "new" || lead.stage === "contacted")) {
    factors.push({
      label: "Stalled",
      impact: -10,
      detail: `Created ${ageDays} days ago and still early-stage.`,
    });
  }

  const raw = factors.reduce((total, factor) => total + factor.impact, 0);
  const score = clamp(Math.round(BASELINE + raw), 0, 100);
  const tier = tierFor(score, lead);
  const ranked = [...factors].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return {
    score,
    tier,
    factors: ranked,
    nextAction: nextBestAction(lead, idleDays, tier),
    rationale: rationaleFor(lead, ranked, tier),
  };
}

function recencySignal(lead: Lead, idleDays: number): ScoreFactor {
  const label = "Contact recency";
  if (!lead.lastContactedAt) {
    return {
      label,
      impact: -14,
      detail: "Never contacted. Every day here costs conversion rate.",
    };
  }
  if (idleDays <= 3) {
    return {
      label,
      impact: 12,
      detail: "Contacted within the last 3 days - the deal is warm.",
    };
  }
  if (idleDays <= 10) {
    return {
      label,
      impact: 6,
      detail: `Last touch ${idleDays} days ago. Still inside a healthy cadence.`,
    };
  }
  if (idleDays <= 21) {
    return {
      label,
      impact: -3,
      detail: `Last touch ${idleDays} days ago. Momentum is slipping.`,
    };
  }
  return {
    label,
    impact: -16,
    detail: `No contact for ${idleDays} days. Treat as going cold.`,
  };
}

function tierFor(score: number, lead: Lead): ScoreTier {
  if (lead.stage === "lost") return "low";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** The "next best action" the assistant surfaces on every lead. */
function nextBestAction(lead: Lead, idleDays: number, tier: ScoreTier): string {
  const first = firstName(lead.name);

  if (lead.stage === "won") {
    return "Hand off to onboarding and schedule a 30-day check-in to open the expansion conversation.";
  }
  if (lead.stage === "lost") {
    return "Add to the quarterly nurture sequence and log the loss reason so the pattern is visible next quarter.";
  }
  if (!lead.lastContactedAt) {
    return `Send a first-touch email to ${first} today, referencing how similar ${lead.source.toLowerCase()} accounts use the product.`;
  }
  if (idleDays > 21) {
    return `Re-engage with a short break-up email - ${idleDays} days of silence usually means the champion moved on.`;
  }

  switch (lead.stage) {
    case "new":
      return `Qualify on budget and timeline. Book a 20-minute discovery call with ${first} this week.`;
    case "contacted":
      return tier === "high"
        ? `Push for a technical deep-dive with the ${lead.company} evaluation team while interest is high.`
        : `Send one piece of proof - a customer story from the ${lead.company} industry - and ask for a 15-minute call.`;
    case "qualified":
      return "Draft the proposal now. Confirm the decision maker and the signing process before you send pricing.";
    case "proposal":
      return "Follow up with a written ROI summary, then propose two concrete times to review the proposal together.";
    case "negotiation":
      return "Agree the close plan in writing: redlines, security review and signature dates. Trade any concession for a date.";
    default:
      return "Log the next step so this deal does not stall.";
  }
}

function rationaleFor(lead: Lead, ranked: ScoreFactor[], tier: ScoreTier): string {
  const opening =
    tier === "high"
      ? `${lead.company} is one of the strongest opportunities in the pipeline.`
      : tier === "medium"
        ? `${lead.company} is workable but not yet a priority.`
        : `${lead.company} is unlikely to close without a new signal.`;

  const top = ranked[0];
  const drag = ranked.find((factor) => factor.impact < 0);
  const driver = top
    ? ` The biggest driver is ${top.label.toLowerCase()}: ${lowerFirst(top.detail)}`
    : "";
  const risk = drag ? ` Watch ${drag.label.toLowerCase()} - ${lowerFirst(drag.detail)}` : "";

  return `${opening}${driver}${risk}`;
}

function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Convenience: score a whole book of business, hottest first. */
export function rankLeads(leads: Lead[], now?: Date): Array<Lead & { ai: LeadScore }> {
  return leads
    .map((lead) => ({ ...lead, ai: scoreLead(lead, now) }))
    .sort((a, b) => b.ai.score - a.ai.score);
}
