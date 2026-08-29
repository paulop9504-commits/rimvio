"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useAuth } from "@/hooks/use-auth";
import { providerLabel } from "@/lib/hub/dev/hub-oauth-connect";
import type { HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";
import { cn } from "@/lib/utils";

type HubDevOAuthConnectSheetProps = {
  readonly provider: HubPlatformProviderId;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConnected: (provider: HubPlatformProviderId) => void;
  readonly returnPath?: string;
};

/** Live connect gate — Google login required before provider OAuth. */
export function HubDevOAuthConnectSheet({
  provider,
  open,
  onClose,
  returnPath = "/hub/workspace",
}: HubDevOAuthConnectSheetProps) {
  const { signInWithGoogle, configured } = useAuth();
  const [loading, setLoading] = useState(false);
  if (!open) return null;

  const label = providerLabel(provider);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle(returnPath);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[#111827]">Connect {label}</p>
            <p className="mt-0.5 text-[11px] text-[#6b7280]">
              Rimvio 계정으로 로그인한 뒤 {label} OAuth를 진행합니다.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#9ca3af] hover:bg-[#f3f4f6]">
            <X className="size-4" />
          </button>
        </div>

        <p className="mb-4 text-[10px] leading-relaxed text-[#9ca3af]">
          데모 연결이 아닌 실제 계정 연결입니다. Google로 로그인하면 연결 상태가 서버에 저장되고 Agent가 사용합니다.
        </p>

        {configured ? (
          <GoogleSignInButton
            className="w-full"
            size="md"
            label="Google로 계속"
            busy={loading}
            onClick={() => void handleGoogleLogin()}
          />
        ) : (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            Supabase가 설정되지 않았습니다. `.env`에 `NEXT_PUBLIC_SUPABASE_URL`을 추가하세요.
          </p>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          className={cn(
            "mt-3 w-full rounded-xl border border-[#e5e7eb] px-4 py-2 text-[11px] font-medium text-[#6b7280] hover:bg-[#fafafa]",
          )}
        >
          취소
        </button>
      </div>
    </div>
  );
}
