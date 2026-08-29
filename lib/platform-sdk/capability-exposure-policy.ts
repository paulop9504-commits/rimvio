/**
 * Capability Exposure Policy — Dev registers; Rimvio decides what Agent may expose/execute.
 * Not all platform capabilities are shown to users simultaneously.
 */

import {
  classifyCapability,
  capabilityClassLabelKo,
  inferDomainFromCapabilityId,
  type CapabilityClass,
} from "@/lib/platform-sdk/capability-classification";
import type { CapabilityIndexEntry } from "@/lib/platform-sdk/capability-index";
import {
  isCapabilityDiscoverableAtStage,
  isCapabilityExecutableAtStage,
  resolveExecutionStage,
} from "@/lib/platform-sdk/capability-execution-lifecycle";
import type { ScoredCapabilityHit } from "@/lib/platform-sdk/score-capability-discovery";

export type CapabilityExposureMode = "always" | "contextual" | "hidden";

export type CapabilityRiskTier = "low" | "medium" | "high" | "critical";

export type CapabilityExposurePolicy = {
  readonly capabilityId: string;
  readonly classification: CapabilityClass;
  readonly exposure: CapabilityExposureMode;
  readonly agentAutoExecute: boolean;
  readonly userApprovalRequired: boolean;
  readonly risk: CapabilityRiskTier;
  readonly stage: ReturnType<typeof resolveExecutionStage>;
  readonly discoverable: boolean;
  readonly executable: boolean;
};

export type CapabilityExposureStep = {
  readonly capabilityId: string;
  readonly platformId: string;
  readonly platformName: string;
  readonly role: "inspect" | "measure" | "prepare" | "execute" | "export" | "verify";
  readonly classification: CapabilityClass;
  readonly userApprovalRequired: boolean;
  readonly score: number;
};

export type CapabilityExposurePlan = {
  readonly utterance: string;
  readonly experienceDomain: string;
  readonly experienceLabelKo: string;
  readonly primary: CapabilityExposureStep;
  readonly pipeline: readonly CapabilityExposureStep[];
  readonly hiddenPlatformBranding: boolean;
};

function defaultRisk(capClass: CapabilityClass): CapabilityRiskTier {
  switch (capClass) {
    case "delete":
    case "transaction":
      return "critical";
    case "share":
    case "create":
      return "high";
    case "edit":
    case "execute":
    case "export":
      return "medium";
    default:
      return "low";
  }
}

function defaultExposure(capClass: CapabilityClass): CapabilityExposureMode {
  if (capClass === "delete") return "hidden";
  if (capClass === "share" || capClass === "transaction") return "contextual";
  return "contextual";
}

/** Resolve Rimvio policy for a registered capability (Dev manifest + Rimvio rules). */
export function resolveCapabilityExposurePolicy(
  capabilityId: string,
  opts?: {
    readonly approvalRequired?: boolean;
    readonly indexStatus?: CapabilityIndexEntry["status"];
  },
): CapabilityExposurePolicy {
  const classification = classifyCapability(capabilityId);
  const risk = defaultRisk(classification);
  const exposure = defaultExposure(classification);
  const userApprovalRequired =
    opts?.approvalRequired ??
    (risk === "critical" || risk === "high" || classification === "edit");
  const agentAutoExecute =
    classification !== "delete" &&
    classification !== "share" &&
    !(classification === "transaction" && userApprovalRequired);

  const status = opts?.indexStatus ?? "PUBLISHED";
  const stage = resolveExecutionStage(status);
  const discoverable = isCapabilityDiscoverableAtStage(status, classification);
  const executable = isCapabilityExecutableAtStage(status, classification, agentAutoExecute);

  return {
    capabilityId,
    classification,
    exposure,
    agentAutoExecute,
    userApprovalRequired,
    risk,
    stage,
    discoverable,
    executable,
  };
}

function utteranceWantsDesignEdit(text: string): boolean {
  return /구멍|hole|mm|치수|dimension|부품|part|cad|step|도면|설계|design|뚫|변경|바꿔|만들어/.test(
    text,
  );
}

function utteranceWantsExport(text: string): boolean {
  return /export|출력|pdf|step|dwg|내보내|저장/.test(text);
}

function utteranceWantsAnalyze(text: string): boolean {
  return /분석|analyze|inspect|면적|계산|견적|자재/.test(text);
}

function roleForClass(capClass: CapabilityClass): CapabilityExposureStep["role"] {
  switch (capClass) {
    case "analyze":
    case "read":
      return "inspect";
    case "measure":
      return "measure";
    case "search":
      return "inspect";
    case "edit":
    case "create":
      return "execute";
    case "export":
      return "export";
    case "transaction":
      return "prepare";
    default:
      return "execute";
  }
}

function matchesIntent(utterance: string, hit: ScoredCapabilityHit): boolean {
  const policy = resolveCapabilityExposurePolicy(hit.capabilityId, {
    approvalRequired: hit.approvalRequired,
    indexStatus: hit.status,
  });
  if (!policy.discoverable) return false;
  if (policy.exposure === "hidden") return false;

  const text = utterance.toLowerCase();
  const id = hit.capabilityId.toLowerCase();
  const domain = inferDomainFromCapabilityId(hit.capabilityId);

  if (domain === "design" || id.startsWith("design.")) {
    if (utteranceWantsDesignEdit(text)) {
      return ["analyze", "measure", "edit", "export"].includes(policy.classification);
    }
    if (utteranceWantsAnalyze(text)) {
      return ["analyze", "measure", "read", "search"].includes(policy.classification);
    }
    if (utteranceWantsExport(text)) {
      return policy.classification === "export" || policy.classification === "read";
    }
    return policy.classification === "read" || policy.classification === "analyze";
  }

  if (policy.exposure === "always") return true;
  return hit.composite >= 0.55;
}

function experienceLabelKo(utterance: string, domain: string, primaryClass: CapabilityClass): string {
  const text = utterance.trim();
  if (domain === "design" || /cad|설계|도면|part/i.test(text)) {
    if (primaryClass === "edit") return "설계 수정";
    if (primaryClass === "analyze" || primaryClass === "measure") return "설계 분석";
    if (primaryClass === "export") return "파일 내보내기";
    return "Design";
  }
  if (domain === "hotel" || /호텔|hotel/i.test(text)) return "숙소";
  if (domain === "market" || /중고|market/i.test(text)) return "마켓";
  return capabilityClassLabelKo(primaryClass);
}

/** Intent-scoped exposure — only capabilities needed for this turn (not full platform). */
export function planCapabilityExposure(input: {
  readonly utterance: string;
  readonly hits: readonly ScoredCapabilityHit[];
}): CapabilityExposurePlan | null {
  const utterance = input.utterance.trim();
  if (!utterance || input.hits.length === 0) return null;

  const exposed = input.hits.filter((h) => matchesIntent(utterance, h));
  if (exposed.length === 0) return null;

  const sorted = [...exposed].sort((a, b) => {
    const roleOrder = (id: string) => {
      const c = classifyCapability(id);
      if (c === "analyze" || c === "read") return 0;
      if (c === "measure") return 1;
      if (c === "edit" || c === "create") return 2;
      if (c === "export") return 3;
      return 4;
    };
    const rd = roleOrder(a.capabilityId) - roleOrder(b.capabilityId);
    if (rd !== 0) return rd;
    return b.composite - a.composite;
  });

  const primaryHit = sorted.find((h) => {
    const c = classifyCapability(h.capabilityId);
    return c === "edit" || c === "create" || c === "transaction" || c === "execute";
  }) ?? sorted[sorted.length - 1]!;

  const domain = inferDomainFromCapabilityId(primaryHit.capabilityId);
  const primaryClass = classifyCapability(primaryHit.capabilityId);

  const pipelineSteps: CapabilityExposureStep[] = [];
  const seen = new Set<string>();

  for (const hit of sorted) {
    if (seen.has(hit.capabilityId)) continue;
    seen.add(hit.capabilityId);
    const policy = resolveCapabilityExposurePolicy(hit.capabilityId, {
      approvalRequired: hit.approvalRequired,
      indexStatus: hit.status,
    });
    if (!policy.discoverable) continue;

    pipelineSteps.push({
      capabilityId: hit.capabilityId,
      platformId: hit.platformId,
      platformName: hit.platformName,
      role: roleForClass(policy.classification),
      classification: policy.classification,
      userApprovalRequired: policy.userApprovalRequired,
      score: hit.composite,
    });

    if (pipelineSteps.length >= 4) break;
  }

  const primaryPolicy = resolveCapabilityExposurePolicy(primaryHit.capabilityId, {
    approvalRequired: primaryHit.approvalRequired,
    indexStatus: primaryHit.status,
  });

  const primary: CapabilityExposureStep = {
    capabilityId: primaryHit.capabilityId,
    platformId: primaryHit.platformId,
    platformName: primaryHit.platformName,
    role: roleForClass(primaryPolicy.classification),
    classification: primaryPolicy.classification,
    userApprovalRequired: primaryPolicy.userApprovalRequired,
    score: primaryHit.composite,
  };

  return {
    utterance,
    experienceDomain: domain,
    experienceLabelKo: experienceLabelKo(utterance, domain, primaryClass),
    primary,
    pipeline: pipelineSteps,
    hiddenPlatformBranding: true,
  };
}

/** Filter index hits before ranking — drop hidden / non-discoverable. */
export function filterHitsForExposure(
  hits: readonly ScoredCapabilityHit[],
): ScoredCapabilityHit[] {
  return hits.filter((h) => {
    const policy = resolveCapabilityExposurePolicy(h.capabilityId, {
      approvalRequired: h.approvalRequired,
      indexStatus: h.status,
    });
    return policy.discoverable && policy.exposure !== "hidden";
  });
}
