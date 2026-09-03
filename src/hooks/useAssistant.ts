"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useCrm } from "@/providers/CrmProvider";
import { buildMetrics } from "@/lib/analytics";
import { rankLeads } from "@/lib/scoring";
import { isOpenStage } from "@/lib/types";
import type { ChatMessage, Lead } from "@/lib/types";
import type { AssistantContext, AssistantLead } from "@/lib/assistant";
import { STAGE_META } from "@/lib/constants";
import { createId, daysBetween } from "@/lib/utils";

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  content: `I can see your live pipeline. Ask me things like:

- **What should I focus on today?**
- **Draft a follow-up email for my top deal**
- **What's at risk this week?**
- **How do I handle a price objection?**`,
  createdAt: new Date(0).toISOString(),
};

/**
 * Owns the assistant conversation and assembles the pipeline snapshot that
 * grounds every answer. The snapshot is rebuilt per request from live CRM
 * state, so a lead edited a second ago is already in scope.
 */
export function useAssistant(focusLeadId: string | null = null) {
  const { leads, hydrated } = useCrm();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const context = useMemo<AssistantContext>(() => {
    const now = new Date();
    const metrics = buildMetrics(leads, now);
    const open = leads.filter((lead) => isOpenStage(lead.stage));
    const ranked = rankLeads(open, now);

    const toAssistantLead = (lead: (typeof ranked)[number]): AssistantLead => ({
      name: lead.name,
      company: lead.company,
      stage: STAGE_META[lead.stage].label,
      value: lead.value,
      owner: lead.owner,
      score: lead.ai.score,
      tier: lead.ai.tier,
      daysSinceContact: lead.lastContactedAt
        ? daysBetween(new Date(lead.lastContactedAt), now)
        : null,
      nextAction: lead.ai.nextAction,
    });

    const focus = focusLeadId ? ranked.find((lead) => lead.id === focusLeadId) : undefined;

    return {
      totalLeads: leads.length,
      openDeals: open.length,
      pipelineValue: metrics.pipelineValue,
      monthRevenue: metrics.monthlyRevenue.value,
      conversionRate: metrics.conversionRate.value,
      averageDealSize: metrics.averageDealSize,
      topLeads: ranked.slice(0, 6).map(toAssistantLead),
      stalledLeads: ranked
        .filter((lead) => {
          const idle = lead.lastContactedAt
            ? daysBetween(new Date(lead.lastContactedAt), now)
            : daysBetween(new Date(lead.createdAt), now);
          return idle > 21;
        })
        .slice(0, 6)
        .map(toAssistantLead),
      focusLead: focus ? toAssistantLead(focus) : null,
    };
  }, [leads, focusLeadId]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;

      setError(null);
      const userMessage: ChatMessage = {
        id: createId("msg"),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      const replyId = createId("msg");

      // History sent to the model, excluding the local greeting.
      const history = messages
        .filter((message) => message.id !== "greeting")
        .map((message) => ({ role: message.role, content: message.content }));

      setMessages((current) => [
        ...current,
        userMessage,
        {
          id: replyId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
        },
      ]);
      setPending(true);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history, context }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Assistant request failed (${response.status})`);
        }

        const engine =
          response.headers.get("x-assistant-engine") === "claude" ? "claude" : "local";
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          setMessages((current) =>
            current.map((message) =>
              message.id === replyId ? { ...message, content: buffer, engine } : message,
            ),
          );
        }

        setMessages((current) =>
          current.map((message) =>
            message.id === replyId
              ? { ...message, content: buffer.trim(), engine }
              : message,
          ),
        );
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        setError("The assistant is unavailable right now. Please try again.");
        setMessages((current) => current.filter((message) => message.id !== replyId));
      } finally {
        setPending(false);
      }
    },
    [messages, context, pending],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([GREETING]);
    setError(null);
    setPending(false);
  }, []);

  return { messages, send, reset, pending, error, hydrated, context };
}

/** Suggested prompts, tailored to whatever the pipeline actually contains. */
export function suggestionsFor(leads: Lead[], focus?: Lead | null): string[] {
  if (focus) {
    return [
      `Draft a follow-up email to ${focus.name.split(" ")[0]} at ${focus.company}`,
      `Why is ${focus.company} scored the way it is?`,
      "What should my next step be on this deal?",
    ];
  }
  const base = [
    "What should I focus on today?",
    "How is the pipeline looking?",
    "What's at risk this week?",
  ];
  if (leads.length > 0) base.push("Draft a follow-up email for my top deal");
  return base;
}
