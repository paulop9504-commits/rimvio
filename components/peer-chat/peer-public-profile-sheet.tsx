"use client";

import { Globe, X } from "lucide-react";
import { MarketAlignmentRolePill } from "@/components/market/market-alignment-role-pill";
import { RimvioProfileDecorHeader } from "@/components/rimvio-profile-decor-header";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import type { PeerPublicProfile } from "@/lib/peer-chat/peer-chat-client";
import { cn } from "@/lib/utils";

type PeerPublicProfileSheetProps = {
  open: boolean;
  onClose: () => void;
  profile: PeerPublicProfile | null;
  fallbackName: string;
  loading?: boolean;
  /** DM/group thread — filters pins this peer may see on owner's globe. */
  peerThreadId?: string | null;
  /** 맞춤 대화 — 상대 역할 pill (구매 / 내놓기) */
  alignmentPeerRole?: MarketIntentRole | null;
};

export function PeerPublicProfileSheet({
  open,
  onClose,
  profile,
  fallbackName,
  loading = false,
  alignmentPeerRole = null,
}: PeerPublicProfileSheetProps) {
  if (!open) {
    return null;
  }

  const name = profile?.displayName?.trim() || fallbackName;
  const rimvioId = profile?.rimvioId;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
        role="dialog"
        aria-modal
        aria-label="친구 프로필"
        onClick={onClose}
      >
        <div
          className={cn(
            "w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-rimvio-surface shadow-xl",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-end px-4 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-rimvio-surface-muted"
              aria-label="닫기"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          {loading ? (
            <p className="px-6 pb-8 text-center text-sm text-muted-foreground">
              불러오는 중…
            </p>
          ) : (
            <div className="px-4 pb-6">
              <RimvioProfileDecorHeader
                displayName={name}
                avatarUrl={profile?.avatarUrl}
                coverUrl={profile?.coverUrl}
                coverTheme={profile?.coverTheme}
                statusMessage={profile?.statusMessage}
                compact
              />
              {alignmentPeerRole ? (
                <div className="mt-3 flex justify-center">
                  <MarketAlignmentRolePill role={alignmentPeerRole} />
                </div>
              ) : null}
              <div className="mt-3 space-y-2 text-center">
                {rimvioId ? (
                  <p className="font-mono text-sm text-rimvio-neon-cyan">@{rimvioId}</p>
                ) : (
                  <p className="text-[12px] text-muted-foreground">
                    Rimvio ID 미등록
                  </p>
                )}
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500/15 px-4 py-3 text-[14px] font-semibold text-sky-100 ring-1 ring-sky-300/25 active:bg-sky-500/25"
                  onClick={() => {
                    window.location.assign("/");
                  }}
                >
                  <Globe className="size-4" aria-hidden />
                  지구 보기
                </button>
                <p className="text-[11px] text-muted-foreground">
                  권한 있는 핀만 보여요 · 전화번호·이메일은 비공개
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
