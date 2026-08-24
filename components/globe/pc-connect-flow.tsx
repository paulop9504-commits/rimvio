"use client";

import { useCallback, useEffect, useState } from "react";
import { useCopy } from "@/hooks/use-copy";
import { DEFAULT_PC_AGENT_PERMISSIONS } from "@/lib/pc-local-agent/pc-permissions";
import {
  localAgentCallbackUrl,
  localAgentHealthUrl,
  localAgentWebPairUrl,
} from "@/lib/pc-local-agent/desktop-connect";
import { cn } from "@/lib/utils";

export type PcConnectStep =
  | "intro"
  | "prepare"
  | "finding"
  | "ask"
  | "perms"
  | "done";

export function PcConnectFlow({
  nonce,
  onDone,
  onCancel,
}: {
  nonce: string | null;
  onDone: (deviceId: string | null) => void;
  onCancel: () => void;
}) {
  const copy = useCopy();
  const pc = copy.globe.pcContinuity;
  const [step, setStep] = useState<PcConnectStep>(nonce ? "ask" : "intro");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [agentSeen, setAgentSeen] = useState(false);
  const [linkSeen, setLinkSeen] = useState(false);
  const [deviceName, setDeviceName] = useState(pc.pcFallback);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPairingCode = useCallback(async () => {
    const res = await fetch("/api/pc-agent/pairing", { method: "POST" });
    if (!res.ok) {
      return;
    }
    const data = (await res.json()) as { code?: string };
    if (data.code) {
      setPairingCode(data.code);
    }
  }, []);

  useEffect(() => {
    if (step === "prepare" || step === "finding") {
      void startPairingCode();
    }
  }, [step, startPairingCode]);

  useEffect(() => {
    if (step !== "finding" && step !== "ask" && step !== "perms") {
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const health = await fetch(localAgentHealthUrl(), { mode: "cors" });
        if (health.ok) {
          const data = (await health.json()) as { paired?: boolean };
          if (!cancelled) {
            setAgentSeen(true);
            if (data.paired) {
              setLinkSeen(true);
            }
          }
        }
      } catch {
        /* agent not on this machine */
      }
      const dRes = await fetch("/api/pc-agent/devices", { cache: "no-store" });
      if (!dRes.ok || cancelled) {
        return;
      }
      const payload = (await dRes.json()) as {
        devices?: { id: string; name: string; status: string }[];
      };
      const online = (payload.devices ?? []).find((row) => row.status === "ONLINE");
        if (online && !cancelled) {
          setLinkSeen(true);
          setDeviceId(online.id);
          setDeviceName(online.name || pc.pcFallback);
          if (step === "finding" && !nonce) {
            setStep("done");
          } else if (step === "finding") {
            setStep("ask");
          }
        }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [step, pc.pcFallback, nonce]);

  useEffect(() => {
    if (step !== "finding") {
      return;
    }
    if (agentSeen) {
      setStep("ask");
    }
  }, [agentSeen, step]);

  const consent = async () => {
    setBusy(true);
    setError(null);
    try {
      if (nonce) {
        const res = await fetch("/api/pc-agent/desktop/approve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            nonce,
            permissions: DEFAULT_PC_AGENT_PERMISSIONS,
          }),
        });
        if (!res.ok) {
          throw new Error("approve_failed");
        }
        const data = (await res.json()) as {
          deviceId?: string;
          deviceName?: string;
          exchange?: string;
        };
        setDeviceId(data.deviceId ?? null);
        setDeviceName(data.deviceName || pc.pcFallback);
        setLinkSeen(true);
        if (data.exchange && nonce) {
          void fetch(localAgentCallbackUrl({ nonce, exchange: data.exchange }), {
            mode: "no-cors",
          }).catch(() => undefined);
        }
        setStep("done");
        return;
      }

      if (pairingCode) {
        try {
          const pairRes = await fetch(localAgentWebPairUrl(), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code: pairingCode, deviceName: pc.pcFallback }),
          });
          if (pairRes.ok) {
            const paired = (await pairRes.json()) as { deviceName?: string };
            setLinkSeen(true);
            setDeviceName(paired.deviceName || pc.pcFallback);
            setStep("done");
            return;
          }
        } catch {
          /* phone: wait for the PC browser confirm */
        }
      }

      const dRes = await fetch("/api/pc-agent/devices", { cache: "no-store" });
      if (dRes.ok) {
        const payload = (await dRes.json()) as {
          devices?: { id: string; name: string; status: string }[];
        };
        const online = (payload.devices ?? []).find((row) => row.status === "ONLINE");
        if (online) {
          setDeviceId(online.id);
          setDeviceName(online.name || pc.pcFallback);
          setLinkSeen(true);
          setStep("done");
          return;
        }
      }
      setError(pc.connectFailed);
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    const res = await fetch("/api/pc-agent/desktop/download");
    const data = (await res.json()) as { available?: boolean; url?: string };
    if (data.available && data.url) {
      window.location.href = data.url;
    }
    setStep("finding");
  };

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
    <div className="space-y-3 px-2" data-pc-connect-flow data-pc-connect-step={step}>
      <button type="button" onClick={onCancel} className="text-[12px] text-white/50">
        {copy.globe.containerSpaceRuntimeBack}
      </button>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4">
        {step === "intro" ? (
          <>
            <p className="text-[15px] font-semibold text-white">💻 {pc.flowTitle}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-white/65">{pc.flowBody}</p>
            <div className="mt-4">{primary(pc.continue, () => setStep("prepare"))}</div>
          </>
        ) : null}
        {step === "prepare" ? (
          <>
            <p className="text-[15px] font-semibold text-white">{pc.prepareTitle}</p>
            <p className="mt-2 text-[13px] text-white/65">{pc.prepareBody}</p>
            <div className="mt-4">{primary(pc.download, () => void download())}</div>
          </>
        ) : null}
        {step === "finding" ? (
          <>
            <p className="text-[15px] font-semibold text-white">{pc.findingTitle}</p>
            <p className={cn("mt-3 text-[13px]", agentSeen ? "text-emerald-300" : "text-white/50")}>
              {agentSeen ? "●" : "○"} {pc.foundAgent}
            </p>
            <p className={cn("mt-1 text-[13px]", linkSeen ? "text-emerald-300" : "text-white/50")}>
              {linkSeen ? "●" : "○"} {pc.foundLink}
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-white/45">{pc.downloadUnavailable}</p>
          </>
        ) : null}
        {step === "ask" ? (
          <>
            <p className="text-[15px] font-semibold text-white">{pc.askTitle}</p>
            <div className="mt-4">{primary(pc.askCta, () => setStep("perms"))}</div>
          </>
        ) : null}
        {step === "perms" ? (
          <>
            <p className="text-[15px] font-semibold text-white">{pc.permTitle}</p>
            <ul className="mt-3 space-y-1 text-[13px] text-white/80">
              <li>✓ {pc.permBrowser}</li>
              <li>✓ {pc.permWeb}</li>
              <li>✓ {pc.permApps}</li>
              <li>✓ {pc.permStatus}</li>
              <li>✓ {pc.permScreen}</li>
            </ul>
            <p className="mt-3 text-[12px] leading-relaxed text-white/50">{pc.permSensitive}</p>
            {error ? <p className="mt-2 text-[12px] text-rose-300">{error}</p> : null}
            <div className="mt-4">{primary(pc.consentCta, () => void consent())}</div>
          </>
        ) : null}
        {step === "done" ? (
          <>
            <p className="text-[15px] font-semibold text-white">{pc.doneTitle}</p>
            <p className="mt-3 text-[14px] text-white">💻 {deviceName}</p>
            <p className="text-[12px] text-emerald-300">● {pc.online}</p>
            <p className="mt-3 text-[12px] text-white/50">{pc.pcNameLabel}</p>
            <p className="text-[13px] text-white/80">{deviceName}</p>
            <p className="mt-2 text-[13px] text-white/80">
              {pc.agentVersion} · {pc.connected}
            </p>
            <div className="mt-4">{primary(pc.doneCta, () => onDone(deviceId))}</div>
          </>
        ) : null}
      </div>
    </div>
  );
}
