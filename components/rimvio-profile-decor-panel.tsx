"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RimvioProfilePhoto } from "@/components/rimvio-profile-photo";
import { useCopy } from "@/hooks/use-copy";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchMyAccountProfile,
  removeMyProfileCover,
  saveMyAccountProfile,
  syncMyProfileFromAuth,
  uploadMyProfileCover,
} from "@/lib/peer-chat/peer-chat-client";
import {
  PROFILE_COVER_THEMES,
  normalizeProfileCoverTheme,
  profileCoverThemeClass,
  type ProfileCoverTheme,
} from "@/lib/profile/profile-cover-themes";
import { resizeCoverImageFile } from "@/lib/profile/resize-profile-image";
import { cn } from "@/lib/utils";

type RimvioProfileDecorPanelProps = {
  className?: string;
  onChanged?: () => void;
};

const THEME_KEYS = Object.keys(PROFILE_COVER_THEMES) as ProfileCoverTheme[];

export function RimvioProfileDecorPanel({
  className,
  onChanged,
}: RimvioProfileDecorPanelProps) {
  const copy = useCopy();
  const ap = copy.settings.accountProfile;
  const { user } = useAuth();
  const googleAvatar =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    null;

  const coverInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverTheme, setCoverTheme] = useState<ProfileCoverTheme>("default");
  const [statusMessage, setStatusMessage] = useState("");
  const [savedStatus, setSavedStatus] = useState("");

  const load = useCallback(async () => {
    await syncMyProfileFromAuth().catch(() => {});
    const profile = await fetchMyAccountProfile();
    setDisplayName(profile.displayName ?? "");
    setAvatarUrl(profile.avatarUrl ?? null);
    setCoverUrl(profile.coverUrl ?? null);
    setCoverTheme(normalizeProfileCoverTheme(profile.coverTheme));
    const status = profile.statusMessage ?? "";
    setStatusMessage(status);
    setSavedStatus(status);
  }, []);

  useEffect(() => {
    void load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  const pickCover = () => {
    if (busy) {
      return;
    }
    coverInputRef.current?.click();
  };

  const onCoverFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setBusy(true);
    try {
      const resized = await resizeCoverImageFile(file);
      const { coverUrl: next } = await uploadMyProfileCover(resized);
      setCoverUrl(next);
      toast.success(ap.coverPhotoChanged);
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : ap.saveFailed);
    } finally {
      setBusy(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    }
  };

  const removeCover = async () => {
    if (busy || !coverUrl) {
      return;
    }
    setBusy(true);
    try {
      await removeMyProfileCover();
      setCoverUrl(null);
      toast.success(ap.coverPhotoRemoved);
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : ap.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const applyTheme = async (theme: ProfileCoverTheme) => {
    if (busy || theme === coverTheme) {
      return;
    }
    setBusy(true);
    try {
      await saveMyAccountProfile({ coverTheme: theme });
      setCoverTheme(theme);
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : ap.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const saveStatus = async () => {
    const trimmed = statusMessage.trim();
    if (trimmed === savedStatus.trim()) {
      return;
    }
    setBusy(true);
    try {
      const result = await saveMyAccountProfile(
        trimmed ? { statusMessage: trimmed } : { clearStatusMessage: true },
      );
      const next = result.statusMessage ?? "";
      setStatusMessage(next);
      setSavedStatus(next);
      toast.success(ap.statusSaved);
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : ap.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {ap.loading}
      </p>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="overflow-hidden rounded-2xl bg-[#f2f4f6]">
        <div className="relative">
          <div
            className={cn(
              "relative h-32 w-full overflow-hidden",
              !coverUrl && profileCoverThemeClass(coverTheme),
            )}
          >
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" className="size-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/20" />
            <button
              type="button"
              disabled={busy}
              onClick={pickCover}
              className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm active:bg-black/50 disabled:opacity-40"
              aria-label={ap.coverPhotoAdd}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Camera className="size-4" aria-hidden />
              )}
            </button>
          </div>
          <div className="absolute bottom-0 left-4 translate-y-1/2">
            <RimvioProfilePhoto
              avatarUrl={avatarUrl}
              displayName={displayName}
              fallbackImageUrl={googleAvatar}
              editable
              size="md"
              showHint={false}
              className="gap-0 [&_button]:ring-4 [&_button]:ring-white"
              onAvatarChange={(url) => {
                setAvatarUrl(url);
                onChanged?.();
              }}
            />
          </div>
        </div>
        <div className="px-4 pb-4 pt-12">
          <p className="truncate text-[16px] font-semibold text-[#191f28]">
            {displayName.trim() || ap.noDisplayName}
          </p>
          {statusMessage.trim() ? (
            <p className="mt-0.5 truncate text-[13px] text-[#6b7684]">
              {statusMessage.trim()}
            </p>
          ) : null}
        </div>
      </div>

      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => void onCoverFile(e.target.files?.[0])}
      />

      <div className="space-y-2">
        <p className="text-[12px] font-medium text-muted-foreground">
          {ap.coverThemeLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {THEME_KEYS.map((theme) => (
            <button
              key={theme}
              type="button"
              disabled={busy}
              onClick={() => void applyTheme(theme)}
              className={cn(
                "size-10 rounded-full ring-2 ring-offset-2 ring-offset-rimvio-surface transition",
                PROFILE_COVER_THEMES[theme],
                coverTheme === theme
                  ? "ring-[#3182f6]"
                  : "ring-transparent opacity-90",
              )}
              aria-label={ap.coverThemeName(theme)}
              aria-pressed={coverTheme === theme}
            />
          ))}
        </div>
      </div>

      {coverUrl ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void removeCover()}
          className="text-[12px] font-medium text-muted-foreground underline-offset-2 hover:underline disabled:opacity-40"
        >
          {ap.coverPhotoRemove}
        </button>
      ) : null}

      <label className="block">
        <span className="text-[12px] font-medium text-muted-foreground">
          {ap.statusMessageLabel}
        </span>
        <input
          value={statusMessage}
          onChange={(e) => setStatusMessage(e.target.value)}
          onBlur={() => void saveStatus()}
          maxLength={60}
          placeholder={ap.statusMessagePlaceholder}
          className="mt-1.5 h-11 w-full rounded-xl border-0 bg-rimvio-surface-muted px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-white/10"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {ap.statusMessageHint}
        </p>
      </label>
    </div>
  );
}
