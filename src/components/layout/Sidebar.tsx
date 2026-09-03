"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { NAV_ITEMS } from "./nav";
import { Button } from "@/components/ui/Button";
import { useCrm } from "@/providers/CrmProvider";
import { isOpenStage } from "@/lib/types";
import { cn, formatCompactCurrency } from "@/lib/utils";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { leads, hydrated } = useCrm();

  const openDeals = leads.filter((lead) => isOpenStage(lead.stage));
  const pipelineValue = openDeals.reduce((total, lead) => total + lead.value, 0);

  return (
    <>
      {/* Mobile scrim */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 lg:hidden",
          open ? "block animate-fade-in" : "hidden",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-line px-5">
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <Sparkles className="h-4 w-4 text-accent-ink" aria-hidden="true" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink">
              Nova<span className="text-ink-muted">CRM</span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <nav className="scroll-thin flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  active ? "bg-accent-wash" : "hover:bg-hover",
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    active ? "text-accent" : "text-ink-muted group-hover:text-ink-secondary",
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      active ? "text-ink" : "text-ink-secondary group-hover:text-ink",
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-ink-muted">
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-3">
          <div className="rounded-lg bg-sunken px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
              Open pipeline
            </p>
            <p className="mt-1 text-xl font-semibold text-ink">
              {hydrated ? formatCompactCurrency(pipelineValue) : "—"}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-muted">
              {hydrated ? `across ${openDeals.length} active deals` : "loading"}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
