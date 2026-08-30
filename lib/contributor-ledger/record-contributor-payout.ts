/**
 * Contributor Ledger — unified payout SSOT (R6).
 * Merges Capability Execution Ledger + Reality Data Network payouts.
 */

export type ContributorLedgerEntryKind =
  | "capability_execution"
  | "data_submission"
  | "human_verification"
  | "expert_review"
  | "composite_split"
  | "business_supply"
  | "capability_improvement";

export type ContributorLedgerEntry = {
  readonly entryId: string;
  readonly contributorId: string;
  readonly kind: ContributorLedgerEntryKind;
  readonly amountKrw: number;
  readonly timestamp: string;
  readonly summaryKo: string;
  readonly executionId?: string | null;
  readonly taskId?: string | null;
  readonly capabilityId?: string | null;
  readonly rewardFactors?: Readonly<Record<string, number>> | null;
};

const entries: ContributorLedgerEntry[] = [];
let entryCounter = 0;

function nextEntryId(): string {
  entryCounter += 1;
  return `contrib-${Date.now()}-${entryCounter}`;
}

export function recordContributorPayout(input: {
  readonly contributorId: string;
  readonly kind: ContributorLedgerEntryKind;
  readonly amountKrw: number;
  readonly summaryKo: string;
  readonly executionId?: string | null;
  readonly taskId?: string | null;
  readonly capabilityId?: string | null;
  readonly rewardFactors?: Readonly<Record<string, number>> | null;
}): ContributorLedgerEntry {
  const entry: ContributorLedgerEntry = {
    entryId: nextEntryId(),
    contributorId: input.contributorId,
    kind: input.kind,
    amountKrw: input.amountKrw,
    timestamp: new Date().toISOString(),
    summaryKo: input.summaryKo,
    executionId: input.executionId ?? null,
    taskId: input.taskId ?? null,
    capabilityId: input.capabilityId ?? null,
    rewardFactors: input.rewardFactors ?? null,
  };
  entries.push(entry);
  return entry;
}

export function readContributorLedger(): readonly ContributorLedgerEntry[] {
  return entries;
}

export type UnifiedContributorWallet = {
  readonly contributorId: string;
  readonly totalKrw: number;
  readonly capabilityExecutionKrw: number;
  readonly dataSubmissionKrw: number;
  readonly humanVerificationKrw: number;
  readonly businessSupplyKrw: number;
  readonly entryCount: number;
};

export function getUnifiedContributorWallet(
  contributorId: string,
): UnifiedContributorWallet {
  const mine = entries.filter((e) => e.contributorId === contributorId);
  const sum = (kind: ContributorLedgerEntryKind) =>
    mine.filter((e) => e.kind === kind).reduce((s, e) => s + e.amountKrw, 0);

  return {
    contributorId,
    totalKrw: mine.reduce((s, e) => s + e.amountKrw, 0),
    capabilityExecutionKrw: sum("capability_execution"),
    dataSubmissionKrw: sum("data_submission"),
    humanVerificationKrw: sum("human_verification"),
    businessSupplyKrw: sum("business_supply"),
    entryCount: mine.length,
  };
}

export function mergeCapabilityExecutionIntoContributorLedger(input: {
  readonly executionId: string;
  readonly developerId: string;
  readonly capabilityId: string;
  readonly payoutKrw: number;
  readonly summaryKo?: string;
}): ContributorLedgerEntry | null {
  if (input.payoutKrw <= 0) return null;
  return recordContributorPayout({
    contributorId: input.developerId,
    kind: "capability_execution",
    amountKrw: input.payoutKrw,
    executionId: input.executionId,
    capabilityId: input.capabilityId,
    summaryKo: input.summaryKo ?? `Capability · ${input.capabilityId}`,
  });
}

export function resetContributorLedgerForTests(): void {
  entries.length = 0;
  entryCounter = 0;
}
