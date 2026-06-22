/** SHA-256 hex digest for capture dedupe (device index). */

import { isConstrainedMobileDevice } from "@/lib/platform/device";

const CHUNK_BYTES = 1024 * 1024;

export async function hashBlobSha256(blob: Blob): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return "";
  }
  if (isConstrainedMobileDevice() && blob.size > CHUNK_BYTES * 2) {
    return hashBlobSha256Chunked(blob);
  }
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return bytesToHex(digest);
}

async function hashBlobSha256Chunked(blob: Blob): Promise<string> {
  const chunks: Uint8Array[] = [];
  let offset = 0;
  while (offset < blob.size) {
    const slice = blob.slice(offset, offset + CHUNK_BYTES);
    chunks.push(new Uint8Array(await slice.arrayBuffer()));
    offset += CHUNK_BYTES;
  }
  const merged = new Uint8Array(chunks.reduce((sum, row) => sum + row.length, 0));
  let writeAt = 0;
  for (const row of chunks) {
    merged.set(row, writeAt);
    writeAt += row.length;
  }
  const digest = await crypto.subtle.digest("SHA-256", merged.buffer);
  return bytesToHex(digest);
}

function bytesToHex(digest: ArrayBuffer): string {
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashFileSha256(file: File): Promise<string> {
  if (
    isConstrainedMobileDevice() &&
    typeof requestIdleCallback === "function"
  ) {
    return new Promise((resolve) => {
      requestIdleCallback(
        () => {
          void hashBlobSha256(file).then(resolve);
        },
        { timeout: 8_000 },
      );
    });
  }
  return hashBlobSha256(file);
}
