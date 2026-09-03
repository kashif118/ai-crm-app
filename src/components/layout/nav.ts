import { BarChart3, Bot, KanbanSquare, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: BarChart3,
    description: "Revenue, pipeline and today's follow-ups",
  },
  {
    href: "/leads",
    label: "Leads",
    icon: Users,
    description: "Search, score and manage every contact",
  },
  {
    href: "/pipeline",
    label: "Pipeline",
    icon: KanbanSquare,
    description: "Drag deals through the sales stages",
  },
  {
    href: "/assistant",
    label: "AI Assistant",
    icon: Bot,
    description: "Ask about deals or draft client emails",
  },
];

export const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Executive dashboard", subtitle: "Pipeline performance at a glance" },
  "/leads": { title: "Leads", subtitle: "Every contact, scored and searchable" },
  "/pipeline": { title: "Deals pipeline", subtitle: "Drag a deal to move it between stages" },
  "/assistant": { title: "AI sales assistant", subtitle: "Grounded in your live pipeline" },
};
