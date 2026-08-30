"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChecklistItem } from "@/lib/hub/standards";
import { cn } from "@/lib/utils";

type HubStandardsChecklistProps = {
  readonly storageKey: string;
  readonly items: readonly ChecklistItem[];
  readonly compact?: boolean;
  readonly onChange?: (completedIds: readonly string[]) => void;
};

export function HubStandardsChecklist({
  storageKey,
  items,
  compact,
  onChange,
}: HubStandardsChecklistProps) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const ids = JSON.parse(raw) as string[];
        setCompleted(new Set(ids));
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const toggle = useCallback(
    (id: string) => {
      setCompleted((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        try {
          localStorage.setItem(storageKey, JSON.stringify([...next]));
        } catch {
          /* ignore */
        }
        onChange?.([...next]);
        return next;
      });
    },
    [storageKey, onChange],
  );

  const requiredTotal = items.filter((i) => i.required).length;
  const requiredDone = items.filter((i) => i.required && completed.has(i.id)).length;
  const allRequiredDone = requiredTotal === 0 || requiredDone >= requiredTotal;

  return (
    <div className={cn(compact ? "mt-2" : "mt-3")}>
      {!compact && requiredTotal > 0 ? (
        <p
          className={cn(
            "mb-2 text-[11px] font-medium",
            allRequiredDone ? "text-emerald-600" : "text-[#64748b]",
          )}
        >
          필수 {requiredDone}/{requiredTotal}
          {allRequiredDone ? " · 제출 준비 OK" : ""}
        </p>
      ) : null}

      <ul className="space-y-1">
        {items.map((item) => {
          const checked = completed.has(item.id);
          return (
            <li key={item.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#f8fafc]",
                  compact ? "text-[11px]" : "text-[12px]",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item.id)}
                  className="mt-0.5 size-3.5 rounded border-[#cbd5e1] text-violet-600 focus:ring-violet-200"
                />
                <span className={cn("text-[#334155]", checked && "text-[#64748b] line-through")}>
                  {item.labelKo}
                  {item.required ? (
                    <span className="ml-1 text-[10px] text-violet-500">*</span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function readChecklistProgress(storageKey: string, items: readonly ChecklistItem[]): {
  completed: number;
  requiredCompleted: number;
  requiredTotal: number;
  allRequiredDone: boolean;
} {
  let completedIds: string[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) completedIds = JSON.parse(raw) as string[];
  } catch {
    /* ignore */
  }
  const set = new Set(completedIds);
  const requiredTotal = items.filter((i) => i.required).length;
  const requiredCompleted = items.filter((i) => i.required && set.has(i.id)).length;
  return {
    completed: set.size,
    requiredCompleted,
    requiredTotal,
    allRequiredDone: requiredTotal === 0 || requiredCompleted >= requiredTotal,
  };
}
