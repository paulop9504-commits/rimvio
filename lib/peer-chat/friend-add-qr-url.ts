const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/** QR / deep link — stable per account (no @ handle required in UI). */
export function buildFriendAddQrUrl(input: {
  userId: string;
  origin?: string;
}): string {
  const base = (input.origin ?? "").replace(/\/$/, "") || "https://rimvio.com";
  return `${base}/peers/add?uid=${encodeURIComponent(input.userId.trim())}`;
}

export function isFriendAddUserId(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

/** Parse scanned QR text or pasted link → lookup contact key. */
export function parseFriendAddQrPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      const uid = url.searchParams.get("uid")?.trim();
      if (uid && isFriendAddUserId(uid)) {
        return uid;
      }
      const rimvio =
        url.searchParams.get("rimvio")?.trim() ||
        url.searchParams.get("id")?.trim();
      if (rimvio) {
        return rimvio.replace(/^@+/u, "");
      }
      const pathTail = url.pathname.match(/\/peers\/add\/([^/?#]+)/u)?.[1];
      if (pathTail) {
        return decodeURIComponent(pathTail).replace(/^@+/u, "");
      }
    } catch {
      return null;
    }
    return null;
  }

  if (isFriendAddUserId(trimmed)) {
    return trimmed;
  }

  return trimmed.replace(/^@+/u, "") || null;
}
