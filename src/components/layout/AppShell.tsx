"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AiChatWidget } from "@/components/ai/AiChatWidget";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  // The assistant page is the full-size version of the widget — showing the
  // floating one there would be two chats on the same screen.
  const showFloatingAssistant = pathname !== "/assistant";

  return (
    <div className="min-h-screen">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onOpenNav={() => setNavOpen(true)} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      {showFloatingAssistant ? <AiChatWidget /> : null}
    </div>
  );
}
