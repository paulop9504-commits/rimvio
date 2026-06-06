"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { resolveMainActionBrandStyle } from "@/lib/brand/action-brand-style";
import { friendContactErrorMessage } from "@/lib/peer-chat/friend-contact-errors";
import {
  addPeerByPhoneRemote,
  lookupFriendContactRemote,
} from "@/lib/peer-chat/peer-chat-client";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

export type FriendAddPreview = {
  userId: string;
  displayName: string;
  rimvioId: string | null;
  avatarUrl: string | null;
  emailLower?: string | null;
  matchedBy: string;
};

export type FriendAddResult = {
  threadId: string;
  displayName: string;
  otherUserId?: string;
  rimvioId?: string | null;
  emailLower?: string | null;
  preview: FriendAddPreview;
};

const MATCHED_LABEL: Record<string, string> = {
  phone: "전화번호",
  email: "이메일",
  rimvio_id: "Rimvio ID",
};

type FriendAddContactFlowProps = {
  contact: string;
  className?: string;
  confirmLabel?: string;
  helperText?: string;
  onAdded?: (result: FriendAddResult) => void | Promise<void>;
  onError?: (message: string) => void;
};

export function FriendAddContactFlow({
  contact,
  className,
  confirmLabel = "친구 추가",
  helperText = "Google 가입만 한 친구도 이메일로 찾을 수 있어요. 맞으면 친구 추가를 눌러 주세요.",
  onAdded,
  onError,
}: FriendAddContactFlowProps) {
  const { user, configured } = useAuth();
  const canUse = Boolean(configured && user && isSupabaseConfigured());
  const trimmedContact = contact.trim();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<FriendAddPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadPreview = useCallback(() => {
    if (!canUse || !trimmedContact) {
      setLoading(false);
      setError(null);
      setPreview(null);
      return;
    }
    setLoading(true);
    setError(null);
    setPreview(null);
    void lookupFriendContactRemote(trimmedContact)
      .then((data) => setPreview(data.profile))
      .catch((err) => {
        const message = friendContactErrorMessage(
          err instanceof Error ? err.message : undefined,
        );
        setError(message);
        onError?.(message);
      })
      .finally(() => setLoading(false));
  }, [canUse, trimmedContact, onError]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const confirmAdd = useCallback(() => {
    if (!preview || !canUse) {
      return;
    }
    setSubmitting(true);
    void addPeerByPhoneRemote({ contact: trimmedContact })
      .then(async (result) => {
        await onAdded?.({
          threadId: result.threadId,
          displayName: result.displayName,
          otherUserId: result.otherUserId,
          rimvioId: preview.rimvioId ?? result.rimvioId,
          emailLower: preview.emailLower ?? result.emailLower,
          preview,
        });
      })
      .catch((err) => {
        const message = friendContactErrorMessage(
          err instanceof Error ? err.message : undefined,
        );
        onError?.(message);
      })
      .finally(() => setSubmitting(false));
  }, [canUse, trimmedContact, preview, onAdded, onError]);

  const brand = resolveMainActionBrandStyle({
    label: confirmLabel,
    deeplink: "",
  });

  if (!trimmedContact) {
    return null;
  }

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
      {helperText ? (
        <p className="text-[11px] text-white/50">{helperText}</p>
      ) : null}
      <MainActionButton
        label={submitting ? "추가 중…" : confirmLabel}
        brand={brand}
        compact
        onClick={() => confirmAdd()}
      />
    </div>
  );
}
