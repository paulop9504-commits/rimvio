/**
 * Rimvio Experience UI Projection — Canonical result → user-facing card (not Dev platform UI).
 */

import type { RimvioCanonicalItem } from "@/lib/platform-sdk/canonical-capability-result";
import {
  classifyCapability,
  inferDomainFromCapabilityId,
} from "@/lib/platform-sdk/capability-classification";

export type RimvioExperienceField = {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly highlight?: boolean;
};

export type RimvioExperienceAction = {
  readonly label: string;
  readonly kind: "primary" | "secondary" | "destructive";
  readonly capabilityId?: string;
};

export type RimvioExperienceProjection = {
  readonly domain: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly artifactLabel?: string;
  readonly fields: readonly RimvioExperienceField[];
  readonly workLogKo: string;
  readonly actions: readonly RimvioExperienceAction[];
  readonly hidePlatformBranding: boolean;
  readonly pipelineSummaryKo?: string;
};

function parseDesignChange(utterance: string): { before?: string; after?: string } {
  const mmMatch = /(\d+)\s*mm/.exec(utterance);
  const after = mmMatch?.[1] ? `${mmMatch[1]} mm` : undefined;
  const beforeMatch = /기존[:\s]*(\d+)\s*mm|(\d+)\s*mm\s*에서/.exec(utterance);
  const before = beforeMatch?.[1] ?? beforeMatch?.[2];
  return {
    before: before ? `${before} mm` : undefined,
    after,
  };
}

/** Project capability output + intent into Rimvio Experience (platform name hidden). */
export function projectCapabilityExperience(input: {
  readonly utterance: string;
  readonly capabilityId: string;
  readonly experienceLabelKo: string;
  readonly pipelineSummaryKo?: string;
  readonly canonicalItems?: readonly RimvioCanonicalItem[];
  readonly awaitingApproval?: boolean;
}): RimvioExperienceProjection {
  const domain = inferDomainFromCapabilityId(input.capabilityId);
  const capClass = classifyCapability(input.capabilityId);
  const item = input.canonicalItems?.[0];

  if (domain === "design" || input.capabilityId.startsWith("design.")) {
    const change = parseDesignChange(input.utterance);
    const fields: RimvioExperienceField[] = [];
    if (change.before) {
      fields.push({ label: "기존", value: change.before, highlight: false });
    }
    if (change.after) {
      fields.push({ label: "변경", value: change.after, highlight: true });
    }
    if (item?.subtitle) {
      fields.push({ label: "Material", value: item.subtitle });
    }

    return {
      domain: "design",
      title: "Design",
      artifactLabel: item?.title ?? "part_001.step",
      subtitle: input.experienceLabelKo,
      fields,
      workLogKo: input.awaitingApproval
        ? `가운데 구멍을 ${change.after ?? "요청 치수"}로 변경할게요. 확인 후 적용합니다.`
        : `가운데 구멍을 ${change.after ?? "요청 치수"}로 변경할게요.`,
      actions: input.awaitingApproval
        ? [
            { label: "적용", kind: "primary", capabilityId: input.capabilityId },
            { label: "취소", kind: "secondary" },
          ]
        : [
            { label: "적용", kind: "primary", capabilityId: input.capabilityId },
            { label: "취소", kind: "secondary" },
          ],
      hidePlatformBranding: true,
      pipelineSummaryKo: input.pipelineSummaryKo,
    };
  }

  const fields: RimvioExperienceField[] = [];
  if (item?.price) {
    fields.push({
      label: "Price",
      value: item.price.amount.toLocaleString(),
      unit: item.price.currency,
    });
  }
  if (item?.location?.label) {
    fields.push({ label: "Location", value: item.location.label });
  }

  return {
    domain,
    title: input.experienceLabelKo,
    subtitle: item?.title,
    fields,
    workLogKo:
      capClass === "edit"
        ? "요청하신 변경을 준비했어요."
        : capClass === "search"
          ? "조건에 맞는 결과를 찾았어요."
          : "작업을 준비했어요.",
    actions: input.awaitingApproval
      ? [
          { label: "확인", kind: "primary", capabilityId: input.capabilityId },
          { label: "취소", kind: "secondary" },
        ]
      : [{ label: "펼치기", kind: "primary" }],
    hidePlatformBranding: true,
    pipelineSummaryKo: input.pipelineSummaryKo,
  };
}

export function summarizeExposurePipeline(
  pipeline: readonly { readonly role: string; readonly capabilityId: string }[],
): string {
  if (pipeline.length <= 1) return "";
  return pipeline.map((s) => s.capabilityId.split(".").pop() ?? s.capabilityId).join(" → ");
}
