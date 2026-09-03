"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import * as store from "@/lib/store";
import type { StoreState } from "@/lib/store";
import type { Lead, LeadDraft, LeadStage } from "@/lib/types";

interface CrmContextValue extends StoreState {
  addLead: (draft: LeadDraft) => Lead;
  updateLead: (id: string, draft: LeadDraft) => void;
  deleteLead: (id: string) => void;
  moveLead: (id: string, stage: LeadStage) => void;
  logTouch: (id: string) => void;
  toggleTask: (id: string) => void;
  resetDemoData: () => void;
  getLead: (id: string | null) => Lead | undefined;
}

const CrmContext = createContext<CrmContextValue | null>(null);

/**
 * Thin bridge between the external store and React. All the state lives in
 * `lib/store`; this only subscribes to it and exposes the actions through
 * context. The actions are module-level functions, so they are already stable
 * across renders and need no memoisation.
 */
export function CrmProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  const getLead = useCallback(
    (id: string | null) => (id ? state.leads.find((lead) => lead.id === id) : undefined),
    [state.leads],
  );

  const value = useMemo<CrmContextValue>(
    () => ({
      ...state,
      addLead: store.addLead,
      updateLead: store.updateLead,
      deleteLead: store.deleteLead,
      moveLead: store.moveLead,
      logTouch: store.logTouch,
      toggleTask: store.toggleTask,
      resetDemoData: store.resetDemoData,
      getLead,
    }),
    [state, getLead],
  );

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm(): CrmContextValue {
  const context = useContext(CrmContext);
  if (!context) throw new Error("useCrm must be used inside <CrmProvider>");
  return context;
}
