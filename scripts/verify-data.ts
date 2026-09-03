/**
 * Data-layer verification: `npm run verify`
 *
 * The dashboard is only as trustworthy as the numbers behind it, and most of
 * the ways a CRM dashboard goes wrong are silent — a funnel that widens, a
 * "NaN%" delta on a fresh install, a revenue chart with a hole in it, or a
 * score that rates four deals in five as High. These assertions cover the pure
 * data layer (seed, analytics, scoring) so those regressions fail loudly
 * instead of shipping.
 */

import { buildFunnel, buildMetrics } from "../src/lib/analytics";
import { scoreLead } from "../src/lib/scoring";
import { createSeedState } from "../src/lib/seed";
import { isOpenStage } from "../src/lib/types";

const failures: string[] = [];
let checks = 0;

function check(description: string, condition: boolean, detail?: string): void {
  checks += 1;
  if (condition) return;
  failures.push(detail ? `${description} — ${detail}` : description);
}

const seed = createSeedState();
const { leads } = seed;
const metrics = buildMetrics(leads);
const funnel = buildFunnel(leads);

/* --- Seed integrity ------------------------------------------------------ */

check("seed produces a realistic book of business", leads.length > 25, `got ${leads.length}`);
check("seed produces follow-up tasks", seed.tasks.length > 0);
check("seed produces an activity feed", seed.activities.length > 0);
check("lead ids are unique", new Set(leads.map((lead) => lead.id)).size === leads.length);

for (const lead of leads) {
  const closed = lead.stage === "won" || lead.stage === "lost";
  check(`${lead.id}: closed stage has a close date`, !closed || Boolean(lead.closedAt));
  check(`${lead.id}: open stage has no close date`, closed || lead.closedAt === null);
  check(
    `${lead.id}: closed on or after it was created`,
    !lead.closedAt || new Date(lead.closedAt) >= new Date(lead.createdAt),
  );
  check(`${lead.id}: not created in the future`, new Date(lead.createdAt) <= new Date());
  check(
    `${lead.id}: not contacted in the future`,
    !lead.lastContactedAt || new Date(lead.lastContactedAt) <= new Date(),
  );
  check(`${lead.id}: has a usable email`, lead.email.includes("@"));
}

/* --- Revenue series ------------------------------------------------------ */

const revenue = metrics.monthlyRevenue.series;
check("revenue covers twelve months", revenue.length === 12, `got ${revenue.length}`);
check(
  "revenue chart has no empty months",
  revenue.every((point) => point.value > 0),
  revenue.filter((p) => p.value <= 0).map((p) => p.label).join(", "),
);
check("revenue values are all finite", revenue.every((point) => Number.isFinite(point.value)));

/* --- Metrics ------------------------------------------------------------- */

for (const [name, metric] of Object.entries({
  totalLeads: metrics.totalLeads,
  activeDeals: metrics.activeDeals,
  conversionRate: metrics.conversionRate,
  monthlyRevenue: metrics.monthlyRevenue,
})) {
  check(`${name} value is finite`, Number.isFinite(metric.value));
  check(
    `${name} delta never renders as NaN%`,
    metric.delta === null || Number.isFinite(metric.delta),
  );
  check(`${name} has a twelve-point sparkline`, metric.series.length === 12);
}

check(
  "conversion rate is a percentage",
  metrics.conversionRate.value >= 0 && metrics.conversionRate.value <= 100,
);
check(
  "conversion rate is plausible for B2B",
  metrics.conversionRate.value > 15 && metrics.conversionRate.value < 55,
  `${metrics.conversionRate.value.toFixed(1)}%`,
);
check(
  "active deals agrees with the open-stage count",
  metrics.activeDeals.value === leads.filter((lead) => isOpenStage(lead.stage)).length,
);

const totals = metrics.totalLeads.series.map((point) => point.value);
check(
  "cumulative lead count never decreases",
  totals.every((value, index) => index === 0 || value >= totals[index - 1]),
);

/* --- Funnel -------------------------------------------------------------- */

check("funnel has five stages", funnel.length === 5, `got ${funnel.length}`);
check(
  "funnel narrows at every step",
  funnel.every((stage, index) => index === 0 || stage.count <= funnel[index - 1].count),
);
check(
  "funnel shows real drop-off rather than a flat block",
  funnel[funnel.length - 1].count < funnel[0].count * 0.8,
);
check("funnel bars stay inside their track", funnel.every((s) => s.ratio >= 0 && s.ratio <= 1));
check(
  "step conversion is a proportion",
  funnel.every((s) => s.stepConversion === null || (s.stepConversion >= 0 && s.stepConversion <= 1)),
);

/* --- Scoring ------------------------------------------------------------- */

const scores = leads.map((lead) => scoreLead(lead));
check("every score is within 0-100", scores.every((s) => s.score >= 0 && s.score <= 100));
check(
  "no score is clipped at the ceiling",
  scores.filter((s) => s.score === 100).length === 0,
  "a clipped score means the weights are miscalibrated",
);
check("every lead gets a next best action", scores.every((s) => s.nextAction.length > 20));
check("every lead gets a rationale", scores.every((s) => s.rationale.length > 20));
check("every lead exposes its signals", scores.every((s) => s.factors.length >= 6));

const openLeads = leads.filter((lead) => isOpenStage(lead.stage));
const openScores = openLeads.map((lead) => scoreLead(lead));
const openTiers = { high: 0, medium: 0, low: 0 };
for (const score of openScores) openTiers[score.tier] += 1;

check(
  "open deals span all three tiers",
  openTiers.high > 0 && openTiers.medium > 0 && openTiers.low > 0,
  JSON.stringify(openTiers),
);
check(
  "the High tier stays selective",
  openTiers.high <= openLeads.length * 0.5,
  `${openTiers.high} of ${openLeads.length} open deals`,
);

/* --- Empty state --------------------------------------------------------- */

const emptyMetrics = buildMetrics([]);
check(
  "an empty CRM produces no NaN metrics",
  Number.isFinite(emptyMetrics.conversionRate.value) &&
    Number.isFinite(emptyMetrics.averageDealSize) &&
    Number.isFinite(emptyMetrics.pipelineValue),
);
check(
  "an empty CRM produces no NaN funnel ratios",
  buildFunnel([]).every((stage) => Number.isFinite(stage.ratio)),
);

/* --- Report -------------------------------------------------------------- */

const money = (value: number) => `$${Math.round(value / 1000)}k`;

console.log("\nPipeline generated by the seed:");
console.log(`  leads              ${leads.length} (${openLeads.length} open)`);
console.log(`  win rate           ${metrics.conversionRate.value.toFixed(1)}%`);
console.log(`  open pipeline      ${money(metrics.pipelineValue)}`);
console.log(`  revenue this month ${money(metrics.monthlyRevenue.value)}`);
console.log(`  funnel             ${funnel.map((s) => `${s.label} ${s.count}`).join(" → ")}`);
console.log(`  open score tiers   high ${openTiers.high} · medium ${openTiers.medium} · low ${openTiers.low}`);

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} of ${checks} checks failed:\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`\n✓ all ${checks} checks passed\n`);
