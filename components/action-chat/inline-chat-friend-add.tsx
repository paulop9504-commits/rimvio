"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { resolveMainActionBrandStyle } from "@/lib/brand/action-brand-style";
import { addPeerContact } from "@/lib/context/peer-contact-store";
import { friendContactErrorMessage } from "@/lib/peer-chat/friend-contact-errors";
import {
  addPeerByPhoneRemote,
  lookupFriendContactRemote,
} from "@/lib/peer-chat/peer-chat-client";
import { emitFeedSlotsRefresh } from "@/lib/feed/feed-slots-events";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

type FriendPreview = {
  userId: string;
  displayName: string;
  rimvioId: string | null;
  avatarUrl: string | null;
  matchedBy: string;
};

const MATCHED_LABEL: Record<string, string> = {
  phone: "전화번호",
  email: "이메일",
  rimvio_id: "Rimvio ID",
};

type InlineChatFriendAddProps = {
  contact: string;
  className?: string;
};

export function InlineChatFriendAdd({ contact, className }: InlineChatFriendAddProps) {
  const router = useRouter();
  const { user, configured } = useAuth();
  const canUse = Boolean(configured && user && isSupabaseConfigured());
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<FriendPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadPreview = useCallback(() => {
    if (!canUse) {
      setLoading(false);
      setError(null);
      setPreview(null);
      return;
    }
    setLoading(true);
    setError(null);
    setPreview(null);
    void lookupFriendContactRemote(contact)
      .then((data) => setPreview(data.profile))
      .catch((err) => {
        setError(
          friendContactErrorMessage(
            err instanceof Error ? err.message : undefined,
          ),
        );
      })
      .finally(() => setLoading(false));
  }, [canUse, contact]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const confirmAdd = useCallback(() => {
    if (!preview || !canUse) {
      return;
    }
    setSubmitting(true);
    void addPeerByPhoneRemote({ contact })
      .then((result) => {
        addPeerContact({
          peerThreadId: result.threadId,
          displayName: result.displayName,
        });
        emitFeedSlotsRefresh();
        toast.success(`${result.displayName}님을 친구로 추가했어요`);
        router.push(`/peers/${encodeURIComponent(result.threadId)}`);
      })
      .catch((err) => {
        toast.error(
          friendContactErrorMessage(
            err instanceof Error ? err.message : undefined,
          ),
        );
      })
      .finally(() => setSubmitting(false));
  }, [canUse, contact, preview, router]);

  const brand = resolveMainActionBrandStyle({
    label: "친구 추가",
    deeplink: "",
  });

  if (!canUse) {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-[12px] text-amber-200/90">
          친추는 Google 로그인 후에 쓸 수 있어요.
        </p>
        <Link
          href="/welcome"
          className="inline-block text-sm font-semibold text-rimvio-neon-cyan"
        >
          로그인하기 →
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <p className={cn("text-[12px] text-white/55", className)}>프로필 확인 중…</p>
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-[12px] text-amber-200/90">{error}</p>
        <button
          type="button"
          onClick={loadPreview}
          className="text-[11px] font-medium text-rimvio-neon-cyan underline-offset-2 hover:underline"
        >
          다시 확인
        </button>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3 rounded-2xl border border-rimvio-neon-cyan/20 bg-gradient-to-br from-white/[0.08] to-white/[0.02] px-3 py-3 shadow-[0_8px_32px_rgba(50,215,255,0.08)]">
        <PeerProfileAvatar
          displayName={preview.displayName}
          avatarUrl={preview.avatarUrl}
          size="md"
          className="ring-2 ring-rimvio-neon-cyan/25"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {preview.displayName}
          </p>
          {preview.rimvioId ? (
            <p className="truncate text-[12px] text-rimvio-neon-cyan/90">
              @{preview.rimvioId}
            </p>
          ) : null}
          <p className="mt-0.5 text-[10px] text-white/45">
            {MATCHED_LABEL[preview.matchedBy] ?? preview.matchedBy}로 찾음
          </p>
        </div>
      </div>
      <p className="text-[11px] text-white/50">
        Google 가입만 한 친구도 이메일로 찾을 수 있어요. 맞으면 친구 추가를 눌러 주세요.
      </p>
      <MainActionButton
        label={submitting ? "추가 중…" : "친구 추가"}
        brand={brand}
        compact
        onClick={() => confirmAdd()}
      />
    </div>
  );
}
