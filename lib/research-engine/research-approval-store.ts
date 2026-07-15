/**
 * Research approval gate session — Cursor apply/reject pending state.
 * Does not Commit Reality until human taps apply (then prepare only).
 */

export type ResearchApprovalStatus =
  | "waiting_approval"
  | "approved"
  | "rejected";

export type ResearchApprovalSnapshot = {
  readonly status: ResearchApprovalStatus;
  readonly promptKo: string;
  readonly confidence: number;
  readonly bestTitle: string;
  readonly bestCandidateId: string | null;
  readonly sectorSummariesKo: readonly string[];
  readonly sourceUtterance: string;
  readonly createdAtIso: string;
  readonly decidedAtIso?: string | null;
};

const gates = new Map<string, ResearchApprovalSnapshot>();

export function writeResearchApprovalGate(
  contextEventId: string,
  gate: ResearchApprovalSnapshot,
): void {
  const id = contextEventId.trim();
  if (!id) return;
  gates.set(id, gate);
}

export function readResearchApprovalGate(
  contextEventId: string,
): ResearchApprovalSnapshot | null {
  const id = contextEventId.trim();
  if (!id) return null;
  return gates.get(id) ?? null;
}

export function clearResearchApprovalGate(contextEventId: string): void {
  const id = contextEventId.trim();
  if (!id) return;
  gates.delete(id);
}

export function markResearchApprovalGateDecision(
  contextEventId: string,
  decision: "approved" | "rejected",
): ResearchApprovalSnapshot | null {
  const prev = readResearchApprovalGate(contextEventId);
  if (!prev) return null;
  const next: ResearchApprovalSnapshot = {
    ...prev,
    status: decision,
    decidedAtIso: new Date().toISOString(),
  };
  writeResearchApprovalGate(contextEventId, next);
  return next;
}
