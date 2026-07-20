/**
 * Server-only seed-learning — shared aggregate (Supabase / memory+file).
 * Do not import from client components.
 */
export {
  ingestSeedLearningSharedDeltas,
  listSeedLearningSharedRollup,
  resetSeedLearningSharedMemoryForTests,
} from "@/lib/seed-learning/shared-aggregate-store";
