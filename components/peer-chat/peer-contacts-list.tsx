"use client";

import Link from "next/link";
import { Pin, PinOff, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { findConnectedPeerSlot } from "@/lib/context/pinned-peer-roster";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import {
  readPinnedRoster,
  setPeerThreadPinned,
  syncPinnedRoster,
} from "@/lib/context/peer-thread-settings-store";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";

type PeerContactsListProps = {
  contacts: PeerContact[];
  onRefresh: () => void;
  onAddClick: () => void;
  className?: string;
};

export function PeerContactsList({
  contacts,
  onRefresh,
  onAddClick,
  className,
}: PeerContactsListProps) {
  const roster = readPinnedRoster();

  const handlePinToggle = (contact: PeerContact, pinned: boolean) => {
    const result = setPeerThreadPinned({
      peerThreadId: contact.peerThreadId,
      displayName: contact.displayName,
      pinned,
    });
    syncPinnedRoster();
    onRefresh();
    if (!result.ok && result.reason === "roster_full") {
      toast.error("AI 허브 5칸이 가득 찼어요. 다른 친구 허브를 해제해 주세요");
      return;
    }
    toast.success(
      pinned
        ? `${contact.displayName}를 AI 허브에 꽂았어요`
        : `${contact.displayName}의 허브를 해제했어요`,
    );
  };

  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-white">전체 친구</h2>
        <span className="text-[11px] text-white/60">
          {contacts.length}명 · 추가 무제한
        </span>
      </div>

      <button
        type="button"
        onClick={onAddClick}
        className={cn(
          "relative z-10 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-glango-surface py-3 text-sm font-medium text-white active:scale-[0.98]",
          IOS.cardSm,
        )}
      >
        <UserPlus className="size-4 text-glango-neon-cyan" aria-hidden />
        친구 추가 (허브 없이)
      </button>

      {contacts.length === 0 ? (
        <p className="rounded-2xl bg-glango-surface-muted px-4 py-6 text-center text-xs text-white/65">
          아직 친구가 없어요. 위에서 추가하거나 AI 허브 슬롯에 연결해 보세요
        </p>
      ) : (
        <ul className={cn("divide-y divide-border overflow-hidden", IOS.cardSm)}>
          {contacts.map((contact) => {
            const pinned = Boolean(
              findConnectedPeerSlot(roster, contact.peerThreadId),
            );
            const href = `/peers/${encodeURIComponent(contact.peerThreadId)}`;

            return (
              <li key={contact.peerThreadId} className="flex items-center gap-2 bg-glango-surface">
                <Link
                  href={href}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 active:bg-glango-surface-muted"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-glango-surface-muted text-sm font-semibold text-white">
                    {contact.displayName.trim().charAt(0) || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{contact.displayName}</p>
                    <p className="text-[11px] text-white/60">
                      {pinned ? "AI 허브 · @import 가능" : "로컬 저장만"}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => handlePinToggle(contact, !pinned)}
                  className="mr-3 flex size-9 shrink-0 items-center justify-center rounded-full text-glango-neon-cyan active:bg-glango-neon-purple/10"
                  aria-label={pinned ? "AI 허브 해제" : "AI 허브에 꽂기"}
                >
                  {pinned ? (
                    <PinOff className="size-4" aria-hidden />
                  ) : (
                    <Pin className="size-4" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

