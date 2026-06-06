/** "민수와 함께" / "철수와 함께" — natural peer suffix for feed context. */
export function formatPeerWithLabel(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "";
  }
  return `${trimmed}와 함께`;
}
