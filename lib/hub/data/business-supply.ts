/**
 * Business Contributor — inventory · price · policy supply (ADR-066).
 */

import type { BusinessSupplyKind, BusinessSupplyRecord } from "@/lib/reality-data-network/types";
import { recordContributorPayout } from "@/lib/contributor-ledger/record-contributor-payout";
import { computeContributorRewardV2 } from "@/lib/contributor-ledger/reward-formula-v2";
import {
  getContributorProfile,
  notifyRdnStoreUpdated,
  upsertContributorProfile,
} from "@/lib/reality-data-network/task-pool";

const SUPPLY_KEY = "rimvio-rdn-business-supply-v1";
const memory: BusinessSupplyRecord[] = [];
let counter = 0;

const BASE_REWARD: Record<BusinessSupplyKind, number> = {
  inventory: 40,
  price: 30,
  policy: 25,
  photos: 35,
  hours: 20,
};

function nextId(): string {
  counter += 1;
  return `BSUP-${Date.now()}-${counter}`;
}

function readAll(): BusinessSupplyRecord[] {
  if (typeof window === "undefined") return [...memory];
  try {
    const raw = localStorage.getItem(SUPPLY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BusinessSupplyRecord[];
  } catch {
    return [];
  }
}

function writeAll(rows: BusinessSupplyRecord[]): void {
  if (typeof window === "undefined") {
    memory.length = 0;
    memory.push(...rows);
    return;
  }
  localStorage.setItem(SUPPLY_KEY, JSON.stringify(rows));
}

export function readBusinessSupplies(): readonly BusinessSupplyRecord[] {
  return readAll();
}

export function submitBusinessSupply(input: {
  readonly businessId: string;
  readonly businessLabel: string;
  readonly domain: BusinessSupplyRecord["domain"];
  readonly kind: BusinessSupplyKind;
  readonly targetLabelKo: string;
  readonly payload: Readonly<Record<string, unknown>>;
}): BusinessSupplyRecord {
  const record: BusinessSupplyRecord = {
    supplyId: nextId(),
    businessId: input.businessId,
    businessLabel: input.businessLabel,
    domain: input.domain,
    kind: input.kind,
    targetLabelKo: input.targetLabelKo,
    payload: input.payload,
    status: "pending",
    submittedAt: new Date().toISOString(),
    epistemic: "observed",
  };

  writeAll([...readAll(), record]);

  const profile = getContributorProfile(input.businessId);
  const base = BASE_REWARD[input.kind];
  const reward = computeContributorRewardV2({
    baseRewardKrw: base,
    qualityMultiplier: profile?.qualityMultiplier ?? 1,
    difficulty: input.kind === "policy" ? 3 : 2,
    uniquenessScore: 0.65,
    usageWeight: 0.5,
  });

  recordContributorPayout({
    contributorId: input.businessId,
    kind: "business_supply",
    amountKrw: reward.amountKrw,
    summaryKo: `사업자 공급 · ${input.kind} · ${input.targetLabelKo}`,
    rewardFactors: reward.factors as unknown as Record<string, number>,
  });

  if (profile) {
    upsertContributorProfile({
      ...profile,
      totalEarnedKrw: profile.totalEarnedKrw + reward.amountKrw,
      tasksCompleted: profile.tasksCompleted + 1,
    });
  } else {
    upsertContributorProfile({
      contributorId: input.businessId,
      displayName: input.businessLabel,
      roles: ["business"],
      accuracyPct: 100,
      reliabilityTier: "new",
      qualityMultiplier: 1,
      totalEarnedKrw: reward.amountKrw,
      tasksCompleted: 1,
      verifierApproved: false,
    });
  }

  notifyRdnStoreUpdated();
  return record;
}

export function resetBusinessSupplyForTests(): void {
  memory.length = 0;
  counter = 0;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(SUPPLY_KEY);
    } catch {
      /* ignore */
    }
  }
}
