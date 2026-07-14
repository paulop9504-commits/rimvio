import type {
  FastScanCandidate,
} from "@/engines/research/schema";
import { readActiveDiscoveryExecution } from "@/lib/globe/discovery-execution/read-active-discovery-execution";
import {
  candidatesFromInventorySnippets,
  type ResearchCandidateProvider,
} from "@/lib/research-engine/providers";

/**
 * Fast Scan from active discovery batch (title/snippet only).
 */
export function createDiscoveryBatchCandidateProvider(
  contextEventId: string,
): ResearchCandidateProvider {
  return {
    id: "discovery_batch",
    listCandidates(input) {
      const batch = readActiveDiscoveryExecution(contextEventId);
      const rows = batch?.recommendations ?? [];
      const mapped = candidatesFromInventorySnippets(
        rows.map((row, index) => ({
          id: row.placeId?.trim() || `batch-${index}`,
          title: row.title,
          snippet: row.reasonKo || row.title,
          domain: `discovery.${row.kind}.rimvio`,
          kind: row.kind,
        })),
      );
      if (mapped.length === 0) {
        return [] as FastScanCandidate[];
      }
      const q = input.queries.join(" ").toLowerCase();
      const filtered = q
        ? mapped.filter((row) =>
            `${row.title} ${row.snippet}`.toLowerCase().includes(
              q.slice(0, 16).trim(),
            ),
          )
        : mapped;
      return (filtered.length > 0 ? filtered : mapped).slice(
        0,
        input.limit ?? 24,
      );
    },
  };
}
