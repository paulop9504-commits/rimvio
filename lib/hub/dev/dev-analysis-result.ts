/**
 * Analysis Result — post-analyze summary (caps · schemas · issues · tests · confidence).
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";

export type DevAnalysisResult = {
  readonly capabilitiesDiscovered: number;
  readonly schemasGenerated: number;
  readonly issuesFound: number;
  readonly testsPassed: number;
  readonly testsTotal: number;
  readonly confidenceScore: number;
  readonly finishedAgoKo: string;
};

export function buildDevAnalysisResult(input: {
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly analyzedAtMs?: number;
}): DevAnalysisResult | null {
  const capCount = input.draft.actions.length;
  if (capCount === 0) return null;

  const schemaCount = capCount + Math.min(capCount, 4);
  const errors = input.snapshot.issues.filter((i) => i.severity === "error").length;
  const warnings = input.snapshot.issues.filter((i) => i.severity === "warning").length;

  let confidence = 98;
  confidence -= errors * 8;
  confidence -= warnings * 3;
  if (input.snapshot.testsTotal > 0) {
    const testRatio = input.snapshot.testsPassed / input.snapshot.testsTotal;
    confidence = Math.round(confidence * 0.6 + testRatio * 100 * 0.4);
  }
  confidence = Math.max(52, Math.min(99, confidence));

  const agoMs = input.analyzedAtMs ? Date.now() - input.analyzedAtMs : 60_000;
  const finishedAgoKo =
    agoMs < 60_000 ? "방금" : agoMs < 3_600_000 ? `${Math.floor(agoMs / 60_000)}m ago` : "1h+ ago";

  return {
    capabilitiesDiscovered: capCount,
    schemasGenerated: schemaCount,
    issuesFound: input.snapshot.issuesCount,
    testsPassed: input.snapshot.testsPassed,
    testsTotal: input.snapshot.testsTotal,
    confidenceScore: confidence,
    finishedAgoKo,
  };
}
