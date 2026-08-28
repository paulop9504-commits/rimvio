/**
 * RIR → rimvio.platform.manifest.v1 compiler.
 */

import { RIMVIO_PLATFORM_MANIFEST_VERSION } from "@/lib/platform-sdk/types";
import type { RimvioPlatformManifest } from "@/lib/platform-sdk/types";
import type { PlatformRir } from "@/lib/platform-builder/rir";
import { createDefaultMarketsDeclaration } from "@/lib/platform-sdk/markets";

function slugToPlatformId(slug: string): string {
  const safe = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `platform.${safe || "untitled"}`;
}

function domainFromSlug(slug: string): string {
  return slug.replace(/-/g, "_");
}

export function compilePlatformRirToManifest(rir: PlatformRir): RimvioPlatformManifest {
  const platformId = slugToPlatformId(rir.product.slug);
  const domain = domainFromSlug(rir.product.slug);

  const collections = rir.objects.map((obj) => ({
    name: obj.collection,
    schema: `${obj.id}.v1`,
    indexes: obj.fields.includes("sellerId") ? (["sellerId"] as const) : undefined,
  }));

  const capabilities = rir.actions.map((action) => ({
    id: action.capabilityId,
    name: action.label,
    description: action.label,
    inputSchema: `${action.capabilityId.replace(/\./g, "_")}.input.v1`,
    outputSchema: `${action.capabilityId.replace(/\./g, "_")}.output.v1`,
    approvalRequired: action.approvalRequired ?? false,
    markets: action.markets?.length ? [...action.markets] : undefined,
  }));

  const routes = rir.pages.map((page) => ({
    path: page.path,
    surface: "page" as const,
    component: page.component,
  }));

  const emits = rir.features.includes("reviews")
    ? (["review.created", "listing.created"] as const)
    : (["listing.created"] as const);

  return {
    specVersion: RIMVIO_PLATFORM_MANIFEST_VERSION,
    package: {
      id: platformId,
      name: rir.product.name,
      version: "0.1.0",
      description: rir.product.summary,
      category: rir.product.category,
      tags: [...rir.features.slice(0, 5)],
      pricing: "free",
      icon: null,
    },
    operator: rir.operator,
    markets: rir.markets,
    runtime: {
      tier: "native",
      type: "cloud-agent",
      entry: "platform/index.ts",
      hostVersion: ">=1.0.0",
    },
    permissions: {
      required: [...rir.permissions.required],
      optional: [...rir.permissions.optional],
      denied: [...rir.permissions.denied],
    },
    context: {
      read: rir.context.read.map((path) => ({ path, type: "string" })),
      write: [],
    },
    data: {
      collections,
      isolation: "tenant_strict",
    },
    capabilities,
    ui: { routes },
    composition: {
      imports: rir.features.includes("payments")
        ? [{ platformId: "platform.payments", capabilities: ["payment.charge"] }]
        : [],
    },
    events: {
      emits: [...emits],
      subscribes: rir.features.includes("payments") ? ["payment.succeeded"] : [],
    },
  };
}

export function summarizeBlueprintKo(rir: PlatformRir): string[] {
  const lines: string[] = [];
  lines.push(`✓ ${rir.roles.map((r) => r.label).join(" · ")} 역할`);
  for (const action of rir.actions) {
    lines.push(`✓ ${action.label}`);
  }
  for (const page of rir.pages) {
    if (page.id !== "home") continue;
  }
  lines.push(`✓ ${rir.pages.length}개 화면`);
  lines.push(`✓ ${rir.objects.length}개 데이터 객체`);
  return lines;
}
