"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, X } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useAuth } from "@/hooks/use-auth";
import {
  completeHubOAuthConnect,
} from "@/lib/hub/dev/hub-oauth-connect";
import type { HubConnectionProfile } from "@/lib/hub/dev/hub-connection-store";
import { syncHubConnectionsFromServer } from "@/lib/hub/dev/hub-connection-client-sync";
import { cn } from "@/lib/utils";

type HubDevGitHubConnectSheetProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConnected?: (profile: Partial<HubConnectionProfile>) => void;
  readonly returnPath?: string;
};

type DeviceSession = {
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

type SheetPhase =
  | "checking"
  | "login"
  | "starting"
  | "device"
  | "connected"
  | "oauth_not_configured"
  | "error";

function formatUserCode(code: string): string {
  const normalized = code.replace(/-/g, "").toUpperCase();
  if (normalized.length <= 4) return normalized;
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}

/** Cursor-style GitHub connect — device code at github.com/login/device. */
export function HubDevGitHubConnectSheet({
  open,
  onClose,
  onConnected,
  returnPath = "/hub/workspace?connect=github",
}: HubDevGitHubConnectSheetProps) {
  const { signInWithGoogle, configured } = useAuth();
  const [phase, setPhase] = useState<SheetPhase>("checking");
  const [device, setDevice] = useState<DeviceSession | null>(null);
  const [accountLabel, setAccountLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollActiveRef = useRef(false);

  const clearPollTimer = useCallback(() => {
    pollActiveRef.current = false;
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const finishConnected = useCallback(
    async (label: string, avatarUrl?: string | null) => {
      clearPollTimer();
      setAccountLabel(label);
      setPhase("connected");

      const profile: Partial<HubConnectionProfile> = {
        provider: "github",
        accountLabel: label,
        connectedAtIso: new Date().toISOString(),
        avatarUrl: avatarUrl ?? undefined,
      };
      completeHubOAuthConnect("github", profile);
      await syncHubConnectionsFromServer();
      onConnected?.(profile);
    },
    [clearPollTimer, onConnected],
  );

  const pollDevice = useCallback(
    async (intervalSec: number) => {
      if (!pollActiveRef.current) return;

      try {
        const res = await fetch("/api/hub/dev/connect/github/device/poll", {
          method: "POST",
          credentials: "include",
        });
        const json = (await res.json()) as {
          status?: string;
          interval?: number;
          accountLabel?: string;
          avatarUrl?: string | null;
          error?: string;
        };

        if (json.status === "connected" && json.accountLabel) {
          await finishConnected(json.accountLabel, json.avatarUrl);
          return;
        }
        if (json.status === "expired") {
          clearPollTimer();
          setPhase("error");
          setErrorMessage("인증 코드가 만료됐어요. 다시 시도해 주세요.");
          return;
        }
        if (json.status === "denied") {
          clearPollTimer();
          setPhase("error");
          setErrorMessage("GitHub에서 연결을 취소했어요.");
          return;
        }

        const nextInterval = Math.max(5, json.interval ?? intervalSec);
        pollTimerRef.current = setTimeout(() => {
          void pollDevice(nextInterval);
        }, nextInterval * 1000);
      } catch {
        pollTimerRef.current = setTimeout(() => {
          void pollDevice(intervalSec);
        }, intervalSec * 1000);
      }
    },
    [clearPollTimer, finishConnected],
  );

  const startDeviceFlow = useCallback(async () => {
    setPhase("starting");
    setErrorMessage(null);
    clearPollTimer();

    const res = await fetch("/api/hub/dev/connect/github/device/start", {
      method: "POST",
      credentials: "include",
    });
    const json = (await res.json()) as DeviceSession & { error?: string };

    if (res.status === 401 || json.error === "login_required") {
      setPhase("login");
      return;
    }
    if (res.status === 503 || json.error === "oauth_not_configured") {
      setPhase("oauth_not_configured");
      return;
    }
    if (!res.ok) {
      setPhase("error");
      setErrorMessage(json.error ?? "GitHub 연결을 시작하지 못했어요.");
      return;
    }

    setDevice(json);
    setPhase("device");
    pollActiveRef.current = true;
    pollTimerRef.current = setTimeout(() => {
      void pollDevice(json.interval);
    }, json.interval * 1000);
  }, [clearPollTimer, pollDevice]);

  useEffect(() => {
    if (!open) {
      clearPollTimer();
      return;
    }

    setPhase("checking");
    setDevice(null);
    setAccountLabel(null);
    setErrorMessage(null);
    setCopied(false);

    void (async () => {
      const statusRes = await fetch("/api/auth/status", { credentials: "include" });
      const status = (await statusRes.json()) as { signedIn?: boolean };
      if (!status.signedIn) {
        setPhase("login");
        return;
      }
      await startDeviceFlow();
    })();

    return () => clearPollTimer();
  }, [open, clearPollTimer, startDeviceFlow]);

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    try {
      await signInWithGoogle(returnPath);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!device?.user_code) return;
    try {
      await navigator.clipboard.writeText(device.user_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleOpenGitHub = () => {
    const url = device?.verification_uri ?? "https://github.com/login/device";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleRetry = () => {
    void startDeviceFlow();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hub-github-connect-title"
        className="w-full max-w-md rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p id="hub-github-connect-title" className="text-[13px] font-semibold text-[#111827]">
              GitHub 연결
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[#6b7280]">
              Cursor처럼 GitHub에서 코드를 입력하면 Rimvio Hub에 연결돼요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-[#9ca3af] hover:bg-[#f3f4f6]"
            aria-label="닫기"
          >
            <X className="size-4" />
          </button>
        </div>

        {phase === "checking" || phase === "starting" ? (
          <div className="flex items-center gap-2 rounded-xl bg-[#fafafa] px-4 py-6 text-[11px] text-[#6b7280]">
            <Loader2 className="size-4 animate-spin text-violet-600" />
            GitHub 연결 준비 중…
          </div>
        ) : null}

        {phase === "login" ? (
          <div className="space-y-3">
            <p className="text-[11px] leading-relaxed text-[#6b7280]">
              먼저 Rimvio 계정으로 로그인해 주세요. 로그인 후 GitHub 인증 코드 화면으로 이어집니다.
            </p>
            {configured ? (
              <GoogleSignInButton
                className="w-full"
                size="md"
                label="Google로 계속"
                busy={loginLoading}
                onClick={() => void handleGoogleLogin()}
              />
            ) : (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                Supabase가 설정되지 않았습니다. `.env`에 `NEXT_PUBLIC_SUPABASE_URL`을 추가하세요.
              </p>
            )}
          </div>
        ) : null}

        {phase === "device" && device ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-4 py-5 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#9ca3af]">
                GitHub 인증 코드
              </p>
              <p className="mt-2 font-mono text-[28px] font-bold tracking-[0.2em] text-[#111827]">
                {formatUserCode(device.user_code)}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyCode()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#374151] hover:bg-[#f9fafb]"
                >
                  {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  {copied ? "복사됨" : "코드 복사"}
                </button>
                <button
                  type="button"
                  onClick={handleOpenGitHub}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#24292f] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[#1b1f23]"
                >
                  <ExternalLink className="size-3" />
                  GitHub에서 입력
                </button>
              </div>
            </div>

            <ol className="space-y-1.5 text-[10px] leading-relaxed text-[#6b7280]">
              <li>1. 위 버튼으로 github.com/login/device 를 엽니다.</li>
              <li>2. 인증 코드를 입력하고 GitHub 계정으로 승인합니다.</li>
              <li>3. GitHub가 이메일로 확인을 보낼 수 있어요 — 승인만 해 주세요.</li>
            </ol>

            <p className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-[10px] font-medium text-violet-800">
              <Loader2 className="size-3.5 shrink-0 animate-spin" />
              GitHub 승인을 기다리는 중…
            </p>
          </div>
        ) : null}

        {phase === "connected" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-4">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-emerald-800">
              <Check className="size-4" />
              {accountLabel ?? "GitHub"} 연결 완료
            </p>
            <p className="mt-1 text-[10px] text-emerald-700">
              Agent가 repository 연동을 이어갈 수 있어요.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2 text-[11px] font-semibold text-white hover:bg-emerald-700"
            >
              계속
            </button>
          </div>
        ) : null}

        {phase === "oauth_not_configured" ? (
          <div className="space-y-3 rounded-xl bg-amber-50 px-3 py-3 text-[11px] text-amber-900">
            <p className="font-semibold">GitHub OAuth가 아직 설정되지 않았어요.</p>
            <p className="leading-relaxed">
              Vercel 환경 변수에 아래를 추가하고 GitHub OAuth App callback URL을 등록해 주세요.
            </p>
            <ul className="space-y-1 font-mono text-[10px]">
              <li>NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID</li>
              <li>GITHUB_OAUTH_CLIENT_SECRET</li>
            </ul>
            <p className="text-[10px] leading-relaxed">
              Callback:{" "}
              <span className="font-mono">
                {typeof window !== "undefined" ? window.location.origin : "https://rimvio.com"}
                /api/hub/dev/github-connect/callback
              </span>
            </p>
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="space-y-3">
            <p className="rounded-xl bg-red-50 px-3 py-2 text-[11px] text-red-800">
              {errorMessage ?? "연결하지 못했어요."}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="w-full rounded-xl bg-violet-600 px-4 py-2 text-[11px] font-semibold text-white hover:bg-violet-700"
            >
              다시 시도
            </button>
          </div>
        ) : null}

        {phase !== "connected" ? (
          <button
            type="button"
            disabled={loginLoading || phase === "starting"}
            onClick={onClose}
            className={cn(
              "mt-3 w-full rounded-xl border border-[#e5e7eb] px-4 py-2 text-[11px] font-medium text-[#6b7280] hover:bg-[#fafafa]",
              (loginLoading || phase === "starting") && "opacity-60",
            )}
          >
            취소
          </button>
        ) : null}
      </div>
    </div>
  );
}
