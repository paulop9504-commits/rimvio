import {
  isDesktopConnectNonce,
  localAgentCallbackUrl,
  localAgentHealthUrl,
  localAgentWebPairUrl,
} from "@/lib/pc-local-agent/desktop-connect";
import { DEFAULT_PC_AGENT_PERMISSIONS } from "@/lib/pc-local-agent/pc-permissions";
import type { LocalAgentHealth } from "@/lib/pc-local-agent/onboarding-phase";

export type AdoptLoggedInPcResult =
  | { ok: true; didPair: boolean; deviceId: string | null; deviceName: string }
  | { ok: false; reason: "no_local" | "failed" };

let inflight: Promise<AdoptLoggedInPcResult> | null = null;

async function readLocalHealth(): Promise<LocalAgentHealth | null> {
  try {
    const res = await fetch(localAgentHealthUrl(), { mode: "cors" });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as LocalAgentHealth;
    return { ...data, ok: true };
  } catch {
    return null;
  }
}

async function adoptOnce(input: {
  nonce: string | null;
  deviceName: string;
}): Promise<AdoptLoggedInPcResult> {
  const fallbackName = input.deviceName.trim() || "내 PC";
  const nonce = isDesktopConnectNonce(input.nonce) ? input.nonce!.trim() : null;

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
      return { ok: false, reason: "failed" };
    }
    const data = (await res.json()) as {
      deviceId?: string;
      deviceName?: string;
      exchange?: string;
    };
    if (data.exchange) {
      void fetch(localAgentCallbackUrl({ nonce, exchange: data.exchange }), {
        mode: "no-cors",
      }).catch(() => undefined);
    }
    return {
      ok: true,
      didPair: true,
      deviceId: data.deviceId ?? null,
      deviceName: data.deviceName || fallbackName,
    };
  }

  const health = await readLocalHealth();
  if (!health?.ok) {
    return { ok: false, reason: "no_local" };
  }
  if (health.paired) {
    return { ok: true, didPair: false, deviceId: null, deviceName: fallbackName };
  }

  const pairRes = await fetch("/api/pc-agent/pairing", { method: "POST" });
  if (!pairRes.ok) {
    return { ok: false, reason: "failed" };
  }
  const pairing = (await pairRes.json()) as { code?: string };
  if (!pairing.code) {
    return { ok: false, reason: "failed" };
  }
  const local = await fetch(localAgentWebPairUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code: pairing.code,
      deviceName: fallbackName,
      consent: true,
    }),
  });
  if (!local.ok) {
    return { ok: false, reason: "failed" };
  }
  const paired = (await local.json()) as { deviceName?: string };
  return {
    ok: true,
    didPair: true,
    deviceId: null,
    deviceName: paired.deviceName || fallbackName,
  };
}

/** Same Rimvio session on this machine + unpaired local agent → join. Phone has no localhost. */
export function adoptLoggedInPc(input: {
  nonce: string | null;
  deviceName: string;
}): Promise<AdoptLoggedInPcResult> {
  if (inflight) {
    return inflight;
  }
  inflight = adoptOnce(input).finally(() => {
    inflight = null;
  });
  return inflight;
}
