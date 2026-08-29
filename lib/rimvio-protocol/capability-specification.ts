/**
 * Rimvio Capability Specification — contract SSOT (not implementation).
 *
 * > Capability = reusable unit of executable behavior standardized to achieve a goal.
 * > Code / Agent / API = Implementation that satisfies the same interface.
 *
 * @see docs/adr/063-capability-specification-model.md
 */

import type { CapabilityAction, CapabilityPermission } from "@/lib/hub/capability/types";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { CapabilitySideEffect, CapabilityRiskTier } from "@/lib/rimvio-protocol/capability-contract";
import type { DiscoveryIntentDomain } from "@/lib/platform-sdk/score-capability-discovery";

export type RimvioCapabilityCondition = {
  readonly code: string;
  readonly descriptionKo: string;
};

/** ① Intent — what problem does this capability solve? */
export type RimvioCapabilityIntentSpec = {
  readonly summaryKo: string;
  readonly domain: string;
  readonly discoveryDomain: DiscoveryIntentDomain;
  readonly problemStatementKo: string;
};

/** ② Input — what must the caller provide? */
export type RimvioCapabilityInputSpec = {
  readonly schemaId: string;
  readonly fields: readonly string[];
};

/** ③ Action — what does execution actually do? */
export type RimvioCapabilityActionSpec = {
  readonly capabilityId: string;
  readonly label: string;
  readonly description: string;
  readonly approvalRequired: boolean;
  readonly sideEffects: readonly CapabilitySideEffect[];
};

/** ④ Requirement — Runtime / Infrastructure needed */
export type RimvioCapabilityRequirementSpec = {
  readonly runtimeTypes: readonly ("pc" | "browser" | "cloud" | "mobile" | "industrial")[];
  readonly runtimeInterfaces: readonly ("context" | "event" | "tool" | "permission")[];
  readonly runtimeSupports: readonly ("camera" | "plc" | "sensor" | "database" | "network")[];
  readonly infrastructureKinds: readonly string[];
};

/** ⑤ Permission — what may this capability access? */
export type RimvioCapabilityPermissionSpec = {
  readonly scopes: readonly string[];
  readonly contextPaths: readonly string[];
  readonly riskTier: CapabilityRiskTier;
};

/** ⑥ Output — what is returned? */
export type RimvioCapabilityOutputSpec = {
  readonly schemaId: string;
  readonly fields: readonly string[];
  readonly objectKind?: string;
};

export type RimvioCapabilitySuccessFailureSpec = {
  readonly success: readonly RimvioCapabilityCondition[];
  readonly failure: readonly RimvioCapabilityCondition[];
};

/** Specification = contract. Interchangeable implementations must satisfy this. */
export type RimvioCapabilitySpecification = {
  readonly capabilityId: string;
  readonly version: string;
  readonly intent: RimvioCapabilityIntentSpec;
  readonly input: RimvioCapabilityInputSpec;
  readonly action: RimvioCapabilityActionSpec;
  readonly requirements: RimvioCapabilityRequirementSpec;
  readonly permission: RimvioCapabilityPermissionSpec;
  readonly output: RimvioCapabilityOutputSpec;
  readonly conditions: RimvioCapabilitySuccessFailureSpec;
};

export type RimvioCapabilityImplementationKind =
  | "code"
  | "agent"
  | "api_adapter"
  | "browser_automation";

/** Implementation = how a specific developer fulfills the specification. */
export type RimvioCapabilityImplementation = {
  readonly kind: RimvioCapabilityImplementationKind;
  readonly entry?: string;
  readonly providerLabel?: string;
};

export type RimvioCapabilityPackage = {
  readonly specification: RimvioCapabilitySpecification;
  readonly implementation: RimvioCapabilityImplementation;
};

const INTENT_BY_CAPABILITY: Record<
  string,
  Pick<RimvioCapabilityIntentSpec, "summaryKo" | "domain" | "discoveryDomain" | "problemStatementKo">
> = {
  "hotel.search": {
    summaryKo: "숙소 검색",
    domain: "travel.lodging",
    discoveryDomain: "lodging",
    problemStatementKo: "목적지·일정·인원 조건에 맞는 호텔 후보를 찾는다",
  },
  "market.create_listing": {
    summaryKo: "중고 등록",
    domain: "commerce.marketplace",
    discoveryDomain: "marketplace_sell",
    problemStatementKo: "판매자가 물건을 마켓에 등록한다",
  },
  "market.search": {
    summaryKo: "마켓 검색",
    domain: "commerce.marketplace",
    discoveryDomain: "marketplace_buy",
    problemStatementKo: "조건에 맞는 중고 상품을 찾는다",
  },
};

function parseSchemaFields(schema: string, capabilityId: string): string[] {
  if (!schema) return [];
  if (schema.includes("hotel.search")) return ["destination", "checkIn", "checkOut", "guests"];
  if (schema.includes("payment")) return ["amount", "currency", "bookingId"];
  if (schema.includes("booking")) return ["hotelId", "roomId", "guests"];
  if (capabilityId.includes("search")) return ["query", "filters"];
  if (schema.includes(".")) return [schema.split(".")[0] ?? schema];
  return [schema];
}

function inferDiscoveryDomain(capabilityId: string): DiscoveryIntentDomain {
  const id = capabilityId.toLowerCase();
  if (id.startsWith("hotel.")) return "lodging";
  if (id.includes("create_listing")) return "marketplace_sell";
  if (id.includes("search") || id.includes("purchase")) return "marketplace_buy";
  if (id.startsWith("booking.")) return "booking";
  if (id.startsWith("payment.")) return "payment";
  return "general";
}

function inferRequirements(capabilityId: string): RimvioCapabilityRequirementSpec {
  const id = capabilityId.toLowerCase();
  const runtimeTypes: Array<RimvioCapabilityRequirementSpec["runtimeTypes"][number]> = [];
  const runtimeInterfaces: Array<
    RimvioCapabilityRequirementSpec["runtimeInterfaces"][number]
  > = ["tool", "permission"];
  const runtimeSupports: Array<RimvioCapabilityRequirementSpec["runtimeSupports"][number]> = [
    "network",
  ];
  const infrastructureKinds: string[] = [];

  if (/hotel|booking|market|search|payment/.test(id)) {
    runtimeInterfaces.push("context");
    runtimeTypes.push("browser", "cloud");
    infrastructureKinds.push("supplier_api");
  }
  if (/^hotel\.|^booking\./.test(id)) {
    runtimeTypes.length = 0;
    runtimeTypes.push("browser");
  }
  if (/vision|defect|plc|sensor|robot|industrial/.test(id)) {
    runtimeTypes.push("industrial");
    runtimeSupports.push("camera", "plc", "sensor");
    infrastructureKinds.push("plc", "device_fleet");
  }
  if (runtimeTypes.length === 0) {
    runtimeTypes.push("cloud", "browser", "pc");
  }

  return {
    runtimeTypes: [...new Set(runtimeTypes)],
    runtimeInterfaces: [...new Set(runtimeInterfaces)],
    runtimeSupports: [...new Set(runtimeSupports)],
    infrastructureKinds: [...new Set(infrastructureKinds)],
  };
}

function inferSideEffects(capabilityId: string, approvalRequired: boolean): CapabilitySideEffect[] {
  const id = capabilityId.toLowerCase();
  if (id.includes("payment.commit")) return ["charges_payment", "writes_data"];
  if (id.includes("payment")) return ["charges_payment"];
  if (id.includes("create_listing")) return ["creates_object", "writes_data"];
  if (id.includes("booking.confirm")) return ["writes_data", "external_network"];
  if (id.startsWith("booking.")) return ["writes_data"];
  if (approvalRequired) return ["writes_data"];
  if (id.includes("search")) return ["reads_context", "external_network"];
  return ["reads_context"];
}

function inferRiskTier(capabilityId: string, approvalRequired: boolean): CapabilityRiskTier {
  if (capabilityId.includes("payment.commit")) return "critical";
  if (capabilityId.includes("payment")) return "high";
  if (approvalRequired) return "high";
  if (capabilityId.includes("plc") || capabilityId.includes("robot")) return "high";
  return "low";
}

function defaultConditions(capabilityId: string): RimvioCapabilitySuccessFailureSpec {
  const id = capabilityId.toLowerCase();
  if (id.includes("search")) {
    return {
      success: [
        { code: "results_non_empty", descriptionKo: "유효한 후보 객체가 1개 이상 반환됨" },
        { code: "schema_valid", descriptionKo: "Output 스키마 검증 통과" },
      ],
      failure: [
        { code: "invalid_input", descriptionKo: "필수 Input 누락 또는 형식 오류" },
        { code: "permission_denied", descriptionKo: "Permission / Context 부족" },
        { code: "runtime_unavailable", descriptionKo: "호환 Runtime 또는 Infrastructure 없음" },
        { code: "provider_error", descriptionKo: "외부 공급자 / 네트워크 오류" },
      ],
    };
  }
  if (id.includes("payment")) {
    return {
      success: [
        { code: "payment_authorized", descriptionKo: "결제 준비 또는 승인 완료" },
        { code: "user_approved", descriptionKo: "사용자 Commit 확인 (필요 시)" },
      ],
      failure: [
        { code: "payment_declined", descriptionKo: "결제 거절" },
        { code: "approval_missing", descriptionKo: "사용자 승인 없음" },
      ],
    };
  }
  return {
    success: [{ code: "execution_ok", descriptionKo: "Output 스키마 검증 통과" }],
    failure: [
      { code: "invalid_input", descriptionKo: "Input 검증 실패" },
      { code: "runtime_unavailable", descriptionKo: "Runtime Router가 실행 불가" },
    ],
  };
}

function inferImplementation(
  capabilityId: string,
  draft?: PlatformDraft,
): RimvioCapabilityImplementation {
  const entry = draft?.runtime?.entry ?? "capabilities/index.ts";
  if (capabilityId.includes("hotel") || capabilityId.includes("search")) {
    return {
      kind: "api_adapter",
      entry,
      providerLabel: draft?.name ?? "Platform implementation",
    };
  }
  if (
    draft?.runtime.type === "remote-agent" ||
    draft?.runtime.type === "api-tool"
  ) {
    return { kind: "browser_automation", entry, providerLabel: draft.name };
  }
  return { kind: "code", entry, providerLabel: draft?.name };
}

export function compileCapabilitySpecificationFromId(
  capabilityId: string,
  opts?: { version?: string; description?: string; approvalRequired?: boolean },
): RimvioCapabilitySpecification {
  const intentMeta = INTENT_BY_CAPABILITY[capabilityId] ?? {
    summaryKo: capabilityId.replace(/\./g, " "),
    domain: "general",
    discoveryDomain: inferDiscoveryDomain(capabilityId),
    problemStatementKo: `${capabilityId} 목표를 달성한다`,
  };

  const inputSchema = `${capabilityId}.v1`;
  const outputSchema = `${capabilityId.replace(/\.[^.]+$/, "")}_result.v1`;

  return {
    capabilityId,
    version: opts?.version ?? "1.0.0",
    intent: intentMeta,
    input: {
      schemaId: inputSchema,
      fields: parseSchemaFields(inputSchema, capabilityId),
    },
    action: {
      capabilityId,
      label: capabilityId,
      description: opts?.description ?? intentMeta.problemStatementKo,
      approvalRequired: opts?.approvalRequired ?? capabilityId.includes("payment"),
      sideEffects: inferSideEffects(capabilityId, opts?.approvalRequired ?? false),
    },
    requirements: inferRequirements(capabilityId),
    permission: {
      scopes: [],
      contextPaths: ["user.id", "market.country"],
      riskTier: inferRiskTier(capabilityId, opts?.approvalRequired ?? false),
    },
    output: {
      schemaId: outputSchema,
      fields: parseSchemaFields(outputSchema, capabilityId),
      objectKind: capabilityId.includes("search") ? "result_set" : "entity",
    },
    conditions: defaultConditions(capabilityId),
  };
}

export function compileCapabilityPackage(input: {
  readonly action: CapabilityAction;
  readonly draft: PlatformDraft;
  readonly permissions?: readonly CapabilityPermission[];
  readonly contextPaths?: readonly string[];
}): RimvioCapabilityPackage {
  const permissions = input.permissions ?? input.draft.permissions.filter((p) => p.enabled);
  const contextPaths =
    input.contextPaths ?? input.draft.selectedContext.map((c) => c.path);

  const specification = compileCapabilitySpecificationFromId(input.action.name, {
    version: input.draft.version,
    description: input.action.description,
    approvalRequired: input.action.approvalRequired,
  });

  return {
    specification: {
      ...specification,
      permission: {
        scopes: permissions.map((p) => p.id),
        contextPaths,
        riskTier: inferRiskTier(input.action.name, input.action.approvalRequired),
      },
      input: {
        schemaId: input.action.inputSchema,
        fields: parseSchemaFields(input.action.inputSchema, input.action.name),
      },
      output: {
        schemaId: input.action.outputSchema,
        fields:
          input.action.outputSchema.endsWith("[]") || input.action.name.includes("search")
            ? [`${input.action.name.split(".")[1] ?? "result"}[]`]
            : [input.action.outputSchema],
        objectKind: input.action.name.includes("search") ? "hotel" : undefined,
      },
      action: {
        ...specification.action,
        label: input.action.name,
        description: input.action.description,
        approvalRequired: input.action.approvalRequired,
      },
    },
    implementation: inferImplementation(input.action.name, input.draft),
  };
}

export const CAPABILITY_SPEC_PILLARS = [
  "intent",
  "input",
  "action",
  "requirements",
  "permission",
  "output",
  "conditions",
] as const;

export type CapabilitySpecPillar = (typeof CAPABILITY_SPEC_PILLARS)[number];
