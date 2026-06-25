"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { PEERS_CHAT_LIST } from "@/lib/peer-chat/peers-chat-list-density";
import {
  fetchMyAccountProfile,
  syncMyProfileFromAuth,
} from "@/lib/peer-chat/peer-chat-client";
import {
  primeMyProfileAvatarCache,
  readCachedMyProfile,
  readCachedMyProfileAvatarData,
  warmMyProfileAvatarCacheFromProfile,
} from "@/lib/peer-chat/peer-profile-avatar-cache";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

type PeerFriendsTopBarProps = {
  onOpenProfile: () => void;
  onAddFriend: () => void;
  searchOpen: boolean;
  onSearchToggle: () => void;
  refreshKey?: number;
  className?: string;
};

export function PeerFriendsTopBar({
  onOpenProfile,
  onAddFriend,
  searchOpen,
  onSearchToggle,
  refreshKey = 0,
  className,
}: PeerFriendsTopBarProps) {
  const copy = useCopy();
  const rail = copy.peers.friendRail;
  const ap = copy.settings.accountProfile;
  const cachedProfile = readCachedMyProfile();
  const [displayName, setDisplayName] = useState(
    () => cachedProfile?.displayName?.trim() ?? "",
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    () => cachedProfile?.avatarUrl ?? null,
  );
  const [avatarInstantSrc, setAvatarInstantSrc] = useState<string | null>(
    () => readCachedMyProfileAvatarData(),
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await syncMyProfileFromAuth().catch(() => {});
        const profile = await fetchMyAccountProfile();
        if (cancelled) {
          return;
        }
        const nextName = profile.displayName ?? "";
        const nextAvatar = profile.avatarUrl ?? null;
        setDisplayName(nextName);
        setAvatarUrl(nextAvatar);
        await warmMyProfileAvatarCacheFromProfile(profile);
        if (cancelled) {
          return;
        }
        const instant =
          readCachedMyProfileAvatarData() ??
          (nextAvatar ? await primeMyProfileAvatarCache(nextAvatar) : null);
        if (!cancelled && instant) {
          setAvatarInstantSrc(instant);
        }
      } catch {
        /* keep cached snapshot */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    const cached = readCachedMyProfile();
    if (!cached?.avatarUrl?.trim() || readCachedMyProfileAvatarData()) {
      return;
    }
    void primeMyProfileAvatarCache(cached.avatarUrl).then((instant) => {
      if (instant) {
        setAvatarInstantSrc(instant);
      }
    });
  }, []);

  const name = displayName.trim() || ap.noDisplayName;

  return (
    <header
      className={cn(PEERS_CHAT_LIST.topBar, className)}
      data-peer-friends-top-bar
    >
      <div className={PEERS_CHAT_LIST.topBarRow}>
        <button
          type="button"
          onClick={onOpenProfile}
          className={PEERS_CHAT_LIST.profileBtn}
          aria-label={rail.myProfileAria}
        >
          <PeerProfileAvatar
            displayName={name}
            avatarUrl={avatarUrl}
            instantSrc={avatarInstantSrc}
            size="sm"
            priority
          />
          <span className={PEERS_CHAT_LIST.profileName}>{name}</span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onSearchToggle}
            className={PEERS_CHAT_LIST.iconBtn}
            aria-label={rail.searchAria}
            aria-pressed={searchOpen}
          >
            <Search className="size-[22px] stroke-[1.75]" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onAddFriend}
            className={PEERS_CHAT_LIST.iconBtn}
            aria-label={copy.peers.friendAdd.listCta}
          >
            <UserPlus className="size-[22px] stroke-[1.75]" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
