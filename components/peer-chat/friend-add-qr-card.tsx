"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { buildFriendAddQrUrl } from "@/lib/peer-chat/friend-add-qr-url";
import { cn } from "@/lib/utils";

type FriendAddQrCardProps = {
  displayName: string;
  avatarUrl?: string | null;
  userId: string;
  className?: string;
};

export function FriendAddQrCard({
  displayName,
  avatarUrl,
  userId,
  className,
}: FriendAddQrCardProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = buildFriendAddQrUrl({
      userId,
      origin: typeof window !== "undefined" ? window.location.origin : undefined,
    });
    void import("qrcode")
      .then((QR) =>
        QR.toDataURL(url, {
          width: 220,
          margin: 1,
          color: { dark: "#191f28", light: "#ffffff" },
        }),
      )
      .then((next) => {
        if (!cancelled) {
          setDataUrl(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDataUrl(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#e5e8eb] bg-white px-4 py-5 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <PeerProfileAvatar displayName={displayName} avatarUrl={avatarUrl} size="md" />
        <p className="text-[16px] font-semibold text-[#191f28]">{displayName}</p>
        <div className="flex size-[220px] items-center justify-center rounded-xl bg-white p-2 ring-1 ring-[#e5e8eb]">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="" className="size-full object-contain" />
          ) : (
            <Loader2 className="size-8 animate-spin text-[#8b95a1]" aria-hidden />
          )}
        </div>
      </div>
    </div>
  );
}
