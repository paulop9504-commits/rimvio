/** @deprecated use task-pool.ts — backward-compatible re-export */
export {
  applyVerifierApplication,
  applyVerifierResponse,
  createRealityTask,
  getContributorProfile,
  getRealityTask,
  readContributorProfiles,
  readDataSubmissions,
  readRealityTasks,
  readVerifierResponses,
  resetRealityDataNetworkForTests,
  submitRealityData,
  upsertContributorProfile,
  RDN_STORE_UPDATED,
  notifyRdnStoreUpdated,
} from "@/lib/reality-data-network/task-pool";
