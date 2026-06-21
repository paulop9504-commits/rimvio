/** SHA-256 hex digest for capture dedupe (device index). */

export async function hashBlobSha256(blob: Blob): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return "";
  }
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashFileSha256(file: File): Promise<string> {
  return hashBlobSha256(file);
}
