/**
 * Hub Compatibility / Validation Graph (ADR-064).
 * Infrastructure ↔ Adapter ↔ Capability ↔ Runtime
 */

import { readAdapterIndex } from "@/lib/hub/dev/adapter-registry";
import {
  readInfrastructureIndex,
  type InfrastructureIndexEntry,
} from "@/lib/hub/dev/infrastructure-registry";
import { previewRuntimeRouter } from "@/lib/rimvio-core/runtime-router";
import type { RankedRuntimeCandidate } from "@/lib/rimvio-core/runtime-router-select";
import {
  compileCapabilityPackage,
  compileCapabilitySpecificationFromId,
  type RimvioCapabilitySpecification,
} from "@/lib/rimvio-protocol/capability-specification";
import type { CapabilityAction } from "@/lib/hub/capability/types";
import type { PlatformDraft } from "@/lib/hub/platform/types";

export type CompatibilityNodeStatus = {
  readonly id: string;
  readonly name: string;
  readonly compatible: boolean;
  readonly reasonKo: string;
};

export type InfrastructureGraphNode = CompatibilityNodeStatus & {
  readonly kind: InfrastructureIndexEntry["kind"];
  readonly ownerCreatorId: string;
  readonly status: InfrastructureIndexEntry["status"];
  readonly compatibleRuntimeIds: readonly string[];
  readonly linkedAdapterIds: readonly string[];
  readonly matchesSpecKind: boolean;
};

export type AdapterGraphNode = CompatibilityNodeStatus & {
  readonly runtimeId: string;
  readonly infrastructureId: string;
  readonly ownerCreatorId: string;
  readonly adapterStatus: "pending-review" | "published" | "verified";
};

export type CapabilityCompatibilityGraph = {
  readonly capabilityId: string;
  readonly specification: RimvioCapabilitySpecification;
  readonly infrastructure: readonly InfrastructureGraphNode[];
  readonly adapters: readonly AdapterGraphNode[];
  readonly runtimes: readonly RankedRuntimeCandidate[];
  readonly selectedRuntimeId: string | null;
  readonly graphValid: boolean;
  readonly summaryKo: string;
};

function infraMatchesCapability(
  infra: InfrastructureIndexEntry,
  spec: RimvioCapabilitySpecification,
  selectedRuntimeId: string | null,
): { compatible: boolean; reasonKo: string } {
  if (infra.status !== "published") {
    return { compatible: false, reasonKo: "미게시" };
  }

  const kindOk =
    spec.requirements.infrastructureKinds.length === 0 ||
    spec.requirements.infrastructureKinds.includes(infra.kind);

  if (!kindOk) {
    return { compatible: false, reasonKo: `종류 불일치 (${infra.kind})` };
  }

  if (selectedRuntimeId && infra.compatibleRuntimeIds.length > 0) {
    if (!infra.compatibleRuntimeIds.includes(selectedRuntimeId)) {
      return { compatible: false, reasonKo: "선택 Runtime과 미연결" };
    }
  }

  return { compatible: true, reasonKo: "호환" };
}

export function resolveCapabilityCompatibilityGraph(input: {
  readonly capabilityId: string;
  readonly platformId?: string;
  readonly utterance?: string;
  readonly action?: CapabilityAction;
  readonly draft?: PlatformDraft;
}): CapabilityCompatibilityGraph {
  const specification =
    input.action && input.draft
      ? compileCapabilityPackage({ action: input.action, draft: input.draft }).specification
      : compileCapabilitySpecificationFromId(input.capabilityId);

  const runtimes = previewRuntimeRouter({
    capabilityId: input.capabilityId,
    platformId: input.platformId,
    utterance: input.utterance ?? input.action?.description,
  });

  const selectedRuntimeId = runtimes[0]?.runtime.id ?? null;
  const allAdapters = readAdapterIndex();

  const infrastructure = readInfrastructureIndex().map((infra) => {
    const { compatible, reasonKo } = infraMatchesCapability(
      infra,
      specification,
      selectedRuntimeId,
    );
    const matchesSpecKind =
      specification.requirements.infrastructureKinds.length === 0 ||
      specification.requirements.infrastructureKinds.includes(infra.kind);
    const linkedAdapterIds = allAdapters
      .filter((a) => a.infrastructureId === infra.id)
      .map((a) => a.id);

    return {
      id: infra.id,
      name: infra.name,
      compatible,
      reasonKo,
      kind: infra.kind,
      ownerCreatorId: infra.ownerCreatorId,
      status: infra.status,
      compatibleRuntimeIds: infra.compatibleRuntimeIds,
      linkedAdapterIds,
      matchesSpecKind,
    };
  });

  const adapters = allAdapters.map((adapter) => {
    const runtimeOk = !selectedRuntimeId || adapter.runtimeId === selectedRuntimeId;
    const infraRow = infrastructure.find((i) => i.id === adapter.infrastructureId);
    const infraOk = infraRow?.compatible ?? false;
    const statusOk = adapter.status === "published" || adapter.status === "verified";

    const compatible = statusOk && runtimeOk && infraOk;
    let reasonKo = "호환";
    if (!statusOk) reasonKo = "미검증";
    else if (!runtimeOk) reasonKo = "Runtime 불일치";
    else if (!infraOk) reasonKo = "Infrastructure 불일치";

    return {
      id: adapter.id,
      name: adapter.name,
      compatible,
      reasonKo,
      runtimeId: adapter.runtimeId,
      infrastructureId: adapter.infrastructureId,
      ownerCreatorId: adapter.ownerCreatorId,
      adapterStatus: adapter.status,
    };
  });

  const infraRequired = specification.requirements.infrastructureKinds.length > 0;
  const hasInfra = infrastructure.some((i) => i.compatible);
  const hasRuntime = runtimes.length > 0;
  const industrial = specification.requirements.runtimeTypes.includes("industrial");
  const hasAdapter = !industrial || adapters.some((a) => a.compatible);

  const graphValid = hasRuntime && (!infraRequired || hasInfra) && hasAdapter;

  let summaryKo = "Compatibility Graph ✓";
  if (!hasRuntime) summaryKo = "호환 Runtime 없음";
  else if (infraRequired && !hasInfra) summaryKo = "Infrastructure 미연결";
  else if (!hasAdapter) summaryKo = "Adapter 미연결";

  return {
    capabilityId: input.capabilityId,
    specification,
    infrastructure,
    adapters,
    runtimes,
    selectedRuntimeId,
    graphValid,
    summaryKo,
  };
}

/** payment.commit — Permission + Approval + Policy re-check (ADR-064). */
export function enforcePaymentCommitPolicy(
  capabilityId: string,
  approvalPolicy: "none" | "user_required" | "field_commit",
): string | null {
  const id = capabilityId.toLowerCase();
  if (id.includes("payment.commit") && approvalPolicy === "none") {
    return "payment.commit은 user_required 또는 field_commit 승인이 필요합니다";
  }
  if (id.includes("payment.refund") && approvalPolicy === "none") {
    return "payment.refund는 승인 정책이 필요합니다";
  }
  return null;
}

export async function validateAndExecuteCapability(input: {
  readonly capabilityId: string;
  readonly platformId: string;
  readonly platformName?: string;
  readonly utterance?: string;
  readonly action?: CapabilityAction;
  readonly draft?: PlatformDraft;
  readonly approvalPolicy: "none" | "user_required" | "field_commit";
  readonly testInput?: Record<string, unknown>;
}): Promise<{
  readonly graph: CapabilityCompatibilityGraph;
  readonly executed: boolean;
  readonly routerOk: boolean;
  readonly detailKo: string;
  readonly runtimeId?: string;
  readonly durationMs?: number;
}> {
  const graph = resolveCapabilityCompatibilityGraph(input);

  if (!graph.graphValid) {
    return {
      graph,
      executed: false,
      routerOk: false,
      detailKo: graph.summaryKo,
    };
  }

  const policyError = enforcePaymentCommitPolicy(input.capabilityId, input.approvalPolicy);
  if (policyError) {
    return {
      graph,
      executed: false,
      routerOk: false,
      detailKo: policyError,
    };
  }

  const { routeRuntimeExecute } = await import("@/lib/rimvio-core/runtime-router");
  const router = await routeRuntimeExecute({
    platformId: input.platformId,
    platformName: input.platformName,
    utterance: input.utterance,
    action: {
      toolId: input.capabilityId,
      capabilityId: input.capabilityId,
      input: input.testInput ?? { test: true },
      approvalPolicy: input.approvalPolicy,
    },
  });

  return {
    graph,
    executed: true,
    routerOk: router.ok,
    detailKo: router.ok
      ? `${graph.summaryKo} · ${router.runtimeName} (${router.routedVia})`
      : router.errorKo ?? "실행 실패",
    runtimeId: router.runtimeId,
    durationMs: router.durationMs,
  };
}
