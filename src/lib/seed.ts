import { OWNERS } from "./constants";
import { LEAD_SOURCES } from "./types";
import type { Activity, CrmState, FunnelStage, Lead, LeadSource, LeadStage, Task } from "./types";
import { lastMonthKeys } from "./analytics";
import { createId } from "./utils";

/**
 * Demo dataset.
 *
 * Seeded once, on first visit, into localStorage. It is generated rather than
 * hard-coded so the revenue chart always covers the trailing twelve months
 * relative to *today* — a portfolio build should never open on an empty or a
 * visibly stale dashboard.
 *
 * The PRNG is deterministic, so the same browser always seeds the same book of
 * business and screenshots stay reproducible.
 */

function mulberry32(seed: number) {
  let a = seed;
  return function random(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Account {
  company: string;
  domain: string;
  contacts: string[];
}

const ACCOUNTS: Account[] = [
  { company: "Northwind Logistics", domain: "northwind.co", contacts: ["Dana Whitfield", "Omar Haddad"] },
  { company: "Helix Biotech", domain: "helixbio.com", contacts: ["Dr. Ruth Alvarez", "Sam Okonkwo"] },
  { company: "Vantage Capital", domain: "vantagecap.com", contacts: ["Elliot Marsh", "Naomi Fischer"] },
  { company: "Brightline Retail", domain: "brightline.io", contacts: ["Casey Duarte", "Ingrid Sorensen"] },
  { company: "Atlas Manufacturing", domain: "atlasmfg.com", contacts: ["Ben Kowalski", "Rosa Iglesias"] },
  { company: "Kestrel Aerospace", domain: "kestrelaero.com", contacts: ["Yuki Tanaka", "Devon Ellis"] },
  { company: "Riverstone Health", domain: "riverstonehealth.org", contacts: ["Amara Boateng", "Paul Lindqvist"] },
  { company: "Cobalt Energy", domain: "cobaltenergy.com", contacts: ["Sofia Rinaldi", "Tomas Berger"] },
  { company: "Lantern Media", domain: "lanternmedia.tv", contacts: ["Harper Quinn", "Idris Farooq"] },
  { company: "Sable & Finch", domain: "sablefinch.com", contacts: ["Margot Devereux", "Nikhil Rao"] },
  { company: "Pinecrest Education", domain: "pinecrest.edu", contacts: ["Grace Mbeki", "Leo Contreras"] },
  { company: "Orbital Freight", domain: "orbitalfreight.com", contacts: ["Zara Nasser", "Kirk Halvorsen"] },
  { company: "Ironwood Legal", domain: "ironwoodlegal.com", contacts: ["Theo Brennan", "Anya Petrova"] },
  { company: "Bluepeak Hospitality", domain: "bluepeak.hotels", contacts: ["Marisol Vega", "Owen Fitzgerald"] },
  { company: "Quantum Payments", domain: "quantumpay.com", contacts: ["Rafael Duarte", "Hana Kimura"] },
  { company: "Silverline Insurance", domain: "silverline-ins.com", contacts: ["Colette Dubois", "Andre Mensah"] },
  { company: "Terrace Foods", domain: "terracefoods.com", contacts: ["Bianca Rossi", "Jonah Wexler"] },
  { company: "Meridian Robotics", domain: "meridianrobotics.ai", contacts: ["Lena Novak", "Curtis Adeyemi"] },
  { company: "Fieldstone Agri", domain: "fieldstoneagri.com", contacts: ["Duncan Mercer", "Priti Shah"] },
  { company: "Crescent Telecom", domain: "crescenttel.net", contacts: ["Aisha Rahman", "Victor Lindgren"] },
];

const NOTES = [
  "Evaluating three vendors. Security review is the gating item.",
  "Champion is enthusiastic but budget sits with the CFO.",
  "Migrating off a legacy in-house tool by end of quarter.",
  "Asked for a pilot with two teams before a company-wide rollout.",
  "Procurement requires SOC 2 documentation before signature.",
  "Renewal cycle on their current contract ends in 90 days.",
  "Wants integration with their existing data warehouse.",
  "Interested after seeing the case study at the industry summit.",
  "Head of Sales is the economic buyer; IT is the technical approver.",
  "Price-sensitive — comparing us against a cheaper regional vendor.",
];

const LOST_NOTES = [
  "Went with the incumbent after a price concession.",
  "Project deprioritised — budget moved to infrastructure.",
  "Champion left the company mid-cycle.",
  "Needed on-premise deployment, which we do not offer.",
];

const OPEN_STAGE_POOL: FunnelStage[] = [
  "new",
  "new",
  "contacted",
  "contacted",
  "qualified",
  "qualified",
  "proposal",
  "negotiation",
];

export function createSeedState(now: Date = new Date()): CrmState {
  const random = mulberry32(20260903);
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  const between = (min: number, max: number): number =>
    Math.floor(random() * (max - min + 1)) + min;

  const usedContacts = new Set<string>();
  const leads: Lead[] = [];

  const nextContact = (): { account: Account; contact: string } => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const account = pick(ACCOUNTS);
      const contact = pick(account.contacts);
      const key = `${account.company}:${contact}`;
      if (!usedContacts.has(key)) {
        usedContacts.add(key);
        return { account, contact };
      }
    }
    const account = pick(ACCOUNTS);
    return { account, contact: pick(account.contacts) };
  };

  const emailFor = (contact: string, domain: string): string => {
    const parts = contact.replace(/^Dr\.\s+/, "").toLowerCase().split(" ");
    return `${parts[0]}.${parts[parts.length - 1]}@${domain}`;
  };

  const phone = (): string => `+1 (${between(201, 989)}) ${between(200, 999)}-${between(1000, 9999)}`;

  const addLead = (
    stage: LeadStage,
    createdAt: Date,
    closedAt: Date | null,
    lastContactedAt: Date | null,
    note: string,
    furthestStage: FunnelStage,
    overrides: Partial<Lead> = {},
  ): Lead => {
    const { account, contact } = nextContact();
    const lead: Lead = {
      id: createId("lead"),
      name: contact,
      company: account.company,
      email: emailFor(contact, account.domain),
      phone: phone(),
      stage,
      furthestStage,
      value: between(6, 145) * 1000,
      source: pick(LEAD_SOURCES) as LeadSource,
      owner: pick(OWNERS),
      notes: note,
      createdAt: createdAt.toISOString(),
      lastContactedAt: lastContactedAt ? lastContactedAt.toISOString() : null,
      closedAt: closedAt ? closedAt.toISOString() : null,
      touches: stage === "new" ? between(0, 1) : between(2, 9),
      ...overrides,
    };
    leads.push(lead);
    return lead;
  };

  /**
   * Where a lost deal died. Weighted towards the early stages, which is what a
   * real funnel looks like — most leads never reach a proposal.
   */
  const lostAtStage = (): FunnelStage => {
    const roll = random();
    if (roll < 0.34) return "new";
    if (roll < 0.61) return "contacted";
    if (roll < 0.82) return "qualified";
    if (roll < 0.94) return "proposal";
    return "negotiation";
  };

  const dayIn = (monthOffsetFromNow: number, day: number): Date =>
    new Date(now.getFullYear(), now.getMonth() - monthOffsetFromNow, day, 10, 0, 0);

  // --- Closed-won deals: one or two per month, so the revenue chart is full ---
  const months = lastMonthKeys(12, now);
  months.forEach((_, index) => {
    const offset = months.length - 1 - index; // 11 (oldest) → 0 (current month)
    const isCurrentMonth = offset === 0;
    const wins = isCurrentMonth ? 1 : between(1, 2);
    for (let i = 0; i < wins; i += 1) {
      const maxDay = isCurrentMonth ? Math.max(now.getDate() - 1, 1) : 28;
      const closed = dayIn(offset, between(1, maxDay));
      const created = new Date(closed.getTime() - between(28, 95) * 86_400_000);
      // A won deal necessarily passed through every stage.
      addLead("won", created, closed, closed, pick(NOTES), "negotiation");
    }
  });

  // --- Closed-lost deals ---
  // Roughly two losses per win, which lands the win rate in the 30-35% band a
  // real B2B pipeline sees. A flattering demo number would undercut the point
  // of the dashboard.
  const losses = leads.length * 2;
  for (let i = 0; i < losses; i += 1) {
    const offset = between(0, 11);
    const closed = dayIn(offset, between(1, offset === 0 ? Math.max(now.getDate() - 1, 1) : 28));
    const created = new Date(closed.getTime() - between(20, 70) * 86_400_000);
    addLead("lost", created, closed, closed, pick(LOST_NOTES), lostAtStage());
  }

  // --- Live pipeline ---
  for (let i = 0; i < 18; i += 1) {
    const stage = pick(OPEN_STAGE_POOL);
    const ageDays = stage === "new" ? between(1, 18) : between(10, 110);
    const created = new Date(now.getTime() - ageDays * 86_400_000);
    // Newly created leads may not have been worked yet.
    const idleDays = stage === "new" && random() < 0.5 ? null : between(0, Math.min(ageDays, 34));
    const lastContacted =
      idleDays === null ? null : new Date(now.getTime() - idleDays * 86_400_000);
    addLead(stage, created, null, lastContacted, pick(NOTES), stage);
  }

  // --- Neglected deals ---
  // A real book always has a few of these, and without them the "what's at
  // risk" view, the stale-card marker and the Low score tier would have
  // nothing to show.
  const NEGLECTED = [
    { stage: "contacted" as const, idle: 47, consumerEmail: true },
    { stage: "new" as const, idle: null, consumerEmail: false },
    { stage: "qualified" as const, idle: 34, consumerEmail: false },
    { stage: "contacted" as const, idle: 62, consumerEmail: false },
  ];

  for (const entry of NEGLECTED) {
    const ageDays = between(58, 130);
    const created = new Date(now.getTime() - ageDays * 86_400_000);
    const lead = addLead(
      entry.stage,
      created,
      null,
      entry.idle === null ? null : new Date(now.getTime() - entry.idle * 86_400_000),
      entry.idle === null
        ? "Came in through a paid campaign and was never worked."
        : "Went quiet after the first call. No reply to the last two emails.",
      entry.stage,
      {
        value: between(5, 24) * 1000,
        source: "Paid Ads",
        touches: entry.idle === null ? 0 : between(1, 2),
      },
    );
    if (entry.consumerEmail) {
      // Exercises the "personal email address" signal in the scoring engine.
      lead.email = `${lead.name.toLowerCase().replace(/[^a-z]+/g, ".")}@gmail.com`;
    }
  }

  leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // --- Follow-up tasks against live deals ---
  const workable = leads.filter((lead) => lead.stage !== "won" && lead.stage !== "lost");
  const taskTemplates = [
    { title: "Send follow-up proposal", priority: "high" as const, due: -2 },
    { title: "Discovery call", priority: "high" as const, due: 0 },
    { title: "Share security questionnaire", priority: "normal" as const, due: 1 },
    { title: "Check in with champion", priority: "normal" as const, due: 3 },
    { title: "Prepare pricing options", priority: "high" as const, due: 5 },
    { title: "Quarterly business review prep", priority: "normal" as const, due: 9 },
  ];

  const tasks: Task[] = taskTemplates.map((template, index) => {
    const lead = workable[index % Math.max(workable.length, 1)];
    return {
      id: createId("task"),
      title: lead ? `${template.title} — ${lead.company}` : template.title,
      leadId: lead?.id ?? null,
      dueAt: new Date(now.getTime() + template.due * 86_400_000).toISOString(),
      done: false,
      priority: template.priority,
    };
  });

  // --- Recent activity feed ---
  const recent = leads.slice(0, 6);
  const activities: Activity[] = recent.map((lead, index) => ({
    id: createId("act"),
    kind: index % 3 === 0 ? "stage-changed" : index % 3 === 1 ? "created" : "note",
    message:
      index % 3 === 0
        ? `Moved ${lead.company} to ${lead.stage}`
        : index % 3 === 1
          ? `Added ${lead.name} at ${lead.company}`
          : `Logged a note on ${lead.company}`,
    leadId: lead.id,
    createdAt: new Date(now.getTime() - (index + 1) * between(3, 20) * 3_600_000).toISOString(),
  }));

  return { leads, activities, tasks };
}
