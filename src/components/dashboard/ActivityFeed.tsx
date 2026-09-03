"use client";

import { Activity as ActivityIcon, ArrowRightLeft, FileText, Trash2, UserPlus, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Activity, ActivityKind } from "@/lib/types";
import { formatRelative } from "@/lib/utils";

const ICONS: Record<ActivityKind, LucideIcon> = {
  created: UserPlus,
  updated: FileText,
  "stage-changed": ArrowRightLeft,
  deleted: Trash2,
  note: FileText,
  "task-completed": CheckCircle2,
};

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  const recent = activities.slice(0, 7);

  return (
    <Card interactive className="flex h-full flex-col">
      <CardHeader title="Recent activity" subtitle="Everything that changed, newest first" />
      {recent.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="No activity yet"
          description="Add or edit a lead and it will show up here."
        />
      ) : (
        <ol className="flex-1 divide-y divide-line">
          {recent.map((activity) => {
            const Icon = ICONS[activity.kind] ?? FileText;
            return (
              <li key={activity.id} className="flex items-start gap-3 px-5 py-3">
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sunken"
                  aria-hidden="true"
                >
                  <Icon className="h-3.5 w-3.5 text-ink-muted" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-ink">{activity.message}</p>
                  <p className="text-[12px] text-ink-muted">
                    {formatRelative(activity.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
