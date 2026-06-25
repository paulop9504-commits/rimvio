"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type PeerProfileAvatarProps = {
  displayName: string;
  avatarUrl?: string | null;
  /** data: URL — renders without network wait */
  instantSrc?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  priority?: boolean;
  className?: string;
};

const sizeClass = {
  xs: "size-8 text-xs",
  sm: "size-10 text-sm",
  md: "size-12 text-base",
  lg: "size-24 text-2xl",
};

export function PeerProfileAvatar({
  displayName,
  avatarUrl,
  instantSrc = null,
  size = "md",
  priority = false,
  className,
}: PeerProfileAvatarProps) {
  const initial = displayName.trim().charAt(0) || "?";
  const resolvedSrc = instantSrc ?? avatarUrl ?? null;
  const [ready, setReady] = useState(Boolean(instantSrc));

  useEffect(() => {
    setReady(Boolean(instantSrc));
  }, [instantSrc, avatarUrl]);

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-400/80 via-violet-400/80 to-fuchsia-400/80 font-semibold text-white",
        sizeClass[size],
        className,
      )}
    >
      {!ready && resolvedSrc ? (
        <span className="absolute inset-0 flex items-center justify-center">
          {initial}
        </span>
      ) : null}
      {resolvedSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedSrc}
          alt=""
          decoding={instantSrc ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
          loading={priority ? "eager" : "lazy"}
          onLoad={() => setReady(true)}
          className={cn(
            "size-full object-cover",
            !ready && "opacity-0",
            ready && "opacity-100",
          )}
        />
      ) : (
        initial
      )}
    </span>
  );
}
