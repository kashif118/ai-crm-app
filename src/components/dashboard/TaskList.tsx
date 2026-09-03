"use client";

import { CalendarCheck, CircleAlert } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCrm } from "@/providers/CrmProvider";
import { upcomingTasks } from "@/lib/analytics";
import { cn, daysBetween, formatRelative, formatShortDate } from "@/lib/utils";

export function TaskList() {
  const { tasks, toggleTask } = useCrm();
  const pending = upcomingTasks(tasks, 6);
  const overdue = pending.filter((task) => daysBetween(new Date(task.dueAt), new Date()) > 0);

  return (
    <Card interactive className="flex h-full flex-col">
      <CardHeader
        title="Upcoming follow-ups"
        subtitle={
          overdue.length > 0
            ? `${overdue.length} overdue · ${pending.length} open`
            : `${pending.length} open`
        }
      />
      {pending.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Nothing scheduled"
          description="Every follow-up is done. Add a task from a lead to schedule the next one."
        />
      ) : (
        <ul className="flex-1 divide-y divide-line">
          {pending.map((task) => {
            const daysLate = daysBetween(new Date(task.dueAt), new Date());
            const isOverdue = daysLate > 0;
            const isToday = daysLate === 0;

            return (
              <li key={task.id} className="flex items-start gap-3 px-5 py-3">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
                  aria-label={`Mark "${task.title}" complete`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-ink">{task.title}</p>
                  <p
                    className={cn(
                      "mt-0.5 flex items-center gap-1 text-[12px]",
                      isOverdue ? "text-critical-text" : isToday ? "text-ink" : "text-ink-muted",
                    )}
                  >
                    {isOverdue ? (
                      <CircleAlert className="h-3 w-3" aria-hidden="true" />
                    ) : null}
                    {isOverdue
                      ? `Overdue — was due ${formatRelative(task.dueAt)}`
                      : isToday
                        ? "Due today"
                        : `Due ${formatShortDate(task.dueAt)}`}
                  </p>
                </div>
                {task.priority === "high" ? (
                  <span className="mt-0.5 shrink-0 rounded-full bg-sunken px-2 py-0.5 text-[11px] font-medium text-ink-secondary">
                    High
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
