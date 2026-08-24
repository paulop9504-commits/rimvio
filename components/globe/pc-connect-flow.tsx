"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import { adoptLoggedInPc } from "@/lib/pc-local-agent/adopt-logged-in-pc";
import {
  isDesktopConnectNonce,
  localAgentAnnounceUrl,
  localAgentHealthUrl,
} from "@/lib/pc-local-agent/desktop-connect";
import {
  derivePcOnboardingPhase,
  onboardingChecklist,
  type LocalAgentHealth,
  type PcOnboardingPhase,
} from "@/lib/pc-local-agent/onboarding-phase";
import { cn } from "@/lib/utils";
import { PcProgramInstallList } from "@/components/globe/pc-program-install-list";

export function PcConnectFlow({
  nonce,
  installQuery,
  onDone,
  onCancel,
}: {
  nonce: string | null;
  installQuery?: string | null;
  onDone: (deviceId: string | null) => void;
  onCancel: () => void;
}) {
  const copy = useCopy();
  const pc = copy.globe.pcContinuity;
  const { user } = useAuth();

  const desktopNonce = isDesktopConnectNonce(nonce) ? nonce!.trim() : null;
  const [introDone, setIntroDone] = useState(
    Boolean(desktopNonce || installQuery),
  );
  const [setupDownloaded, setSetupDownloaded] = useState(Boolean(desktopNonce));
  const [health, setHealth] = useState<LocalAgentHealth | null>(null);
  const [pairingRequested, setPairingRequested] = useState(Boolean(desktopNonce));
  const [showPerms, setShowPerms] = useState(false);
  const [flowStartedAt] = useState(() => Date.now());
  const [deviceName, setDeviceName] = useState(pc.pcFallback);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [connectedThisSession, setConnectedThisSession] = useState(false);
  const [newCloudDeviceAfterStart, setNewCloudDeviceAfterStart] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoJoinLock = useRef(false);

  const localUnpaired = Boolean(health?.ok && !health.paired);

  const phase: PcOnboardingPhase = useMemo(
    () =>
      introDone
        ? derivePcOnboardingPhase({
            setupDownloaded,
            health,
            pairingRequested,
            pairingBusy: busy,
            connectedThisSession,
            newCloudDeviceAfterStart,
            localUnpaired,
          })
        : "INSTALL",
    [
      introDone,
      setupDownloaded,
      health,
      pairingRequested,
      busy,
      connectedThisSession,
      newCloudDeviceAfterStart,
      localUnpaired,
    ],
  );

  const items = onboardingChecklist(phase);
  const labels: Record<(typeof items)[number]["id"], string> = {
    prepare: pc.checklistPrepare,
    install: pc.checklistInstall,
    find: pc.checklistFind,
    account: pc.checklistAccount,
    done: pc.checklistDone,
  };

  const tick = useCallback(async () => {
    let nextHealth: LocalAgentHealth | null = null;
    try {
      const res = await fetch(localAgentHealthUrl(), { mode: "cors" });
      if (res.ok) {
        const data = (await res.json()) as LocalAgentHealth;
        nextHealth = { ...data, ok: true };
        setHealth(nextHealth);
        void fetch(localAgentAnnounceUrl(), { method: "POST", mode: "cors" }).catch(
          () => undefined,
        );
      } else {
        setHealth(null);
      }
    } catch {
      setHealth(null);
    }

    const dRes = await fetch("/api/pc-agent/devices", { cache: "no-store" });
    if (!dRes.ok) {
      return;
    }
    const payload = (await dRes.json()) as {
      devices?: { id: string; name: string; status: string; created_at?: string }[];
    };
    const unpairedLocal = Boolean(nextHealth?.ok && !nextHealth.paired);
    const fresh = (payload.devices ?? []).find((row) => {
      if (row.status !== "ONLINE" || !row.created_at) {
        return false;
      }
      return Date.parse(row.created_at) >= flowStartedAt - 5_000;
    });
    if (fresh && !unpairedLocal) {
      setNewCloudDeviceAfterStart(true);
      setDeviceId(fresh.id);
      setDeviceName(fresh.name || pc.pcFallback);
    }
  }, [flowStartedAt, pc.pcFallback]);

  useEffect(() => {
    if (!introDone || connectedThisSession) {
      return;
    }
    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => window.clearInterval(id);
  }, [introDone, connectedThisSession, tick]);

  useEffect(() => {
    if (phase === "CONNECTED" && !connectedThisSession) {
      setConnectedThisSession(true);
    }
  }, [phase, connectedThisSession]);

  useEffect(() => {
    if (user && !installQuery) {
      setIntroDone(true);
    }
  }, [user, installQuery]);

  const consent = useCallback(async () => {
    setBusy(true);
    setError(null);
    setPairingRequested(true);
    try {
      const result = await adoptLoggedInPc({
        nonce: desktopNonce,
        deviceName: pc.pcFallback,
      });
      if (!result.ok) {
        throw new Error(result.reason);
      }
      setDeviceId(result.deviceId);
      setDeviceName(result.deviceName || pc.pcFallback);
      if (result.didPair) {
        setConnectedThisSession(true);
      }
    } catch {
      setError(pc.connectFailed);
      setPairingRequested(false);
    } finally {
      setBusy(false);
    }
  }, [desktopNonce, pc.connectFailed, pc.pcFallback]);

  useEffect(() => {
    if (!user || autoJoinLock.current || connectedThisSession) {
      return;
    }
    if (!desktopNonce && !localUnpaired) {
      return;
    }
    autoJoinLock.current = true;
    void consent();
  }, [user, desktopNonce, localUnpaired, connectedThisSession, consent]);

  const primary = (label: string, onClick: () => void) => (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="w-full rounded-full bg-white px-3 py-2.5 text-[14px] font-semibold text-black disabled:opacity-50"
    >
      {label}
    </button>
  );

  return (
    <div
      className="space-y-3 px-2"
      data-pc-connect-flow
      data-pc-connect-phase={phase}
    >
      <button type="button" onClick={onCancel} className="text-[12px] text-white/50">
        {copy.globe.containerSpaceRuntimeBack}
      </button>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4">
        {!introDone ? (
          <>
            <p className="text-[15px] font-semibold text-white">💻 {pc.flowTitle}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-white/65">{pc.flowBody}</p>
            <div className="mt-4">{primary(pc.continue, () => setIntroDone(true))}</div>
          </>
        ) : (
          <>
            <p className="text-[15px] font-semibold text-white">💻 {pc.flowTitle}</p>
            <ol className="mt-3 space-y-1.5" data-pc-connect-checklist>
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className={cn(
                    "text-[13px]",
                    item.done
                      ? "text-emerald-300"
                      : item.current
                        ? "text-white"
                        : "text-white/40",
                  )}
                >
                  {index + 1}. {labels[item.id]}{" "}
                  {item.done ? "✓" : item.current ? "●" : "○"}
                </li>
              ))}
            </ol>

            {phase === "INSTALL" ? (
              <div className="mt-4">
                {user ? (
                  <p className="mb-3 text-[13px] leading-relaxed text-white/65">
                    {pc.sameAccountHint}
                  </p>
                ) : null}
                <PcProgramInstallList
                  query={installQuery?.trim() || "Rimvio PC 설치"}
                  onStarted={(id) => {
                    if (id === "rimvio-pc") {
                      setSetupDownloaded(true);
                    }
                  }}
                />
              </div>
            ) : null}

            {phase === "AGENT_STARTING" || phase === "AGENT_ONLINE" ? (
              <p className="mt-4 text-[13px] leading-relaxed text-white/65">
                {user ? pc.joiningHint : pc.findingTitle}
              </p>
            ) : null}

            {phase === "PAIRING" ? (
              <p className="mt-4 text-[13px] leading-relaxed text-white/65">
                {pc.joiningHint}
              </p>
            ) : null}

            {phase === "PAIRING_REQUIRED" && !user ? (
              <>
                <p className="mt-4 text-[14px] font-medium text-white">
                  {pc.askTitle}
                </p>
                {health?.displayCode ? (
                  <p className="mt-2 font-mono text-[18px] tracking-wide text-white">
                    {health.displayCode}
                  </p>
                ) : null}
                <p className="mt-1 text-[12px] text-white/45">{pc.displayCodeHint}</p>
                <div className="mt-3">{primary(pc.askCta, () => setShowPerms(true))}</div>
              </>
            ) : null}

            {showPerms && !user && phase !== "CONNECTED" ? (
              <>
                <p className="mt-4 text-[15px] font-semibold text-white">{pc.permTitle}</p>
                <ul className="mt-3 space-y-1 text-[13px] text-white/80">
                  <li>✓ {pc.permBrowser}</li>
                  <li>✓ {pc.permWeb}</li>
                  <li>✓ {pc.permApps}</li>
                  <li>✓ {pc.permStatus}</li>
                  <li>✓ {pc.permScreen}</li>
                </ul>
                <p className="mt-3 text-[12px] leading-relaxed text-white/50">
                  {pc.permSensitive}
                </p>
                {error ? <p className="mt-2 text-[12px] text-rose-300">{error}</p> : null}
                <div className="mt-4">{primary(pc.consentCta, () => void consent())}</div>
              </>
            ) : null}

            {user && error ? (
              <div className="mt-3">
                <p className="text-[12px] text-rose-300">{error}</p>
                <div className="mt-3">
                  {primary(pc.connectCta, () => {
                    autoJoinLock.current = false;
                    void consent();
                  })}
                </div>
              </div>
            ) : null}

            {phase === "CONNECTED" ? (
              <>
                <p className="mt-4 text-[15px] font-semibold text-white">{pc.doneTitle}</p>
                <p className="mt-3 text-[14px] text-white">💻 {deviceName}</p>
                <p className="text-[12px] text-emerald-300">● {pc.online}</p>
                <div className="mt-4">{primary(pc.doneCta, () => onDone(deviceId))}</div>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
