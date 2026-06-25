/** Kakao-style instant avatars — local snapshot until network refresh. */

const MY_PROFILE_KEY = "rimvio:peer:my-profile";
const MY_PROFILE_AVATAR_DATA_KEY = "rimvio:peer:my-profile:avatar-data";
const PEER_AVATAR_PREFIX = "rimvio:peer:avatar:";
const PEER_AVATAR_DATA_PREFIX = "rimvio:peer:avatar-data:";
const MAX_AVATAR_DATA_BYTES = 120_000;

export type CachedMyProfile = {
  displayName: string | null;
  avatarUrl: string | null;
  updatedAt: string;
};

const inflightMyPrime = new Map<string, Promise<string | null>>();
const inflightPeerPrime = new Map<string, Promise<string | null>>();

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readCachedMyProfile(): CachedMyProfile | null {
  if (!canUseStorage()) {
    return null;
  }
  try {
    const raw = localStorage.getItem(MY_PROFILE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CachedMyProfile;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return {
      displayName:
        typeof parsed.displayName === "string" ? parsed.displayName : null,
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : null,
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeCachedMyProfile(input: {
  displayName?: string | null;
  avatarUrl?: string | null;
}): void {
  if (!canUseStorage()) {
    return;
  }
  const prev = readCachedMyProfile();
  const next: CachedMyProfile = {
    displayName:
      input.displayName !== undefined
        ? input.displayName
        : (prev?.displayName ?? null),
    avatarUrl:
      input.avatarUrl !== undefined ? input.avatarUrl : (prev?.avatarUrl ?? null),
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(MY_PROFILE_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function readCachedMyProfileAvatarData(): string | null {
  if (!canUseStorage()) {
    return null;
  }
  try {
    const raw = localStorage.getItem(MY_PROFILE_AVATAR_DATA_KEY);
    return raw?.startsWith("data:image/") ? raw : null;
  } catch {
    return null;
  }
}

function writeCachedMyProfileAvatarData(dataUrl: string | null): void {
  if (!canUseStorage()) {
    return;
  }
  try {
    if (dataUrl?.startsWith("data:image/")) {
      localStorage.setItem(MY_PROFILE_AVATAR_DATA_KEY, dataUrl);
    } else {
      localStorage.removeItem(MY_PROFILE_AVATAR_DATA_KEY);
    }
  } catch {
    /* quota */
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function fetchAvatarDataUrl(avatarUrl: string): Promise<string | null> {
  const response = await fetch(avatarUrl, {
    mode: "cors",
    credentials: "omit",
    cache: "force-cache",
  });
  if (!response.ok) {
    return null;
  }
  const blob = await response.blob();
  if (blob.size > MAX_AVATAR_DATA_BYTES) {
    return null;
  }
  const dataUrl = await blobToDataUrl(blob);
  return dataUrl.startsWith("data:image/") ? dataUrl : null;
}

/** Decode avatar to data URL — instant render on next Peers open (Kakao-style). */
export async function primeMyProfileAvatarCache(
  avatarUrl: string | null | undefined,
): Promise<string | null> {
  const url = avatarUrl?.trim();
  if (!url) {
    writeCachedMyProfileAvatarData(null);
    return null;
  }

  const cached = readCachedMyProfile();
  const existingData = readCachedMyProfileAvatarData();
  if (existingData && cached?.avatarUrl === url) {
    return existingData;
  }

  const inflight = inflightMyPrime.get(url);
  if (inflight) {
    return inflight;
  }

  const job = fetchAvatarDataUrl(url)
    .then((dataUrl) => {
      if (dataUrl) {
        writeCachedMyProfileAvatarData(dataUrl);
        writeCachedMyProfile({ avatarUrl: url });
      }
      return dataUrl;
    })
    .finally(() => {
      inflightMyPrime.delete(url);
    });

  inflightMyPrime.set(url, job);
  return job;
}

export function readCachedPeerAvatarData(userId: string): string | null {
  if (!canUseStorage() || !userId.trim()) {
    return null;
  }
  try {
    const raw = localStorage.getItem(`${PEER_AVATAR_DATA_PREFIX}${userId.trim()}`);
    return raw?.startsWith("data:image/") ? raw : null;
  } catch {
    return null;
  }
}

function writeCachedPeerAvatarData(userId: string, dataUrl: string | null): void {
  if (!canUseStorage() || !userId.trim()) {
    return;
  }
  const key = `${PEER_AVATAR_DATA_PREFIX}${userId.trim()}`;
  try {
    if (dataUrl?.startsWith("data:image/")) {
      localStorage.setItem(key, dataUrl);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    /* quota */
  }
}

export async function primePeerAvatarCache(input: {
  userId: string;
  avatarUrl: string | null | undefined;
}): Promise<string | null> {
  const userId = input.userId.trim();
  const url = input.avatarUrl?.trim();
  if (!userId || !url) {
    return null;
  }

  const existingData = readCachedPeerAvatarData(userId);
  const existingUrl = readCachedPeerAvatar(userId);
  if (existingData && existingUrl === url) {
    return existingData;
  }

  const inflightKey = `${userId}:${url}`;
  const inflight = inflightPeerPrime.get(inflightKey);
  if (inflight) {
    return inflight;
  }

  const job = fetchAvatarDataUrl(url)
    .then((dataUrl) => {
      if (dataUrl) {
        writeCachedPeerAvatarData(userId, dataUrl);
        writeCachedPeerAvatar(userId, url);
      }
      return dataUrl;
    })
    .finally(() => {
      inflightPeerPrime.delete(inflightKey);
    });

  inflightPeerPrime.set(inflightKey, job);
  return job;
}

/** App boot — profile API + avatar bytes before Peers tab opens. */
export async function warmMyProfileAvatarCacheFromProfile(profile: {
  displayName?: string | null;
  avatarUrl?: string | null;
}): Promise<void> {
  writeCachedMyProfile({
    displayName: profile.displayName ?? null,
    avatarUrl: profile.avatarUrl ?? null,
  });
  if (profile.avatarUrl?.trim()) {
    await primeMyProfileAvatarCache(profile.avatarUrl);
  }
}

export function readCachedPeerAvatar(userId: string): string | null {
  if (!canUseStorage() || !userId.trim()) {
    return null;
  }
  try {
    return localStorage.getItem(`${PEER_AVATAR_PREFIX}${userId.trim()}`);
  } catch {
    return null;
  }
}

export function writeCachedPeerAvatar(userId: string, avatarUrl: string | null): void {
  if (!canUseStorage() || !userId.trim()) {
    return;
  }
  const key = `${PEER_AVATAR_PREFIX}${userId.trim()}`;
  try {
    if (avatarUrl?.trim()) {
      localStorage.setItem(key, avatarUrl.trim());
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    /* quota */
  }
}

export function hydratePeerAvatarUrl(
  userId: string | null | undefined,
  avatarUrl: string | null | undefined,
): string | null {
  if (avatarUrl?.trim()) {
    return avatarUrl.trim();
  }
  if (!userId?.trim()) {
    return null;
  }
  return readCachedPeerAvatar(userId);
}

export function hydratePeerAvatarInstantSrc(
  userId: string | null | undefined,
  avatarUrl: string | null | undefined,
): string | null {
  if (userId?.trim()) {
    const data = readCachedPeerAvatarData(userId);
    if (data) {
      return data;
    }
  }
  return hydratePeerAvatarUrl(userId, avatarUrl);
}
