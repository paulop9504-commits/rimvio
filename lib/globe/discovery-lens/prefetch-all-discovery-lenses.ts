import { findLifeEventCandidate } from "@/lib/life-read-model";
import { dispatchGlobeResourceReelFocus } from "@/lib/globe/resource-reel/globe-resource-reel-bridge";
import { buildDiscoveryLensPrefetchReadyAnnouncement } from "@/lib/globe/discovery-lens/build-discovery-lens-announcements";
import {
  publishDiscoveryLensSession,
  readDiscoveryLensSession,
} from "@/lib/globe/discovery-lens/lens-session-bridge";
import { prefetchDiscoveryLensBundle } from "@/lib/globe/discovery-lens/prefetch-discovery-lens-bundle";
import type {
  DiscoveryLensId,
  DiscoveryLensSession,
  LensPrefetchBundle,
} from "@/lib/globe/discovery-lens/types";
import { readActiveDiscoveryLens } from "@/lib/globe/discovery-lens/types";
const loadingBundle = (): LensPrefetchBundle => ({
  status: "loading",
  updatedAtIso: new Date().toISOString(),
  items: [],
});

export function patchDiscoveryLensPrefetch(input: {
  session: DiscoveryLensSession;
  lensId: DiscoveryLensId;
  prefetch: LensPrefetchBundle;
}): DiscoveryLensSession {
  return {
    ...input.session,
    lenses: input.session.lenses.map((lens) =>
      lens.id === input.lensId ? { ...lens, prefetch: input.prefetch } : lens,
    ),
    updatedAtIso: new Date().toISOString(),
  };
}

export function markAllLensPrefetchLoading(
  session: DiscoveryLensSession,
): DiscoveryLensSession {
  return {
    ...session,
    lenses: session.lenses.map((lens) => ({
      ...lens,
      prefetch: loadingBundle(),
    })),
    updatedAtIso: new Date().toISOString(),
  };
}

export async function prefetchDiscoveryLensById(input: {
  contextEventId: string;
  lensId: DiscoveryLensId;
  /** Bulk prefetch — skip per-lens assistant announce. */
  silent?: boolean;
}): Promise<{
  session: DiscoveryLensSession | null;
  announceKo: string | null;
}> {
  const session = readDiscoveryLensSession(input.contextEventId);
  const event = findLifeEventCandidate(input.contextEventId);
  const lens = session?.lenses.find((row) => row.id === input.lensId);
  if (!session || !event || !lens) {
    return { session, announceKo: null };
  }

  let current = patchDiscoveryLensPrefetch({
    session,
    lensId: input.lensId,
    prefetch: loadingBundle(),
  });
  publishDiscoveryLensSession(current);

  const prefetch = await prefetchDiscoveryLensBundle({ event, lens });
  current = patchDiscoveryLensPrefetch({
    session: readDiscoveryLensSession(input.contextEventId) ?? current,
    lensId: input.lensId,
    prefetch,
  });
  publishDiscoveryLensSession(current);

  const updatedLens = current.lenses.find((row) => row.id === input.lensId);
  const announceKo =
    input.silent || !updatedLens
      ? null
      : current.activeLensId === input.lensId
        ? buildDiscoveryLensPrefetchReadyAnnouncement({
            lens: updatedLens,
            bundle: prefetch,
          })
        : null;

  return { session: current, announceKo };
}

export async function prefetchAllDiscoveryLenses(input: {
  contextEventId: string;
}): Promise<string | null> {
  const session = readDiscoveryLensSession(input.contextEventId);
  const event = findLifeEventCandidate(input.contextEventId);
  if (!session || !event || session.lenses.length === 0) {
    return null;
  }

  publishDiscoveryLensSession(markAllLensPrefetchLoading(session));

  await Promise.all(
    session.lenses.map((lens) =>
      prefetchDiscoveryLensById({
        contextEventId: input.contextEventId,
        lensId: lens.id,
        silent: true,
      }),
    ),
  );

  const final = readDiscoveryLensSession(input.contextEventId);
  const active = readActiveDiscoveryLens(final);
  if (!final || !active?.prefetch) {
    return null;
  }

  const announceKo = buildDiscoveryLensPrefetchReadyAnnouncement({
    lens: active,
    bundle: active.prefetch,
  });

  if (active.prefetch.status === "ready" && active.prefetch.items.length > 0) {
    dispatchGlobeResourceReelFocus({
      contextEventId: input.contextEventId,
      surface: "list",
      source: "scout_complete",
    });
  }

  return announceKo;
}

export function lensPrefetchCountLabel(
  bundle: LensPrefetchBundle | null | undefined,
): string | null {
  if (!bundle || bundle.status === "loading") {
    return null;
  }
  if (bundle.status === "empty" || bundle.items.length === 0) {
    return "0";
  }
  return String(bundle.items.length);
}
