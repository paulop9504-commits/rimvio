"use client";

import { useState } from "react";
import { Contact, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addPeerContact } from "@/lib/context/peer-contact-store";
import {
  isContactPickerSupported,
  pickDeviceContacts,
} from "@/lib/peer-chat/device-contacts";
import { syncContactsFromDevice } from "@/lib/peer-chat/peer-chat-client";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";

type PeerContactSyncButtonProps = {
  className?: string;
  onSynced?: () => void;
};

export function PeerContactSyncButton({
  className,
  onSynced,
}: PeerContactSyncButtonProps) {
  const [busy, setBusy] = useState(false);
  const supported = isContactPickerSupported();

  const runSync = async () => {
    setBusy(true);
    try {
      const deviceContacts = await pickDeviceContacts();
      if (deviceContacts.length === 0) {
        toast.message("선택한 연락처에 번호가 없어요");
        return;
      }

      const result = await syncContactsFromDevice(
        deviceContacts.map((c) => ({ name: c.name, phone: c.phoneE164 })),
      );

      for (const friend of result.friends) {
        addPeerContact({
          peerThreadId: friend.threadId,
          displayName: friend.displayName,
        });
      }

      onSynced?.();

      if (result.matched === 0) {
        toast.message(
          `연락처 ${result.scanned}개 확인 · Rimvio 가입 친구 0명`,
          {
            description: "번호를 등록한 친구만 자동으로 보여요",
          },
        );
        return;
      }

      toast.success(
        `Rimvio 친구 ${result.matched}명을 자동 등록했어요`,
        {
          description: `연락처 ${result.scanned}개 중 매칭`,
        },
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "UNSUPPORTED_CONTACT_PICKER"
      ) {
        toast.error("이 기기·브라우저는 연락처 불러오기를 지원하지 않아요", {
          description:
            "Android Chrome에서 시도하거나, ID·번호로 직접 추가해 주세요",
        });
        return;
      }
      toast.error(
        error instanceof Error ? error.message : "연락처 동기화에 실패했어요",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <button
        type="button"
        disabled={busy || !supported}
        onClick={() => void runSync()}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-2xl border border-rimvio-neon-cyan/30 bg-rimvio-neon-cyan/10 py-3 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-45",
          IOS.cardSm,
        )}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Contact className="size-4 text-rimvio-neon-cyan" aria-hidden />
        )}
        {busy ? "친구 찾는 중…" : "연락처에서 Rimvio 친구 찾기"}
      </button>
      <p className="px-1 text-center text-[10px] text-white/50">
        {supported
          ? "카톡처럼 · 번호가 Rimvio에 등록된 친구만 자동 추가 (연락처는 서버에 저장 안 함)"
          : "Android Chrome에서 사용 가능 · iPhone Safari는 ID로 추가"}
      </p>
    </div>
  );
}
