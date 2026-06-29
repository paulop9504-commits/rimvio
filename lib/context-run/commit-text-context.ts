import { assertCommitPermitted } from "@/lib/context-run/commit-gate";
import {
  ingestGlobeContextFromText,
  type GlobeContextCaptureResult,
} from "@/lib/feed/ingest-globe-context-capture";

/** Commit gate adapter — sole approved path for plain text truth writes from UI. */
export async function commitTextContextIngress(
  text: string,
): Promise<GlobeContextCaptureResult> {
  assertCommitPermitted({
    risk: "none",
    autoEnvelope: "context_text_ingest",
  });
  return ingestGlobeContextFromText(text);
}
