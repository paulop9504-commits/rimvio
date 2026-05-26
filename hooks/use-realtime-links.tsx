"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { toast } from "sonner";
import { readLocalLinks } from "@/lib/local-links/store";
import {
  normalizeLinkUrl,
  readPinnedUrl,
} from "@/lib/local-links/pinned-link";
import { tryCreateClient } from "@/lib/supabase/client";
import {
  filterActiveLinks,
  filterArchivedLinks,
} from "@/lib/utils/link-archive";
import type { LinkRow } from "@/types/database";

const LINKS_TABLE = "links";
const LINKS_CHANNEL = "links-feed";

type RealtimePayload = RealtimePostgresChangesPayload<LinkRow>;

function sortLinks(links: LinkRow[]) {
  return [...links].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function prioritizePinnedLinks(links: LinkRow[]) {
  const pinned = readPinnedUrl();
  if (!pinned) {
    return links;
  }

  const normalizedPinned = normalizeLinkUrl(pinned);
  const index = links.findIndex(
    (link) => normalizeLinkUrl(link.original_url) === normalizedPinned
  );

  if (index <= 0) {
    return links;
  }

  const next = [...links];
  const [pinnedLink] = next.splice(index, 1);
  return [pinnedLink, ...next];
}

function isOptimisticId(id: string) {
  return id.startsWith("optimistic-");
}

function applyRealtimeChange(
  links: LinkRow[],
  payload: RealtimePayload,
  optimisticIds: Set<string>
): LinkRow[] {
  if (payload.eventType === "INSERT" && payload.new) {
    const withoutDuplicate = links.filter((link) => link.id !== payload.new.id);

    const optimisticMatchIndex = withoutDuplicate.findIndex(
      (link) =>
        isOptimisticId(link.id) &&
        (link.original_url === payload.new.original_url ||
          optimisticIds.has(link.id))
    );

    if (optimisticMatchIndex >= 0) {
      const matched = withoutDuplicate[optimisticMatchIndex];
      optimisticIds.delete(matched.id);
      const next = [...withoutDuplicate];
      next[optimisticMatchIndex] = payload.new;
      return sortLinks(next);
    }

    return sortLinks([payload.new, ...withoutDuplicate]);
  }

  if (payload.eventType === "UPDATE" && payload.new) {
    return sortLinks(
      links.map((link) => (link.id === payload.new.id ? payload.new : link))
    );
  }

  if (payload.eventType === "DELETE" && payload.old?.id) {
    optimisticIds.delete(payload.old.id);
    return links.filter((link) => link.id !== payload.old.id);
  }

  return links;
}

type RealtimeLinksContextValue = {
  links: LinkRow[];
  activeLinks: LinkRow[];
  archivedLinks: LinkRow[];
  addOptimisticLink: (link: LinkRow) => void;
  removeOptimisticLink: (id: string) => void;
};

const RealtimeLinksContext = createContext<RealtimeLinksContextValue | null>(
  null
);

type RealtimeLinksProviderProps = {
  initialLinks: LinkRow[];
  children: ReactNode;
};

export function RealtimeLinksProvider({
  initialLinks,
  children,
}: RealtimeLinksProviderProps) {
  const [links, setLinks] = useState(initialLinks);
  const [now, setNow] = useState(() => Date.now());
  const optimisticIdsRef = useRef<Set<string>>(new Set());
  const supabase = useMemo(() => tryCreateClient(), []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setLinks(initialLinks);
    optimisticIdsRef.current.clear();
  }, [initialLinks]);

  useEffect(() => {
    const localLinks = readLocalLinks();
    if (!localLinks.length) {
      return;
    }

    setLinks((current) => {
      const localUrls = new Set(localLinks.map((link) => link.original_url));
      const withoutDuplicates = current.filter(
        (link) => !localUrls.has(link.original_url)
      );

      return sortLinks([...localLinks, ...withoutDuplicates]);
    });
  }, []);

  const addOptimisticLink = useCallback((link: LinkRow) => {
    optimisticIdsRef.current.add(link.id);
    setLinks((current) =>
      sortLinks([link, ...current.filter((item) => item.id !== link.id)])
    );
  }, []);

  const removeOptimisticLink = useCallback((id: string) => {
    optimisticIdsRef.current.delete(id);
    setLinks((current) => current.filter((link) => link.id !== id));
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let channel: RealtimeChannel;

    const subscribe = () => {
      channel = supabase
        .channel(LINKS_CHANNEL)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: LINKS_TABLE },
          (payload) => {
            const typedPayload = payload as RealtimePayload;

            setLinks((current) =>
              applyRealtimeChange(
                current,
                typedPayload,
                optimisticIdsRef.current
              )
            );

            if (typedPayload.eventType === "INSERT" && typedPayload.new) {
              toast("New link saved", {
                description: typedPayload.new.title,
              });
            }
          }
        )
        .subscribe();
    };

    subscribe();

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [supabase]);

  const activeLinks = useMemo(
    () => prioritizePinnedLinks(filterActiveLinks(links, now)),
    [links, now]
  );

  const archivedLinks = useMemo(
    () => filterArchivedLinks(links, now),
    [links, now]
  );

  const value = useMemo(
    () => ({
      links,
      activeLinks,
      archivedLinks,
      addOptimisticLink,
      removeOptimisticLink,
    }),
    [links, activeLinks, archivedLinks, addOptimisticLink, removeOptimisticLink]
  );

  return (
    <RealtimeLinksContext.Provider value={value}>
      {children}
    </RealtimeLinksContext.Provider>
  );
}

export function useRealtimeLinks() {
  const context = useContext(RealtimeLinksContext);

  if (!context) {
    throw new Error("useRealtimeLinks must be used within RealtimeLinksProvider");
  }

  return context;
}

export function useRealtimeLinksOptional() {
  return useContext(RealtimeLinksContext);
}
