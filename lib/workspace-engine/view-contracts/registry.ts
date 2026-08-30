/**
 * View Contract registry — discovery SSOT for View extensions.
 */

import { MAP_VIEW_CONTRACT } from "@/lib/workspace-engine/view-contracts/map-view-contract";
import type { ViewContractKind, ViewContractSpec } from "@/lib/workspace-engine/view-contracts/types";

const CONTRACTS: Partial<Record<ViewContractKind, ViewContractSpec>> = {
  map: MAP_VIEW_CONTRACT,
};

export function resolveViewContract(kind: ViewContractKind): ViewContractSpec | null {
  return CONTRACTS[kind] ?? null;
}

export function listViewContracts(): readonly ViewContractSpec[] {
  return Object.values(CONTRACTS).filter(Boolean) as ViewContractSpec[];
}
