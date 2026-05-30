"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  GlangoAvatarMark,
  labelForAvatarVariant,
} from "@/lib/brand/glango-smiley-mark";
import { isRarePurpleVariant } from "@/lib/brand/glango-avatar-colors";
import type { GlangoAvatarVariantId } from "@/lib/brand/glango-avatar-colors";
import { useCopy } from "@/hooks/use-copy";
import { IOS } from "@/lib/ui/ios-surface";
import {
  getRoomGuest,
  ROOM_GUEST_UPDATED,
  updateRoomGuest,
} from "@/lib/rooms/guest-session";
import { cn } from "@/lib/utils";

export function SettingsProfilePanel({ className }: { className?: string }) {
  const copy = useCopy();
  const [label, setLabel] = useState("");
  const [avatarVariant, setAvatarVariant] = useState<GlangoAvatarVariantId | null>(null);
  const [avatarDrawn, setAvatarDrawn] = useState(false);

  const sync = useCallback(() => {
    const guest = getRoomGuest();
    setLabel(guest.label);
    setAvatarVariant(guest.avatarVariant);
    setAvatarDrawn(guest.avatarDrawn);
  }, []);

  useEffect(() => {
    sync();
    const onUpdate = () => sync();
    window.addEventListener(ROOM_GUEST_UPDATED, onUpdate);
    return () => window.removeEventListener(ROOM_GUEST_UPDATED, onUpdate);
  }, [sync]);

  const saveLabel = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      sync();
      return;
    }

    updateRoomGuest({ label: trimmed });
    toast.success(copy.settings.profileSaved);
  };

  const rare = avatarVariant ? isRarePurpleVariant(avatarVariant) : false;

  return (
    <section className={cn("p-4", IOS.cardSm, className)}>
      <h2 className="text-sm font-semibold">{copy.settings.profileTitle}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {copy.settings.profileHint}
      </p>

      {!avatarDrawn ? (
        <p className="mt-4 rounded-2xl bg-[#f2f2f7] px-3 py-3 text-xs leading-relaxed text-muted-foreground">
          {copy.settings.drawPendingProfile}
        </p>
      ) : (
        <div className="mt-4 flex items-center gap-3">
          <span
            className={cn(
              "flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/[0.06]",
              rare && "ring-2 ring-violet-400/60"
            )}
            aria-hidden
          >
            <GlangoAvatarMark variant={avatarVariant} pixels={52} crisp />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-muted-foreground">
              {copy.settings.profileAvatarLabel}
            </p>
            <p className="mt-0.5 text-sm font-semibold">
              {avatarVariant ? `${labelForAvatarVariant(avatarVariant)} 글랑고` : ""}
            </p>
            {rare ? (
              <p className="mt-1 text-[11px] font-medium text-violet-600">
                {copy.settings.profileRarePurple}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {copy.settings.profileAvatarFixed}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-4">
        <label htmlFor="settings-profile-name" className="text-[11px] font-medium text-muted-foreground">
          {copy.settings.profileNameLabel}
        </label>
        <input
          id="settings-profile-name"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onBlur={saveLabel}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          maxLength={20}
          placeholder={copy.settings.profileNamePlaceholder}
          className={cn(
            "mt-1 h-11 w-full rounded-2xl border-0 bg-[#f2f2f7] px-4 text-sm outline-none",
            "focus:ring-2 focus:ring-[#007AFF]/30"
          )}
        />
      </div>
    </section>
  );
}
