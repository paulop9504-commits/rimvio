/**
 * NL Pipeline intent compiler stage — Rimvio Intent Frame SSOT.
 * @see lib/rimvio-protocol/intent.ts · ADR-023
 */

import {
  compileIntentFromUtterance,
  type RimvioIntentFrame,
} from "@/lib/rimvio-protocol/intent";

const TRAVEL_LODGING_RE =
  /호텔|hotel|숙소|lodging|맛집|restaurant|여행|trip|오사카|osaka|교토|kyoto|도쿄|tokyo|항공|flight|편의|atm|poi|관광|sightseeing/i;

/** Compile deterministic intent frame from utterance (MVP). */
export function compileNlIntentFrame(utterance: string): RimvioIntentFrame | null {
  return compileIntentFromUtterance(utterance);
}

/**
 * Commerce / platform intents route to capability discovery before place search.
 * Travel/lodging utterances stay on the existing discovery path.
 */
export function isCommerceCapabilityIntent(
  intent: RimvioIntentFrame,
  utterance: string,
): boolean {
  if (TRAVEL_LODGING_RE.test(utterance)) {
    return false;
  }
  if (intent.action === "sell" || intent.action === "create") {
    return true;
  }
  if (
    (intent.action === "buy" || intent.action === "search") &&
    Boolean(intent.object)
  ) {
    return true;
  }
  return false;
}

export function formatIntentWorkLogKo(intent: RimvioIntentFrame): string {
  const action = intent.action;
  const object = intent.object ?? "—";
  const market = intent.market ?? "—";
  return `Intent · ${action} · ${object} · ${market}`;
}

export type NlIntentCompileResult = {
  readonly intentFrame: RimvioIntentFrame | null;
  readonly commerceCapability: boolean;
  readonly workLogKo: string | null;
};

export function runNlIntentCompilerStage(utterance: string): NlIntentCompileResult {
  const intentFrame = compileNlIntentFrame(utterance);
  if (!intentFrame) {
    return { intentFrame: null, commerceCapability: false, workLogKo: null };
  }
  const commerceCapability = isCommerceCapabilityIntent(intentFrame, utterance);
  return {
    intentFrame,
    commerceCapability,
    workLogKo: formatIntentWorkLogKo(intentFrame),
  };
}
