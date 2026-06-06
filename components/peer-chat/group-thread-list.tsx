"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Users } from "lucide-react";
import { findSlotByPeerId } from "@/lib/context/pinned-peer-roster";
import { readPinnedRoster } from "@/lib/context/peer-thread-settings-store";
import { cn } from "@/lib/utils";

export type GroupThreadListItem = {
  threadId: string;
  displayName: string;
};

type GroupThreadListProps = {
  groups: readonly GroupThreadListItem[];
  onCreate: () => void;
  className?: string;
};

function GroupPinBadge({ threadId }: { threadId: string }) {
  const roster = useMemo(() => readPinnedRoster(), []);
  const slot = findSlotByPeerId(roster, threadId);
  if (slot?.connection !== "connected" || slot.slotIndex === undefined) {
    return null;
  }
  return (
    <span className="shrink-0 rounded-full bg-[#FEE500]/15 px-2 py-0.5 text-[10px] font-bold text-[#FEE500]">
      {slot.slotIndex + 1}번
    </span>
  );
}

export function GroupThreadList({ groups, onCreate, className }: GroupThreadListProps) {
  return (
    <section className={cn("mx-1 space-y-2", className)} aria-label="단톡 목록">
      <div className="flex items-center justify-between gap-2 px-1">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-white/38">
          단톡
        </h3>
        <button
          type="button"
          onClick={onCreate}
          className="text-[12px] font-semibold text-rimvio-neon-cyan"
        >
          + 만들기
        </button>
      </div>

      {groups.length === 0 ? (
        <button
          type="button"
          onClick={onCreate}
          className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-left ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.07]"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-rimvio-neon-cyan/15 text-rimvio-neon-cyan">
            <Users className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-white">첫 단톡 만들기</span>
            <span className="mt-0.5 block text-[12px] text-white/42">
              친구 여러 명과 함께 약속·일정을 맞춰 보세요
            </span>
          </span>
        </button>
      ) : (
        <ul className="space-y-1.5">
          {groups.map((group) => (
            <li key={group.threadId}>
              <Link
                href={`/peers/${encodeURIComponent(group.threadId)}`}
                className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.07]"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-white/75">
                  <Users className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-white">
                  {group.displayName}
                </span>
                <GroupPinBadge threadId={group.threadId} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
