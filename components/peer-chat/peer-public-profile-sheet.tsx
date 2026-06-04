"use client";

import { X } from "lucide-react";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import type { PeerPublicProfile } from "@/lib/peer-chat/peer-chat-client";
import { cn } from "@/lib/utils";

type PeerPublicProfileSheetProps = {
  open: boolean;
  onClose: () => void;
  profile: PeerPublicProfile | null;
  fallbackName: string;
  loading?: boolean;
};

export function PeerPublicProfileSheet({
  open,
  onClose,
  profile,
  fallbackName,
  loading = false,
}: PeerPublicProfileSheetProps) {
  if (!open) {
    return null;
  }

  const name = profile?.displayName?.trim() || fallbackName;
  const rimvioId = profile?.rimvioId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-label="친구 프로필"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-3xl border border-white/10 bg-rimvio-surface p-6 shadow-xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-rimvio-surface-muted"
            aria-label="닫기"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 pb-2">
          <PeerProfileAvatar
            displayName={name}
            avatarUrl={profile?.avatarUrl}
            size="lg"
          />
          {loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          ) : (
            <>
              <p className="text-center text-lg font-semibold text-white">{name}</p>
              {rimvioId ? (
                <p className="font-mono text-sm text-rimvio-neon-cyan">@{rimvioId}</p>
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  Rimvio ID 미등록
                </p>
              )}
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                전화번호·이메일은 비공개예요
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
