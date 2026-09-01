/**
 * Main Agent ↔ invokePublishedCapability bridge (client + server).
 */

import type { CapabilityIntentResolution } from "@/lib/rimvio-index/types";
import { getCatalogCapability } from "../capability-catalog";
import type { InvokeCapabilityInput, InvokeCapabilityResult } from "../types";

export type ProductInvokeBridgeResult = {
  readonly invoked: boolean;
  readonly ok: boolean;
  readonly capabilityId: string | null;
  readonly result: InvokeCapabilityResult | null;
  readonly workLogKo: string;
};

export function shouldInvokePublishedCapabilityForProduct(
  resolution: CapabilityIntentResolution | null | undefined,
): string | null {
  if (!resolution) return null;
  if (resolution.reuse.decision !== "reuse") return null;
  const capabilityId = resolution.discoveryPlanCapabilityId?.trim();
  if (!capabilityId) return null;
  const def = getCatalogCapability(capabilityId);
  if (!def?.runnable) return null;
  return capabilityId;
}

export function buildProductInvokeInput(input: {
  readonly capabilityId: string;
  readonly utterance: string;
  readonly contextEventId: string;
}): InvokeCapabilityInput {
  const cap = input.capabilityId;
  const base: InvokeCapabilityInput = {
    capabilityId: cap,
    input: { workspaceId: input.contextEventId, utterance: input.utterance },
    userRequest: input.utterance,
    contextEventId: input.contextEventId,
    syncGoal: true,
  };

  if (cap === "hotel.search") {
    return {
      ...base,
      input: {
        location: input.utterance.includes("오사카") ? "오사카, 일본" : "난바, 오사카",
        checkIn: "2024-06-01",
        checkOut: "2024-06-03",
        guests: "2",
      },
    };
  }
  if (cap === "product.search") {
    return { ...base, input: { query: "MacBook", limit: 5 } };
  }
  if (cap === "hotel.detail") {
    return { ...base, input: { hotelId: "grand-osaka" } };
  }
  if (cap.startsWith("eatery.")) {
    return { ...base, input: { workspaceId: input.contextEventId, utterance: input.utterance, domain: "eatery" } };
  }
  return base;
}

export async function invokePublishedCapabilityForProductTurn(input: {
  readonly capabilityId: string;
  readonly utterance: string;
  readonly contextEventId: string;
}): Promise<ProductInvokeBridgeResult> {
  const invokeInput = buildProductInvokeInput(input);

  if (typeof window === "undefined") {
    const { ensureRegistryReady } = await import("./publish");
    const { invokePublishedCapability } = await import("./invoke");
    await ensureRegistryReady();
    const result = await invokePublishedCapability(invokeInput);
    return {
      invoked: true,
      ok: result.ok,
      capabilityId: input.capabilityId,
      result,
      workLogKo: result.workLogKo,
    };
  }

  try {
    const res = await fetch("/api/agent-platform/invoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        capabilityId: invokeInput.capabilityId,
        input: invokeInput.input,
        userRequest: invokeInput.userRequest,
        contextEventId: invokeInput.contextEventId,
      }),
    });
    const result = (await res.json()) as InvokeCapabilityResult;
    return {
      invoked: true,
      ok: result.ok ?? false,
      capabilityId: input.capabilityId,
      result,
      workLogKo: result.workLogKo ?? `${input.capabilityId} invoke`,
    };
  } catch {
    return {
      invoked: true,
      ok: false,
      capabilityId: input.capabilityId,
      result: null,
      workLogKo: "Capability invoke API unavailable",
    };
  }
}
