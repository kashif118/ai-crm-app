import { formatCompactCurrency, formatCurrency } from "./utils";

/**
 * The assistant's grounding context and its offline engine.
 *
 * The app ships working AI features with no API key: `answerLocally` is a
 * rule-based sales coach that reads the same pipeline snapshot the Claude-backed
 * route uses. When `ANTHROPIC_API_KEY` is present the route swaps in Claude and
 * this becomes the fallback for errors and rate limits, so the widget never
 * dead-ends.
 */

export interface AssistantLead {
  name: string;
  company: string;
  stage: string;
  value: number;
  owner: string;
  score: number;
  tier: string;
  daysSinceContact: number | null;
  nextAction: string;
}

export interface AssistantContext {
  totalLeads: number;
  openDeals: number;
  pipelineValue: number;
  monthRevenue: number;
  conversionRate: number;
  averageDealSize: number;
  topLeads: AssistantLead[];
  stalledLeads: AssistantLead[];
  /** Set when the user opened the assistant from a specific lead. */
  focusLead?: AssistantLead | null;
}

export const ASSISTANT_SYSTEM_PROMPT = `You are the AI Sales Assistant embedded in a CRM used by a B2B sales team.

Your job is to help the rep move deals forward. You can:
- summarise pipeline health and call out risk,
- recommend which deals to work next and why,
- draft client-ready emails, call scripts and follow-up sequences,
- coach on objection handling, discovery questions and close plans.

Rules:
- Ground every claim in the pipeline snapshot you are given. Never invent leads, numbers, dates or company facts that are not in the snapshot.
- If the snapshot does not contain what the user asked about, say so plainly and answer with what it does contain.
- Be concise and immediately usable. Prefer short paragraphs and tight bullet lists over preamble.
- When asked for an email, return the subject line and body ready to send, with no commentary around it and no placeholder text the rep would have to hunt for. Use [square brackets] only where a genuinely personal detail is required.
- Currency is USD. Keep a direct, professional tone — no hype, no emoji.`;

/** Compact snapshot injected as the grounding context for each request. */
export function renderContext(context: AssistantContext): string {
  const lines: string[] = [
    "PIPELINE SNAPSHOT",
    `- Total leads: ${context.totalLeads}`,
    `- Open deals: ${context.openDeals}`,
    `- Open pipeline value: ${formatCurrency(context.pipelineValue)}`,
    `- Revenue booked this month: ${formatCurrency(context.monthRevenue)}`,
    `- Win rate on closed deals: ${context.conversionRate.toFixed(1)}%`,
    `- Average won deal size: ${formatCurrency(context.averageDealSize)}`,
  ];

  if (context.focusLead) {
    lines.push("", "LEAD IN FOCUS", describeLead(context.focusLead));
  }

  if (context.topLeads.length > 0) {
    lines.push("", "HIGHEST-SCORING OPEN DEALS");
    context.topLeads.forEach((lead) => lines.push(describeLead(lead)));
  }

  if (context.stalledLeads.length > 0) {
    lines.push("", "AT RISK (no contact in 21+ days)");
    context.stalledLeads.forEach((lead) => lines.push(describeLead(lead)));
  }

  return lines.join("\n");
}

function describeLead(lead: AssistantLead): string {
  const idle =
    lead.daysSinceContact === null
      ? "never contacted"
      : `last contact ${lead.daysSinceContact}d ago`;
  return `- ${lead.name} at ${lead.company} | ${lead.stage} | ${formatCurrency(lead.value)} | score ${lead.score}/100 (${lead.tier}) | owner ${lead.owner} | ${idle} | suggested next step: ${lead.nextAction}`;
}

/* -------------------------------------------------------------------------- */
/* Offline engine                                                             */
/* -------------------------------------------------------------------------- */

type Intent = "email" | "priorities" | "pipeline" | "risk" | "objection" | "discovery" | "help";

function detectIntent(message: string): Intent {
  const text = message.toLowerCase();
  if (/\b(email|write|draft|reply|message|outreach|subject line)\b/.test(text)) return "email";
  if (/\b(objection|too expensive|pricing push|competitor|discount|pushback)\b/.test(text)) {
    return "objection";
  }
  if (/\b(discovery|qualify|questions|bant|meddic)\b/.test(text)) return "discovery";
  if (/\b(risk|stalled|cold|slipping|at risk|going dark)\b/.test(text)) return "risk";
  if (/\b(who|priorit|focus|next|today|call first|work on)\b/.test(text)) return "priorities";
  if (/\b(pipeline|forecast|summary|how are we|health|revenue|performance|quarter)\b/.test(text)) {
    return "pipeline";
  }
  return "help";
}

export function answerLocally(message: string, context: AssistantContext): string {
  switch (detectIntent(message)) {
    case "email":
      return draftEmail(context);
    case "priorities":
      return priorities(context);
    case "pipeline":
      return pipelineSummary(context);
    case "risk":
      return riskReport(context);
    case "objection":
      return objectionPlaybook(context);
    case "discovery":
      return discoveryPlaybook(context);
    default:
      return helpResponse(context);
  }
}

function target(context: AssistantContext): AssistantLead | null {
  return context.focusLead ?? context.topLeads[0] ?? null;
}

function draftEmail(context: AssistantContext): string {
  const lead = target(context);
  if (!lead) {
    return "There are no open deals in the pipeline to write to. Add a lead and I will draft the outreach.";
  }
  const first = lead.name.replace(/^Dr\.\s+/, "").split(" ")[0];
  const cold = lead.daysSinceContact === null || lead.daysSinceContact > 21;

  const body = cold
    ? `Hi ${first},

I have not wanted to crowd your inbox, so this is my last note on the ${lead.company} evaluation.

If the project is still live, I can put a short plan together covering rollout, security review and pricing — usually about 15 minutes of your time.

If the timing has moved, tell me when to check back and I will leave it there until then.

Best,
${lead.owner}`
    : `Hi ${first},

Thanks for the time so far on the ${lead.company} evaluation. Here is where I think we are:

- What you said matters most: a faster path off the current process, without a disruptive migration.
- What I would suggest next: ${lowerFirst(lead.nextAction)}

Would either Tuesday or Thursday afternoon work for a short call to lock that in?

Best,
${lead.owner}`;

  return `**Subject:** ${cold ? `Closing the loop on ${lead.company}` : `Next step for ${lead.company}`}

${body}

---
Drafted for **${lead.name}** at ${lead.company} — ${lead.stage}, ${formatCurrency(lead.value)}, score ${lead.score}/100.`;
}

function priorities(context: AssistantContext): string {
  if (context.topLeads.length === 0) {
    return "The pipeline has no open deals right now. Add leads and I will rank them by score, deal size and momentum.";
  }
  const list = context.topLeads
    .slice(0, 4)
    .map(
      (lead, index) =>
        `${index + 1}. **${lead.company}** — ${lead.name}, ${formatCurrency(lead.value)}, score ${lead.score}/100 (${lead.tier}).\n   ${lead.nextAction}`,
    )
    .join("\n");

  return `Work these in order today:

${list}

Together they represent ${formatCompactCurrency(
    context.topLeads.slice(0, 4).reduce((total, lead) => total + lead.value, 0),
  )} of open pipeline.`;
}

function pipelineSummary(context: AssistantContext): string {
  const coverage =
    context.monthRevenue > 0
      ? (context.pipelineValue / context.monthRevenue).toFixed(1)
      : "n/a";

  return `**Pipeline health**

- ${context.openDeals} open deals worth ${formatCurrency(context.pipelineValue)}.
- ${formatCurrency(context.monthRevenue)} booked so far this month.
- Win rate on closed deals: ${context.conversionRate.toFixed(1)}%. Average won deal: ${formatCurrency(context.averageDealSize)}.
- Open pipeline is ${coverage}x the current month's booked revenue.

${
  context.stalledLeads.length > 0
    ? `The clearest risk is ${context.stalledLeads.length} deal${context.stalledLeads.length === 1 ? "" : "s"} with no contact in three weeks or more — ask me for the risk list.`
    : "Nothing in the pipeline has gone quiet, which is unusual and worth protecting."
}`;
}

function riskReport(context: AssistantContext): string {
  if (context.stalledLeads.length === 0) {
    return "Nothing is stalled right now — every open deal has been touched inside the last three weeks. Keep the cadence.";
  }
  const list = context.stalledLeads
    .slice(0, 5)
    .map(
      (lead) =>
        `- **${lead.company}** (${lead.name}) — ${formatCurrency(lead.value)}, ${lead.stage}, ${
          lead.daysSinceContact === null ? "never contacted" : `${lead.daysSinceContact} days silent`
        }.`,
    )
    .join("\n");

  const exposure = context.stalledLeads.reduce((total, lead) => total + lead.value, 0);

  return `**${context.stalledLeads.length} deals are going cold** — ${formatCurrency(exposure)} of exposed pipeline.

${list}

Send a short break-up email to each. It is the highest-response message in a stalled cycle because it asks for a decision rather than more attention.`;
}

function objectionPlaybook(context: AssistantContext): string {
  const lead = target(context);
  const anchor = lead
    ? `For ${lead.company} specifically, the deal is ${formatCurrency(lead.value)} at the ${lead.stage} stage — anchor on outcome, not list price.`
    : "";

  return `**Handling a price objection**

1. **Separate price from value.** "When you say it is expensive, is it above the budget you have, or above what you think the outcome is worth?" The answers need different responses.
2. **Quantify the alternative.** Put a number on the current process — hours, headcount, error rate. A price only looks large next to zero.
3. **Trade, never discount.** Any concession buys something back: a longer term, a case study, an earlier signature date, a wider rollout.
4. **Close on the term.** "If we can land at that number on a two-year term, is there anything else between us and signature?"

${anchor}`;
}

function discoveryPlaybook(context: AssistantContext): string {
  const lead = target(context);
  return `**Discovery questions that actually qualify**

- What made you start looking at this now, rather than six months ago?
- Walk me through how this gets handled today, step by step.
- What happens to the business if nothing changes this year?
- Who else has to agree before this becomes a purchase?
- What does your procurement and security process look like, and how long does it usually take?
- If we agreed today, what would need to be true for you to go live by the end of the quarter?

${lead ? `Use these on ${lead.name} at ${lead.company} — the deal is at ${lead.stage} and the suggested next step is: ${lowerFirst(lead.nextAction)}` : ""}`;
}

function helpResponse(context: AssistantContext): string {
  return `I can work across your ${context.totalLeads} leads and ${context.openDeals} open deals. Try:

- **"What should I focus on today?"** — a ranked call list with reasons.
- **"Draft a follow-up email"** — a ready-to-send draft for the lead in focus.
- **"How is the pipeline looking?"** — health, win rate and coverage.
- **"What is at risk?"** — deals that have gone quiet.
- **"How do I handle a price objection?"** — a close playbook.`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
