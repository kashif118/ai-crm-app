import { STAGE_META, STORAGE_KEY } from "./constants";
import { createSeedState } from "./seed";
import { deepestStage, funnelPositionOf } from "./types";
import type { Activity, ActivityKind, CrmState, Lead, LeadDraft, LeadStage } from "./types";
import { createId } from "./utils";

/**
 * CRM state lives in a small external store rather than in React state.
 *
 * localStorage *is* an external system, so reading and writing it belongs
 * here — the provider subscribes with `useSyncExternalStore` instead of
 * loading and persisting inside effects. That keeps the server render
 * deterministic (an empty snapshot, so the pages show skeletons) and means a
 * write is persisted at the moment it happens rather than one render later.
 */

export interface StoreState extends CrmState {
  /** False until localStorage has been read on the client. */
  hydrated: boolean;
}

const EMPTY: StoreState = { leads: [], activities: [], tasks: [], hydrated: false };

let state: StoreState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function persist(next: StoreState): void {
  if (typeof window === "undefined") return;
  try {
    const { leads, activities, tasks } = next;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ leads, activities, tasks }));
  } catch {
    // Quota exceeded or storage disabled — the app stays usable in-memory.
  }
}

function update(updater: (current: StoreState) => StoreState): void {
  const next = updater(state);
  if (next === state) return;
  state = next;
  persist(next);
  emit();
}

/** Guards against a partially-written or hand-edited localStorage payload. */
function isValidState(value: unknown): value is CrmState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CrmState>;
  return (
    Array.isArray(candidate.leads) &&
    Array.isArray(candidate.activities) &&
    Array.isArray(candidate.tasks)
  );
}

/**
 * Fills in fields added after a payload was written. A returning visitor's
 * saved pipeline should survive a deploy, not blank the funnel chart.
 */
function normalize(base: CrmState): CrmState {
  return {
    ...base,
    leads: base.leads.map((lead) => ({
      ...lead,
      furthestStage: lead.furthestStage ?? funnelPositionOf(lead.stage) ?? "new",
    })),
  };
}

function ensureLoaded(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;

  let base: CrmState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    base = isValidState(parsed) ? normalize(parsed) : createSeedState();
  } catch {
    base = createSeedState();
  }

  state = { ...base, hydrated: true };
  persist(state);
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // First subscriber triggers the load; the emit above re-renders with data.
  ensureLoaded();
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): StoreState {
  return state;
}

export function getServerSnapshot(): StoreState {
  return EMPTY;
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

function withActivity(
  draft: StoreState,
  kind: ActivityKind,
  message: string,
  leadId: string | null,
): StoreState {
  const activity: Activity = {
    id: createId("act"),
    kind,
    message,
    leadId,
    createdAt: new Date().toISOString(),
  };
  return { ...draft, activities: [activity, ...draft.activities].slice(0, 60) };
}

export function addLead(draft: LeadDraft): Lead {
  const now = new Date().toISOString();
  const lead: Lead = {
    ...draft,
    id: createId("lead"),
    createdAt: now,
    closedAt: STAGE_META[draft.stage].closed ? now : null,
    lastContactedAt: draft.lastContactedAt,
    touches: draft.lastContactedAt ? 1 : 0,
    furthestStage: funnelPositionOf(draft.stage) ?? "new",
  };

  update((current) =>
    withActivity(
      { ...current, leads: [lead, ...current.leads] },
      "created",
      `Added ${lead.name} at ${lead.company}`,
      lead.id,
    ),
  );

  return lead;
}

export function updateLead(id: string, draft: LeadDraft): void {
  update((current) => {
    const existing = current.leads.find((lead) => lead.id === id);
    if (!existing) return current;

    const stageChanged = existing.stage !== draft.stage;
    const nowClosed = STAGE_META[draft.stage].closed;
    const updated: Lead = {
      ...existing,
      ...draft,
      // Entering a closed stage stamps the close date; leaving one clears it.
      closedAt: nowClosed ? (existing.closedAt ?? new Date().toISOString()) : null,
      // Furthest-reached only ever moves forward, so the funnel keeps its history.
      furthestStage: deepestStage(existing.furthestStage, funnelPositionOf(draft.stage)),
    };

    const next: StoreState = {
      ...current,
      leads: current.leads.map((lead) => (lead.id === id ? updated : lead)),
    };

    return stageChanged
      ? withActivity(next, "stage-changed", `Moved ${updated.company} to ${STAGE_META[draft.stage].label}`, id)
      : withActivity(next, "updated", `Updated ${updated.company}`, id);
  });
}

export function deleteLead(id: string): void {
  update((current) => {
    const existing = current.leads.find((lead) => lead.id === id);
    if (!existing) return current;

    const next: StoreState = {
      ...current,
      leads: current.leads.filter((lead) => lead.id !== id),
      // An orphaned follow-up would be worse than losing it.
      tasks: current.tasks.filter((task) => task.leadId !== id),
    };

    return withActivity(next, "deleted", `Deleted ${existing.name} at ${existing.company}`, null);
  });
}

export function moveLead(id: string, stage: LeadStage): void {
  update((current) => {
    const existing = current.leads.find((lead) => lead.id === id);
    if (!existing || existing.stage === stage) return current;

    const updated: Lead = {
      ...existing,
      stage,
      closedAt: STAGE_META[stage].closed
        ? (existing.closedAt ?? new Date().toISOString())
        : null,
      furthestStage: deepestStage(existing.furthestStage, funnelPositionOf(stage)),
    };

    const next: StoreState = {
      ...current,
      leads: current.leads.map((lead) => (lead.id === id ? updated : lead)),
    };

    return withActivity(next, "stage-changed", `Moved ${updated.company} to ${STAGE_META[stage].label}`, id);
  });
}

/** Logs a call/email touch — the strongest positive signal in lead scoring. */
export function logTouch(id: string): void {
  update((current) => {
    const existing = current.leads.find((lead) => lead.id === id);
    if (!existing) return current;

    const updated: Lead = {
      ...existing,
      lastContactedAt: new Date().toISOString(),
      touches: existing.touches + 1,
    };

    const next: StoreState = {
      ...current,
      leads: current.leads.map((lead) => (lead.id === id ? updated : lead)),
    };

    return withActivity(next, "note", `Logged a touch on ${updated.company}`, id);
  });
}

export function toggleTask(id: string): void {
  update((current) => {
    const task = current.tasks.find((item) => item.id === id);
    if (!task) return current;

    const next: StoreState = {
      ...current,
      tasks: current.tasks.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    };

    return task.done ? next : withActivity(next, "task-completed", `Completed "${task.title}"`, task.leadId);
  });
}

export function resetDemoData(): void {
  update(() => ({ ...createSeedState(), hydrated: true }));
}
