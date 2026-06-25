"use client";

import { cn } from "@/lib/utils";
import {
  normalizeProfileCoverTheme,
  profileCoverThemeClass,
  type ProfileCoverTheme,
} from "@/lib/profile/profile-cover-themes";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";

type RimvioProfileDecorHeaderProps = {
  displayName: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  coverTheme?: string | null;
  statusMessage?: string | null;
  className?: string;
  compact?: boolean;
  hideAvatar?: boolean;
};

export function RimvioProfileDecorHeader({
  displayName,
  avatarUrl,
  coverUrl,
  coverTheme,
  statusMessage,
  className,
  compact = false,
  hideAvatar = false,
}: RimvioProfileDecorHeaderProps) {
  const theme = normalizeProfileCoverTheme(coverTheme);
  const coverClass = profileCoverThemeClass(theme);
  const status = statusMessage?.trim();

  return (
    <div className={cn("overflow-hidden rounded-2xl bg-[#f2f4f6]", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden",
          compact ? "h-24" : "h-32",
          !coverUrl && coverClass,
        )}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="size-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/25" />
      </div>
      <div className={cn("relative px-4", compact ? "pb-3 pt-0" : "pb-4 pt-0")}>
        {!hideAvatar ? (
          <div className={cn("absolute left-4", compact ? "-top-8" : "-top-10")}>
            <PeerProfileAvatar
              displayName={displayName}
              avatarUrl={avatarUrl}
              size="md"
              className="ring-4 ring-white"
            />
          </div>
        ) : null}
        <div className={cn(hideAvatar ? "pt-2" : compact ? "pt-10" : "pt-12")}>
          <p className="truncate text-[16px] font-semibold text-[#191f28]">
            {displayName}
          </p>
          {status ? (
            <p className="mt-0.5 truncate text-[13px] text-[#6b7684]">{status}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export type { ProfileCoverTheme };
