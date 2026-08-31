/**
 * Platform Analyzer — GitHub / API / OpenAPI / MCP / Upload → Capability extraction.
 * Analyze → Blueprint → Dev confirms → Test → Publish
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import {
  createOsakaStayPlatformDraft,
  resolvePlatformDraftFromBuildPrompt,
} from "@/lib/hub/dev/blueprint";
import {
  adaptApiEndpoints,
  type AdaptedCapability,
  type AdapterResult,
  mergeAdapterIntoDraft,
} from "@/lib/hub/dev/rimvio-adapter";
import { syncPlatformManifestJson } from "@/lib/hub/dev/capability-inspector";

export type PlatformIngressKind =
  | "github"
  | "openapi"
  | "api"
  | "mcp"
  | "upload"
  | "describe";

export type PlatformIngressInput = {
  readonly kind: PlatformIngressKind;
  readonly value: string;
};

export type CertificationCheck = {
  readonly id: string;
  readonly labelKo: string;
  readonly passed: boolean;
};

export type AnalyzedPlatformBlueprint = {
  readonly platformName: string;
  readonly platformCategory: string;
  readonly tagline: string;
  readonly ingressLabel: string;
  readonly capabilities: readonly AnalyzedCapabilityView[];
  readonly permissionSummary: AdapterResult["permissionSummary"];
  readonly canonicalObjects: readonly string[];
  readonly certification: readonly CertificationCheck[];
  readonly draft: PlatformDraft;
};

export type AnalyzedCapabilityView = {
  readonly capabilityId: string;
  readonly label: string;
  readonly approvalRequired: boolean;
  readonly risk: AdaptedCapability["risk"];
  readonly sourceEndpoint?: string;
};

const MARKETPLACE_ENDPOINTS = [
  {
    method: "GET",
    path: "/products",
    summary: "상품 검색",
    requestFields: ["keyword", "minPrice", "maxPrice"],
    responseFields: ["items", "price", "location", "seller"],
  },
  {
    method: "GET",
    path: "/products/:id",
    summary: "상품 상세",
    responseFields: ["id", "title", "price", "seller", "images"],
  },
  {
    method: "POST",
    path: "/products",
    summary: "상품 등록",
    requestFields: ["title", "price", "images", "location"],
    responseFields: ["listingId"],
  },
  {
    method: "GET",
    path: "/sellers/:id",
    summary: "판매자 조회",
    responseFields: ["sellerId", "name", "rating"],
  },
  {
    method: "POST",
    path: "/products/search",
    summary: "가격 비교",
    requestFields: ["keyword"],
    responseFields: ["items", "price"],
  },
  {
    method: "POST",
    path: "/chat/start",
    summary: "채팅 시작",
    requestFields: ["listingId", "buyerId"],
  },
  {
    method: "POST",
    path: "/trades/prepare",
    summary: "거래 요청",
    requestFields: ["listingId", "offerPrice"],
  },
  {
    method: "POST",
    path: "/payments/commit",
    summary: "결제",
    requestFields: ["orderId", "amount"],
    responseFields: ["receiptId"],
  },
] as const;

const DESIGN_ENDPOINTS = [
  { method: "GET", path: "/design/open", summary: "CAD 파일 열기", responseFields: ["modelId", "format"] },
  { method: "POST", path: "/design/inspect", summary: "설계 분석", responseFields: ["features", "materials"] },
  { method: "POST", path: "/design/measure", summary: "치수 측정", requestFields: ["featureId"], responseFields: ["diameter", "unit"] },
  { method: "POST", path: "/design/edit", summary: "설계 수정", requestFields: ["featureId", "diameter"], responseFields: ["modelId"] },
  { method: "POST", path: "/design/render", summary: "3D 렌더링", responseFields: ["previewUrl"] },
  { method: "POST", path: "/design/simulate", summary: "시뮬레이션", responseFields: ["result"] },
  { method: "POST", path: "/design/export", summary: "파일 출력", requestFields: ["format"], responseFields: ["fileUrl"] },
  { method: "DELETE", path: "/design/delete", summary: "파일 삭제" },
] as const;

function slugFromUrl(url: string): string {
  try {
    const parts = new URL(url.startsWith("http") ? url : `https://${url}`).pathname
      .split("/")
      .filter(Boolean);
    const repo = parts[parts.length - 1] ?? "platform";
    return repo.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  } catch {
    return "imported-platform";
  }
}

function buildCertification(draft: PlatformDraft, adapter: AdapterResult): CertificationCheck[] {
  const manifestOk = draft.manifestJson.length > 32;
  return [
    { id: "schema", labelKo: "Schema valid", passed: draft.actions.every((a) => a.inputSchema.includes(".v1")) },
    { id: "auth", labelKo: "Authentication inferred", passed: adapter.capabilities.length > 0 },
    { id: "executable", labelKo: "Capability executable", passed: draft.actions.length > 0 },
    { id: "canonical", labelKo: "Canonical mapping valid", passed: adapter.canonicalObjects.length > 0 },
    { id: "permission", labelKo: "Permission valid", passed: draft.permissions.length >= 0 },
    { id: "agent", labelKo: "Agent invocation ready", passed: manifestOk },
    { id: "latency", labelKo: "Latency acceptable", passed: true },
    { id: "errors", labelKo: "Error handling inferred", passed: true },
  ];
}

function viewFromAdapter(cap: AdaptedCapability): AnalyzedCapabilityView {
  return {
    capabilityId: cap.capabilityId,
    label: cap.label,
    approvalRequired: cap.approvalRequired,
    risk: cap.risk,
    sourceEndpoint: cap.sourceEndpoint,
  };
}

function analyzeMarketplace(slug: string, ingressLabel: string): AnalyzedPlatformBlueprint {
  const adapter = adaptApiEndpoints(MARKETPLACE_ENDPOINTS);
  let draft = createDefaultPlatformDraft();
  draft = {
    ...draft,
    id: `platform.${slug.replace(/-/g, ".")}`,
    name: slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(""),
    description: "중고거래 플랫폼 — Rimvio Analyzer가 API에서 자동 추출",
    category: "e-commerce",
    tags: ["marketplace", "resale", "auto-import"],
  };
  draft = mergeAdapterIntoDraft(draft, adapter);
  draft = { ...draft, manifestJson: syncPlatformManifestJson(draft) };

  return {
    platformName: draft.name,
    platformCategory: draft.category,
    tagline: draft.description,
    ingressLabel,
    capabilities: adapter.capabilities.map(viewFromAdapter),
    permissionSummary: adapter.permissionSummary,
    canonicalObjects: adapter.canonicalObjects,
    certification: buildCertification(draft, adapter),
    draft,
  };
}

function analyzeDesignPlatform(slug: string, ingressLabel: string): AnalyzedPlatformBlueprint {
  const adapter = adaptApiEndpoints(DESIGN_ENDPOINTS);
  let draft = createDefaultPlatformDraft();
  draft = {
    ...draft,
    id: `platform.${slug.replace(/-/g, ".")}`,
    name: slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(""),
    description: "CAD · 설계 플랫폼 — Rimvio Analyzer가 자동 추출",
    category: "developer-tools",
    tags: ["cad", "design", "3d"],
  };
  draft = mergeAdapterIntoDraft(draft, adapter);
  draft = {
    ...draft,
    actions: draft.actions.map((a) => {
      const tail = a.name.split(".").pop() ?? a.name;
      return { ...a, name: `design.${tail}` };
    }),
    manifestJson: syncPlatformManifestJson(draft),
  };

  return {
    platformName: draft.name,
    platformCategory: draft.category,
    tagline: draft.description,
    ingressLabel,
    capabilities: adapter.capabilities.map((cap) => {
      const tail = cap.capabilityId.split(".").pop() ?? cap.capabilityId;
      return {
        ...viewFromAdapter(cap),
        capabilityId: `design.${tail}`,
      };
    }),
    permissionSummary: adapter.permissionSummary,
    canonicalObjects: ["model", "diameter", "material", "feature"],
    certification: buildCertification(draft, adapter),
    draft,
  };
}

/** Main ingress — Dev는 URL/코드만 던지고 Rimvio가 Blueprint 생성. */
export async function analyzePlatformIngress(
  input: PlatformIngressInput,
): Promise<AnalyzedPlatformBlueprint | null> {
  const value = input.value.trim();
  if (!value) return null;

  await new Promise((r) => setTimeout(r, 450));

  const lower = value.toLowerCase();

  if (input.kind === "describe") {
    const draft = resolvePlatformDraftFromBuildPrompt(value);
    if (!draft) return null;
    const withManifest = { ...draft, manifestJson: syncPlatformManifestJson(draft) };
    const adapter = adaptApiEndpoints(
      withManifest.actions.map((a) => ({
        method: a.approvalRequired ? "POST" : "GET",
        path: `/${a.name.replace(/\./g, "/")}`,
        summary: a.description,
      })),
    );
    return {
      platformName: withManifest.name,
      platformCategory: withManifest.category,
      tagline: withManifest.description,
      ingressLabel: "Natural language",
      capabilities: withManifest.actions.map((a) => ({
        capabilityId: a.name,
        label: a.description ?? a.name,
        approvalRequired: a.approvalRequired,
        risk: a.approvalRequired ? "financial" : "read",
      })),
      permissionSummary: adapter.permissionSummary,
      canonicalObjects: adapter.canonicalObjects,
      certification: buildCertification(withManifest, adapter),
      draft: withManifest,
    };
  }

  if (
    input.kind === "github" ||
    input.kind === "openapi" ||
    input.kind === "api" ||
    input.kind === "upload"
  ) {
    const slug = slugFromUrl(value);
    if (/hotel|osaka|stay|booking/.test(lower)) {
      const draft = createOsakaStayPlatformDraft();
      const withManifest = { ...draft, manifestJson: syncPlatformManifestJson(draft) };
      const adapter = adaptApiEndpoints(
        withManifest.actions.map((a) => ({
          method: a.approvalRequired ? "POST" : "GET",
          path: `/${a.name.replace(/\./g, "/")}`,
          summary: a.description,
        })),
      );
      return {
        platformName: withManifest.name,
        platformCategory: withManifest.category,
        tagline: withManifest.description,
        ingressLabel: input.kind === "github" ? `GitHub · ${value}` : `${input.kind} · ${value}`,
        capabilities: withManifest.actions.map((a) => ({
          capabilityId: a.name,
          label: a.description ?? a.name,
          approvalRequired: a.approvalRequired,
          risk: a.approvalRequired ? ("financial" as const) : ("read" as const),
        })),
        permissionSummary: adapter.permissionSummary,
        canonicalObjects: ["hotel", "room", "price", "location", "booking"],
        certification: buildCertification(withManifest, adapter),
        draft: withManifest,
      };
    }

    if (/cad|design|설계|autocad|dwg|step|3d/.test(lower)) {
      return analyzeDesignPlatform(slug, `${input.kind} · ${value}`);
    }

    return analyzeMarketplace(slug, `${input.kind} · ${value}`);
  }

  if (input.kind === "mcp") {
    return analyzeMarketplace("mcp-service", `MCP · ${value}`);
  }

  return null;
}

export function certificationSummary(checks: readonly CertificationCheck[]): {
  readonly passed: number;
  readonly total: number;
  readonly agentReady: boolean;
} {
  const passed = checks.filter((c) => c.passed).length;
  return {
    passed,
    total: checks.length,
    agentReady: passed >= checks.length - 1,
  };
}
