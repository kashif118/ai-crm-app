"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, RotateCcw } from "lucide-react";
import { PAGE_TITLES } from "./nav";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useCrm } from "@/providers/CrmProvider";
import { initials } from "@/lib/utils";

const CURRENT_USER = "Avery Chen";

export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const pathname = usePathname();
  const { resetDemoData } = useCrm();
  const [confirmReset, setConfirmReset] = useState(false);

  const page = PAGE_TITLES[pathname] ?? { title: "NovaCRM", subtitle: "" };

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-page/85 px-4 backdrop-blur-md sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenNav}
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold text-ink">{page.title}</h1>
          {page.subtitle ? (
            <p className="truncate text-[12px] text-ink-muted">{page.subtitle}</p>
          ) : null}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmReset(true)}
          className="hidden sm:inline-flex"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset demo data
        </Button>

        <ThemeToggle />

        <div className="flex items-center gap-2.5 border-l border-line pl-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-wash text-[12px] font-semibold text-accent"
            aria-hidden="true"
          >
            {initials(CURRENT_USER)}
          </span>
          <span className="hidden text-[13px] font-medium text-ink-secondary md:block">
            {CURRENT_USER}
          </span>
        </div>
      </header>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset demo data?"
        description="This replaces everything in this browser with a freshly generated demo pipeline."
        size="max-w-md"
        footer={
          <>
            <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                resetDemoData();
                setConfirmReset(false);
              }}
            >
              Reset data
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-secondary">
          Leads, activity history and follow-up tasks are stored in this browser only. Resetting
          discards any leads you have added or edited and regenerates the sample book of business
          against today&apos;s date.
        </p>
      </Modal>
    </>
  );
}
