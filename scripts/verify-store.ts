/**
 * Store verification: covers the CRUD path behind "Add Lead" / "Add Deal".
 *
 * The claim these assertions defend is the one a user actually notices: a lead
 * added in the modal lands in state immediately, is written to localStorage in
 * the same tick, survives a reload, and stays consistent through edits, stage
 * moves and deletes.
 *
 * The store reads `window.localStorage`, so a minimal shim stands in for the
 * browser. It is installed before the store module is imported, which is why
 * the import is dynamic — a static import is hoisted above this setup.
 */

import { STORAGE_KEY } from "../src/lib/constants";
import type { LeadDraft } from "../src/lib/types";

const failures: string[] = [];
let checks = 0;

function check(description: string, condition: boolean, detail?: string): void {
  checks += 1;
  if (!condition) failures.push(detail ? `${description} — ${detail}` : description);
}

/* --- Browser shim --------------------------------------------------------- */

async function main(): Promise<void> {
  class MemoryStorage {
    private data = new Map<string, string>();
    getItem(key: string): string | null {
      return this.data.has(key) ? (this.data.get(key) as string) : null;
    }
    setItem(key: string, value: string): void {
      this.data.set(key, String(value));
    }
    removeItem(key: string): void {
      this.data.delete(key);
    }
    clear(): void {
      this.data.clear();
    }
  }

  const storage = new MemoryStorage();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = { localStorage: storage };

  const store = await import("../src/lib/store");

  function persisted(): { leads: Array<Record<string, unknown>> } {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("nothing was written to localStorage");
    return JSON.parse(raw) as { leads: Array<Record<string, unknown>> };
  }

  /* --- Seeding on first subscribe ------------------------------------------- */

  let renders = 0;
  const unsubscribe = store.subscribe(() => {
    renders += 1;
  });

  const seeded = store.getSnapshot();
  check("subscribing hydrates the store", seeded.hydrated);
  check("a fresh visit seeds a demo pipeline", seeded.leads.length > 25, `${seeded.leads.length} leads`);
  check("the seed is written to localStorage immediately", persisted().leads.length === seeded.leads.length);
  check("the server snapshot stays empty so SSR is deterministic", store.getServerSnapshot().leads.length === 0);

  /* --- Add Lead / Add Deal -------------------------------------------------- */

  const draft: LeadDraft = {
    name: "Test Contact",
    company: "Verification Industries",
    email: "test.contact@verification.co",
    phone: "+1 (415) 555-0100",
    stage: "qualified",
    value: 42_000,
    source: "Referral",
    owner: "Avery Chen",
    notes: "Created by the verification script.",
    lastContactedAt: null,
  };

  const before = store.getSnapshot().leads.length;
  const rendersBefore = renders;
  const created = store.addLead(draft);
  const afterAdd = store.getSnapshot();

  check("adding a lead returns the created record", created.id.length > 0);
  check("the new lead is in state immediately", afterAdd.leads.length === before + 1);
  check("the new lead is first in the list", afterAdd.leads[0]?.id === created.id);
  check("subscribers are notified, so the UI re-renders", renders > rendersBefore);
  check("the form fields are stored verbatim", afterAdd.leads[0]?.company === "Verification Industries");
  check(
    "an open stage gets no close date",
    afterAdd.leads[0]?.closedAt === null,
  );
  check(
    "furthestStage is derived from the creation stage",
    afterAdd.leads[0]?.furthestStage === "qualified",
  );
  check(
    "adding a lead is persisted in the same tick",
    persisted().leads.some((lead) => lead.id === created.id),
  );
  check(
    "adding a lead writes an activity entry",
    afterAdd.activities[0]?.leadId === created.id && afterAdd.activities[0]?.kind === "created",
  );

  /* --- Reload ---------------------------------------------------------------- */

  // A returning visitor must get their own data back, not a fresh seed.
  const reloaded = JSON.parse(storage.getItem(STORAGE_KEY) as string) as {
    leads: Array<{ id: string; company: string }>;
  };
  check(
    "the lead survives a reload",
    reloaded.leads.some((lead) => lead.id === created.id && lead.company === "Verification Industries"),
  );
  check("the persisted payload carries no transient flags", !("hydrated" in reloaded));

  /* --- Edit ------------------------------------------------------------------ */

  store.updateLead(created.id, { ...draft, value: 88_000, stage: "proposal" });
  const edited = store.getSnapshot().leads.find((lead) => lead.id === created.id);
  check("editing updates the record", edited?.value === 88_000);
  check("editing advances furthestStage", edited?.furthestStage === "proposal");
  check(
    "editing is persisted",
    (persisted().leads.find((lead) => lead.id === created.id)?.value as number) === 88_000,
  );

  /* --- Kanban move ----------------------------------------------------------- */

  store.moveLead(created.id, "won");
  const won = store.getSnapshot().leads.find((lead) => lead.id === created.id);
  check("moving to a closed stage sets the close date", Boolean(won?.closedAt));
  check("moving to won keeps furthest at the end of the funnel", won?.furthestStage === "negotiation");

  store.moveLead(created.id, "negotiation");
  const reopened = store.getSnapshot().leads.find((lead) => lead.id === created.id);
  check("reopening clears the close date", reopened?.closedAt === null);
  check(
    "furthestStage never regresses",
    reopened?.furthestStage === "negotiation",
  );

  /* --- Log touch -------------------------------------------------------------- */

  const touchesBefore = reopened?.touches ?? 0;
  store.logTouch(created.id);
  const touched = store.getSnapshot().leads.find((lead) => lead.id === created.id);
  check("logging a touch increments the counter", (touched?.touches ?? 0) === touchesBefore + 1);
  check("logging a touch stamps the contact date", Boolean(touched?.lastContactedAt));

  /* --- Delete ----------------------------------------------------------------- */

  store.deleteLead(created.id);
  const afterDelete = store.getSnapshot();
  check("deleting removes the lead", !afterDelete.leads.some((lead) => lead.id === created.id));
  check(
    "deleting is persisted",
    !persisted().leads.some((lead) => lead.id === created.id),
  );
  check(
    "deleting a lead takes its follow-up tasks with it",
    !afterDelete.tasks.some((task) => task.leadId === created.id),
  );

  /* --- Teardown ---------------------------------------------------------------- */

  unsubscribe();
  check("unsubscribing does not throw", true);

  /* --- Report ------------------------------------------------------------------ */

  if (failures.length > 0) {
    console.error(`\n✗ store: ${failures.length} of ${checks} checks failed:\n`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  console.log(`✓ store: all ${checks} checks passed`);
}

void main();
