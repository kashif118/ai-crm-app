"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, X } from "lucide-react";
import { AssistantPanel } from "./AssistantPanel";
import { cn } from "@/lib/utils";

/**
 * Floating assistant, available on every page except /assistant (which is the
 * full-size version of the same panel).
 */
export function AiChatWidget() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <div
        className={cn(
          "fixed bottom-0 right-0 z-40 flex w-full flex-col overflow-hidden border border-line bg-surface shadow-2xl transition-all duration-200 sm:bottom-24 sm:right-6 sm:w-[400px] sm:rounded-2xl",
          open
            ? "pointer-events-auto h-[min(560px,88vh)] opacity-100"
            : "pointer-events-none h-0 opacity-0",
        )}
        role="dialog"
        aria-label="AI sales assistant"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ink">AI sales assistant</p>
            <p className="text-[12px] text-ink-muted">Ask about deals or draft an email</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
            className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-hover hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Mounted only while open so the conversation starts fresh each time */}
        {open ? <AssistantPanel compact className="min-h-0 flex-1" /> : null}
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        className={cn(
          "fixed bottom-5 right-5 z-40 flex h-12 items-center gap-2 rounded-full bg-accent px-4 text-accent-ink shadow-lg transition-transform hover:bg-accent-hover active:scale-95",
          open && "sm:bottom-5",
        )}
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <>
            <MessageSquareText className="h-5 w-5" aria-hidden="true" />
            <span className="hidden text-sm font-medium sm:inline">Ask AI</span>
          </>
        )}
      </button>
    </>
  );
}
