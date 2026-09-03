"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, RotateCcw, Sparkles, User } from "lucide-react";
import { MarkdownLite } from "./MarkdownLite";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Badge";
import { useAssistant, suggestionsFor } from "@/hooks/useAssistant";
import { useCrm } from "@/providers/CrmProvider";
import { cn } from "@/lib/utils";

/**
 * The chat surface, shared by the floating widget and the full-page assistant
 * so both stay in step. The engine chip is honest about which brain answered:
 * "Claude" when ANTHROPIC_API_KEY is configured, "On-device" for the built-in
 * rule engine that ships with the demo.
 */
export function AssistantPanel({
  focusLeadId = null,
  className,
  compact = false,
}: {
  focusLeadId?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const { messages, send, reset, pending, error } = useAssistant(focusLeadId);
  const { leads, getLead } = useCrm();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = suggestionsFor(leads, getLead(focusLeadId));
  const showSuggestions = messages.length <= 1;

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  const submit = (text: string) => {
    void send(text);
    setDraft("");
    inputRef.current?.focus();
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div
        ref={scrollRef}
        className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "flex-row-reverse" : "flex-row",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                message.role === "user" ? "bg-sunken" : "bg-accent-wash",
              )}
              aria-hidden="true"
            >
              {message.role === "user" ? (
                <User className="h-3.5 w-3.5 text-ink-muted" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-accent" />
              )}
            </span>

            <div
              className={cn(
                "min-w-0 max-w-[85%] rounded-xl px-3.5 py-2.5",
                message.role === "user"
                  ? "bg-accent text-accent-ink"
                  : "border border-line bg-surface text-ink-secondary",
              )}
            >
              {message.role === "user" ? (
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">
                  {message.content}
                </p>
              ) : message.content ? (
                <>
                  <MarkdownLite text={message.content} />
                  {message.engine ? (
                    <p className="mt-2 text-[11px] text-ink-muted">
                      {message.engine === "claude" ? "Answered by Claude" : "On-device engine"}
                    </p>
                  ) : null}
                </>
              ) : (
                <ThinkingDots />
              )}
            </div>
          </div>
        ))}

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-critical/40 bg-critical/5 px-3 py-2 text-[13px] text-critical-text"
          >
            {error}
          </p>
        ) : null}
      </div>

      {showSuggestions ? (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => submit(suggestion)}
              disabled={pending}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-left text-[12px] text-ink-secondary transition-colors hover:border-line-strong hover:bg-hover hover:text-ink disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
        className="border-t border-line p-3"
      >
        <div className="flex items-end gap-2 rounded-xl border border-line bg-surface p-2 transition-colors focus-within:border-accent">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(draft);
              }
            }}
            rows={compact ? 1 : 2}
            placeholder="Ask about a deal, or say “draft a follow-up email”…"
            aria-label="Message the AI sales assistant"
            className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent px-1.5 py-1 text-sm text-ink outline-none placeholder:text-ink-muted"
          />
          <Button
            type="submit"
            variant="primary"
            size="icon"
            disabled={pending || draft.trim().length === 0}
            aria-label="Send message"
            className="h-8 w-8 shrink-0 rounded-lg"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 px-1">
          <Chip>
            <Bot className="h-3 w-3" aria-hidden="true" />
            Grounded in your pipeline
          </Chip>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-ink-muted transition-colors hover:bg-hover hover:text-ink"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            New chat
          </button>
        </div>
      </form>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Assistant is thinking">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted"
          style={{ animationDelay: `${index * 140}ms` }}
        />
      ))}
    </span>
  );
}
