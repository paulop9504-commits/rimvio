"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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

const LOOKUP_DEBOUNCE_MS = 240;

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
  const { user, configured, loading: authLoading } = useAuth();
  const authReady = Boolean(
    !authLoading && configured && user && isSupabaseConfigured(),
  );
  const trimmedContact = contact.trim();
  const [debouncedContact, setDebouncedContact] = useState(trimmedContact);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<FriendAddPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onErrorRef = useRef(onError);
  const onAddedRef = useRef(onAdded);
  const lookupSeqRef = useRef(0);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onAddedRef.current = onAdded;
  }, [onAdded]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedContact(trimmedContact),
      LOOKUP_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [trimmedContact]);

  const loadPreview = useCallback(() => {
    if (authLoading) {
      setLoading(true);
      setError(null);
      return;
    }

    if (!authReady || !debouncedContact) {
      setLoading(false);
      setError(null);
      setPreview(null);
      return;
    }

    const seq = ++lookupSeqRef.current;
    setLoading(true);
    setError(null);
    setPreview(null);

    void lookupFriendContactRemote(debouncedContact)
      .then((data) => {
        if (seq !== lookupSeqRef.current) {
          return;
        }
        setPreview(data.profile);
      })
      .catch((err) => {
        if (seq !== lookupSeqRef.current) {
          return;
        }
        const message = friendContactErrorMessage(
          err instanceof Error ? err.message : undefined,
        );
        setError(message);
        onErrorRef.current?.(message);
      })
      .finally(() => {
        if (seq !== lookupSeqRef.current) {
          return;
        }
        setLoading(false);
      });
  }, [authLoading, authReady, debouncedContact]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const confirmAdd = useCallback(() => {
    if (!preview || !authReady) {
      return;
    }
    setSubmitting(true);
    void addPeerByPhoneRemote({ contact: debouncedContact })
      .then(async (result) => {
        await onAddedRef.current?.({
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
        onErrorRef.current?.(message);
      })
      .finally(() => setSubmitting(false));
  }, [authReady, debouncedContact, preview]);

  const brand = resolveMainActionBrandStyle({
    label: confirmLabel,
    deeplink: "",
  });

  if (!trimmedContact) {
    return null;
  }

  if (authLoading) {
    return (
      <p className={cn("text-[12px] text-[#6b7684]", className)}>로그인 확인 중…</p>
    );
  }

  if (!authReady) {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-[12px] text-amber-700">
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
      <p className={cn("text-[12px] text-[#6b7684]", className)}>프로필 확인 중…</p>
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-[12px] text-amber-700">{error}</p>
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
      <div className="flex items-center gap-3 rounded-2xl border border-[#0220470f] bg-white px-3 py-3 shadow-sm">
        <PeerProfileAvatar
          displayName={preview.displayName}
          avatarUrl={preview.avatarUrl}
          size="md"
          className="ring-2 ring-[#3182f6]/20"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#191f28]">
            {preview.displayName}
          </p>
          {preview.rimvioId ? (
            <p className="truncate text-[12px] font-medium text-[#1b64da]">
              @{preview.rimvioId}
            </p>
          ) : null}
          <p className="mt-0.5 text-[10px] text-[#6b7684]">
            {MATCHED_LABEL[preview.matchedBy] ?? preview.matchedBy}로 찾음
          </p>
        </div>
      </div>
      {helperText ? (
        <p className="text-[11px] text-[#6b7684]">{helperText}</p>
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
