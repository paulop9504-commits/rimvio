"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FivePeerHub,
} from "@/components/peer-chat/five-peer-hub";
import { PeerContactsList } from "@/components/peer-chat/peer-contacts-list";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { IOS } from "@/lib/ui/ios-surface";
import { countConnectedPeers } from "@/lib/context/pinned-peer-roster";
import {
  addPeerContactOnly,
  assignPeerToHubAndPin,
  readPinnedRoster,
  syncPinnedRoster,
} from "@/lib/context/peer-thread-settings-store";
import type { PinnedSlotIndex } from "@/lib/context/peer-thread-types";
import { useRoomGuest } from "@/hooks/use-room-guest";
import { cn } from "@/lib/utils";

type AssignMode = "pin_slot" | "contact_only";

export function FivePeerHubClient() {
  const guest = useRoomGuest();
  const router = useRouter();
  const [roster, setRoster] = useState(() => readPinnedRoster());
  const [contacts, setContacts] = useState<PeerContact[]>(() => readPeerContacts());
  const [assignSlot, setAssignSlot] = useState<PinnedSlotIndex | null>(null);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<AssignMode>("pin_slot");

  const refresh = useCallback(() => {
    setRoster(syncPinnedRoster());
    setContacts(readPeerContacts());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const centerLabel = guest.label.startsWith("나")
    ? guest.label
    : `나 (${guest.label})`;
  const centerInitial = guest.label.trim().charAt(0) || "나";

  const openPinAssign = (slotIndex: PinnedSlotIndex) => {
    setMode("pin_slot");
    setAssignSlot(slotIndex);
    setAddContactOpen(false);
    setName("");
  };

  const openContactAdd = () => {
    setMode("contact_only");
    setAddContactOpen(true);
    setAssignSlot(null);
    setName("");
  };

  const closeDialog = () => {
    setAssignSlot(null);
    setAddContactOpen(false);
    setName("");
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("이름을 입력해 주세요");
      return;
    }

    if (mode === "contact_only") {
      const result = addPeerContactOnly({ displayName: trimmed });
      if (!result.ok) {
        toast.error("친구를 추가하지 못했어요");
        return;
      }
      closeDialog();
      refresh();
      toast.success(`${trimmed}를 친구로 추가했어요`);
      router.push(`/peers/${encodeURIComponent(result.settings.peerThreadId)}`);
      return;
    }

    if (assignSlot === null) {
      return;
    }

    const { settings } = assignPeerToHubAndPin({
      slotIndex: assignSlot,
      displayName: trimmed,
    });
    closeDialog();
    refresh();
    toast.success(`${trimmed}를 AI 허브 ${assignSlot + 1}번에 꽂았어요`);
    router.push(`/peers/${encodeURIComponent(settings.peerThreadId)}`);
  };

  const dialogOpen = assignSlot !== null || addContactOpen;
  const dialogTitle =
    mode === "contact_only"
      ? "친구 추가"
      : `${(assignSlot ?? 0) + 1}번 AI 허브에 연결`;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="relative h-[min(calc(100dvh-11.5rem),42rem)] w-full shrink-0">
        <FivePeerHub
          roster={roster}
          centerLabel={centerLabel}
          centerInitial={centerInitial}
          onAssignSlot={(idx) => openPinAssign(idx as PinnedSlotIndex)}
          className="absolute inset-0"
        />
      </div>

      {dialogOpen ? (
        <div
          className={cn("mx-auto w-full max-w-sm space-y-3 p-4", IOS.cardSm)}
          role="dialog"
          aria-label={dialogTitle}
        >
          <p className="text-sm font-semibold text-white">{dialogTitle}</p>
          {mode === "pin_slot" ? (
            <p className="text-[11px] text-white/65">
              AI 허브 · full log · @import · 렌즈 가능 (최대 5명)
            </p>
          ) : (
            <p className="text-[11px] text-white/65">
              허브 없이 추가 · 로컬 저장만 (나중에 AI 허브 가능)
            </p>
          )}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 (예: 지훈)"
            className="h-11 w-full rounded-2xl border-0 bg-glango-surface-muted px-4 text-sm text-white outline-none placeholder:text-white/45 focus:ring-2 focus:ring-glango-neon-cyan/40"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submit();
              }
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-[14px] py-2.5 text-sm font-semibold text-glango-neon-cyan"
              onClick={closeDialog}
            >
              취소
            </button>
            <button
              type="button"
              className="glango-accent-submit-btn flex flex-1 items-center justify-center rounded-[14px] py-2.5 text-sm font-semibold text-white active:scale-[0.98]"
              onClick={submit}
            >
              {mode === "contact_only" ? "추가하고 열기" : "저장하고 열기"}
            </button>
          </div>
        </div>
      ) : null}

      <p className="shrink-0 text-center text-[11px] text-white/60">
        AI 허브 {countConnectedPeers(roster)}/5 · 친구 {contacts.length}명
      </p>

      <PeerContactsList
        contacts={contacts}
        onRefresh={refresh}
        onAddClick={openContactAdd}
      />
    </div>
  );
}
