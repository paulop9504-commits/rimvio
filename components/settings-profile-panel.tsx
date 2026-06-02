"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import { IOS } from "@/lib/ui/ios-surface";
import {
  getRoomGuest,
  ROOM_GUEST_UPDATED,
  updateRoomGuest,
} from "@/lib/rooms/guest-session";
import { cn } from "@/lib/utils";

/** Display name only — no avatar / gacha UI. */
export function SettingsProfilePanel({ className }: { className?: string }) {
  const copy = useCopy();
  const [label, setLabel] = useState("");

  const sync = useCallback(() => {
    setLabel(getRoomGuest().label);
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

  return (
    <section className={cn("p-4", IOS.cardSm, className)}>
      <h2 className="text-sm font-semibold">{copy.settings.profileNameSectionTitle}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {copy.settings.profileNameSectionHint}
      </p>
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
            "mt-1 h-11 w-full rounded-2xl border-0 bg-glango-surface-muted px-4 text-sm outline-none",
            "focus:ring-2 focus:ring-[#007AFF]/30",
          )}
        />
      </div>
    </section>
  );
}
