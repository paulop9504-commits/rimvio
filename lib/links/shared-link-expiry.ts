/** Default TTL for shared link handoff rows. */
export function sharedLinkExpiresAt(days = 7) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
