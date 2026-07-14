/** Scout utterance normalize — shared by Entity Resolver + slot parsers. */
export function normalizeScoutUtterance(message: string): string {
  return message
    .trim()
    .replace(/찾어\s*줘/giu, "찾아줘")
    .replace(/찾어줘/giu, "찾아줘")
    .replace(/\s+/gu, " ");
}
