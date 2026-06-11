/** Personal experience visibility — external share is Phase 2. */
export const GLOBE_CONTEXT_VISIBILITY_PRIVATE = "private" as const;

export type GlobeContextVisibility = typeof GLOBE_CONTEXT_VISIBILITY_PRIVATE;

export function defaultGlobeContextVisibilityMetadata(): {
  globeContextVisibility: GlobeContextVisibility;
} {
  return { globeContextVisibility: GLOBE_CONTEXT_VISIBILITY_PRIVATE };
}
