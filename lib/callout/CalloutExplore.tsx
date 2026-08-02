"use client";

import { useState } from "react";
import {
  OBJECT_RELATION_TYPE_LABEL_KO,
  type ObjectRelation,
  type ObjectRelationType,
} from "@/lib/callout/object-relation";
import type { CalloutViewModel } from "@/lib/callout/types";
import { cn } from "@/lib/utils";

const EXPLORE_TABS: readonly ObjectRelationType[] = [
  "nearby",
  "similar",
  "connected",
];

export function CalloutExplore({
  model,
  activeRelationType,
  onSelectRelationType,
  onSelectRelation,
  onConnect,
  className,
}: {
  model: CalloutViewModel["explore"];
  activeRelationType?: ObjectRelationType | null;
  onSelectRelationType?: (type: ObjectRelationType) => void;
  onSelectRelation?: (relation: ObjectRelation) => void;
  onConnect?: (targetId: string) => void;
  className?: string;
}) {
  const [localType, setLocalType] = useState<ObjectRelationType>("nearby");
  const active = activeRelationType ?? localType;
  const relations = model.buckets[active] ?? [];

  return (
    <div className={cn("space-y-2.5", className)} data-callout-mode="explore">
      <p className="text-[11px] font-semibold tracking-[0.04em] text-[#8b95a1]">
        Explore
      </p>

      <div
        className="flex gap-1 overflow-x-auto rounded-[14px] bg-[#f2f4f6] p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Explore relation types"
      >
        {EXPLORE_TABS.map((type) => {
          const on = type === active;
          const count = model.buckets[type]?.length ?? 0;
          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={on}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                on
                  ? "bg-white text-[#191f28] shadow-[0_1px_4px_rgba(25,31,40,0.08)]"
                  : "text-[#8b95a1]",
              )}
              onClick={() => {
                setLocalType(type);
                onSelectRelationType?.(type);
              }}
            >
              {OBJECT_RELATION_TYPE_LABEL_KO[type]}
              {count > 0 ? (
                <span
                  className={cn(
                    "tabular-nums",
                    on ? "text-[#3182f6]" : "text-[#c4c9d0]",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {relations.length === 0 ? (
        <p className="text-[12px] leading-snug text-[#8b95a1]">
          {active === "nearby"
            ? "주변에 연결된 노드가 아직 없어요"
            : active === "similar"
              ? "비슷한 후보가 아직 없어요"
              : "연결된 객체가 아직 없어요"}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {relations.map((rel) => (
            <li key={rel.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-[14px] bg-white px-3 py-2.5 text-left ring-1 ring-black/[0.04] transition-colors active:bg-[#f9fafb]"
                onClick={() => onSelectRelation?.(rel)}
              >
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold tracking-[0.02em] text-[#8b95a1]">
                    {rel.roleLabelKo}
                    {rel.meters != null ? ` · ${rel.meters}m` : ""}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#191f28]">
                    {rel.title}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] font-semibold text-[#3182f6]">
                  보기
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {model.connectTargets.length > 0 ? (
        <div className="pt-1">
          <p className="mb-1.5 text-[10px] font-semibold text-[#8b95a1]">
            연결하기
          </p>
          <div className="flex flex-wrap gap-1.5">
            {model.connectTargets.map((t) => (
              <button
                key={t.id}
                type="button"
                className="rounded-full bg-[#f2f4f6] px-2.5 py-1 text-[11px] font-semibold text-[#4e5968]"
                onClick={() => onConnect?.(t.id)}
              >
                + {t.labelKo}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
