/**
 * Personal globe memory — local hashed embeddings (no provider API).
 * Scope: my EventCandidate / Capture chunks only.
 */

const EMBED_DIM = 64;

function clamp01(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

/** Stable token → bucket hash (FNV-1a style). */
function hashToken(token: string): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % EMBED_DIM;
}

export function tokenizeMemoryText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

/** Bag-of-tokens → fixed hashed vector (L2-normalized). */
export function embedMemoryText(text: string): number[] {
  const vec = new Array<number>(EMBED_DIM).fill(0);
  const tokens = tokenizeMemoryText(text);
  if (tokens.length === 0) {
    return vec;
  }
  for (const token of tokens) {
    vec[hashToken(token)]! += 1;
  }
  let norm = 0;
  for (const value of vec) {
    norm += value * value;
  }
  const scale = norm > 0 ? 1 / Math.sqrt(norm) : 0;
  if (scale === 0) {
    return vec;
  }
  return vec.map((value) => value * scale);
}

export function cosineSimilarity(
  left: readonly number[],
  right: readonly number[],
): number {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0;
  }
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let i = 0; i < left.length; i += 1) {
    const a = left[i] ?? 0;
    const b = right[i] ?? 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  if (leftNorm <= 0 || rightNorm <= 0) {
    return 0;
  }
  return clamp01(dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm)));
}

export const PERSONAL_MEMORY_EMBED_DIM = EMBED_DIM;
