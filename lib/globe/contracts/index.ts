/** Scout contract gate — @see docs/RIMVIO_CONTRACT_SCHEMA.md */

export {
  buildScoutContractId,
  reelKindAllowedForCategory,
  scoutCategoryFromSpec,
  scoutCategoryToReelKind,
  scoutContractToSpec,
  withScoutAnchorRef,
  withScoutOutputRef,
  wrapScoutContract,
  type ScoutContract,
  type ScoutContractAnchorRef,
  type ScoutContractCategory,
  type ScoutContractLens,
  type ScoutContractOutputRef,
} from "@/lib/globe/contracts/scout-contract";

export {
  clearScoutContract,
  clearScoutSelectedAnchor,
  readScoutContract,
  readScoutSelectedAnchor,
  writeScoutContract,
  writeScoutSelectedAnchor,
  type ScoutSelectedAnchorWire,
} from "@/lib/globe/contracts/scout-contract-store";

export {
  assertScoutAnchorRef,
  assertScoutContractGate,
  assertScoutOutputKinds,
  assertScoutReelSource,
  primaryScoutViolationMessage,
  type ScoutContractAssertResult,
  type ScoutContractViolation,
  type ScoutContractViolationCode,
} from "@/lib/globe/contracts/assert-scout-contract";
