export type { MemoryTier, MemoryEntry, CrossContextPreference, MemoryQuery } from "@/lib/reality-memory/types";
export { addWorkingMemory, queryWorkingMemory, clearWorkingMemory, getWorkingMemorySize } from "@/lib/reality-memory/working-memory";
export { addSessionMemory, querySessionMemory, clearSessionMemory } from "@/lib/reality-memory/session-memory";
export { addProjectMemory, queryProjectMemory, clearProjectMemory } from "@/lib/reality-memory/project-memory";
export { learnPreference, queryPreferences, getPreference, clearPreferences } from "@/lib/reality-memory/cross-context-memory";
export { compressWorkingMemory, type CompressedSummary } from "@/lib/reality-memory/compress-memory";
