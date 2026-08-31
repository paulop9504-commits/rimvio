/**
 * Dev Platform registry — My Platforms SSOT (client MVP).
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import { HUB_PLATFORM_DRAFT_STORAGE_KEY } from "@/lib/hub/platform/defaults";

export const HUB_PLATFORM_REGISTRY_STORAGE_KEY = "rimvio.hub.platform-registry.v1";
export const HUB_ACTIVE_PLATFORM_STORAGE_KEY = "rimvio.hub.active-platform-id.v1";

export type PlatformAgentStatus = "draft" | "agent_ready" | "published";

export type PlatformRegistryMeta = {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly tagline: string;
  readonly icon: string;
  readonly status: PlatformAgentStatus;
  readonly capabilityCount: number;
  readonly approvalRequiredCount: number;
  readonly agentUsage: number;
  readonly successRate: number;
  readonly ingressLabel: string;
  readonly rimvioCertified: boolean;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
};

export type StoredPlatform = {
  readonly meta: PlatformRegistryMeta;
  readonly draft: PlatformDraft;
};

const REGISTRY_EVENT = "rimvio:hub-platform-registry";

function emitRegistryChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(REGISTRY_EVENT));
  }
}

function categoryIcon(category: string): string {
  if (category === "travel") return "🏨";
  if (category === "e-commerce") return "📱";
  if (category === "finance") return "💳";
  return "⚡";
}

export function metaFromDraft(
  draft: PlatformDraft,
  ingressLabel: string,
  opts?: Partial<PlatformRegistryMeta>,
): PlatformRegistryMeta {
  const now = new Date().toISOString();
  const approvalRequiredCount = draft.actions.filter((a) => a.approvalRequired).length;
  return {
    id: draft.id,
    name: draft.name,
    category: draft.category,
    tagline: draft.description,
    icon: categoryIcon(draft.category),
    status: opts?.status ?? (draft.actions.length > 0 ? "agent_ready" : "draft"),
    capabilityCount: draft.actions.length,
    approvalRequiredCount,
    agentUsage: opts?.agentUsage ?? 0,
    successRate: opts?.successRate ?? 0,
    ingressLabel,
    rimvioCertified: opts?.rimvioCertified ?? false,
    createdAtIso: opts?.createdAtIso ?? now,
    updatedAtIso: now,
  };
}

export function readPlatformRegistry(): readonly StoredPlatform[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HUB_PLATFORM_REGISTRY_STORAGE_KEY);
    if (!raw) return migrateLegacyDraft();
    return JSON.parse(raw) as StoredPlatform[];
  } catch {
    return [];
  }
}

function migrateLegacyDraft(): StoredPlatform[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HUB_PLATFORM_DRAFT_STORAGE_KEY);
    if (!raw) return seedDemoPlatforms();
    const draft = JSON.parse(raw) as PlatformDraft;
    if (!draft.actions.length || draft.id === "used.market") {
      return seedDemoPlatforms();
    }
    const stored: StoredPlatform = {
      meta: metaFromDraft(draft, "Legacy draft"),
      draft,
    };
    persistPlatformRegistry([stored]);
    return [stored];
  } catch {
    return seedDemoPlatforms();
  }
}

function seedDemoPlatforms(): StoredPlatform[] {
  return [];
}

export function persistPlatformRegistry(platforms: readonly StoredPlatform[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HUB_PLATFORM_REGISTRY_STORAGE_KEY, JSON.stringify(platforms));
  } catch {
    // ignore quota
  }
  emitRegistryChange();
}

export function upsertPlatform(stored: StoredPlatform): void {
  const list = [...readPlatformRegistry()];
  const idx = list.findIndex((p) => p.meta.id === stored.meta.id);
  const next =
    idx >= 0
      ? list.map((p, i) => (i === idx ? stored : p))
      : [...list, stored];
  persistPlatformRegistry(next);
}

export function readStoredPlatform(platformId: string): StoredPlatform | null {
  return readPlatformRegistry().find((p) => p.meta.id === platformId) ?? null;
}

export function setActivePlatformId(platformId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HUB_ACTIVE_PLATFORM_STORAGE_KEY, platformId);
}

export function readActivePlatformId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(HUB_ACTIVE_PLATFORM_STORAGE_KEY);
}

export function subscribePlatformRegistry(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(REGISTRY_EVENT, handler);
  return () => window.removeEventListener(REGISTRY_EVENT, handler);
}

export function clearPlatformRegistryForTests(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HUB_PLATFORM_REGISTRY_STORAGE_KEY);
  localStorage.removeItem(HUB_ACTIVE_PLATFORM_STORAGE_KEY);
}
