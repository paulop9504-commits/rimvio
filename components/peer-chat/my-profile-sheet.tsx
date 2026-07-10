"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Share2, X } from "lucide-react";
import { toast } from "sonner";
import { FriendAddQrCard } from "@/components/peer-chat/friend-add-qr-card";
import { RimvioAccountProfilePanel } from "@/components/rimvio-account-profile-panel";
import { IdentityVaultSettingsPanel } from "@/components/settings/identity-vault-settings-panel";
import { PaymentVaultSettingsPanel } from "@/components/settings/payment-vault-settings-panel";
import { RimvioProfileDecorPanel } from "@/components/rimvio-profile-decor-panel";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import { buildFriendAddQrUrl } from "@/lib/peer-chat/friend-add-qr-url";
import { fetchMyAccountProfile } from "@/lib/peer-chat/peer-chat-client";
import {
  readCachedMyProfile,
  writeCachedMyProfile,
} from "@/lib/peer-chat/peer-profile-avatar-cache";
import { cn } from "@/lib/utils";

type MyProfileSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  /** Scroll/focus identity vault block when opened from checkout. */
  identityVaultFocus?: boolean;
  /** Scroll/focus payment vault block when opened from express checkout. */
  paymentVaultFocus?: boolean;
};

export function MyProfileSheet({
  open,
  onOpenChange,
  onSaved,
  identityVaultFocus = false,
  paymentVaultFocus = false,
}: MyProfileSheetProps) {
  const copy = useCopy();
  const ap = copy.settings.accountProfile;
  const fa = copy.peers.friendAdd;
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [profileName, setProfileName] = useState(
    () => readCachedMyProfile()?.displayName?.trim() || "",
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    () => readCachedMyProfile()?.avatarUrl ?? null,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !identityVaultFocus) {
      return;
    }
    const timer = window.setTimeout(() => {
      document
        .querySelector("[data-identity-vault-settings]")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open, identityVaultFocus]);

  useEffect(() => {
    if (!open || !paymentVaultFocus) {
      return;
    }
    const timer = window.setTimeout(() => {
      document
        .querySelector("[data-payment-vault-settings]")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open, paymentVaultFocus]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void fetchMyAccountProfile()
      .then((profile) => {
        setProfileName(profile.displayName?.trim() || fa.myNameFallback);
        setAvatarUrl(profile.avatarUrl ?? null);
        writeCachedMyProfile({
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
        });
      })
      .catch(() => {});
  }, [open, fa.myNameFallback]);

  const shareQrLink = async () => {
    if (!user?.id) {
      return;
    }
    const url = buildFriendAddQrUrl({
      userId: user.id,
      origin: window.location.origin,
    });
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Rimvio 친구 추가",
          text: fa.shareQrText(profileName),
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(fa.copyInviteDone);
    } catch {
      toast.error(fa.shareFailed);
    }
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50"
            aria-label={ap.cancel}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-label={ap.editTitle}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[61] max-h-[92dvh] overflow-y-auto rounded-t-[20px] bg-rimvio-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl",
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[17px] font-semibold text-foreground">
                {ap.editTitle}
              </h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-rimvio-surface-muted"
                aria-label={ap.cancel}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <RimvioProfileDecorPanel
              className="mb-4"
              onChanged={() => onSaved?.()}
            />
            {user?.id ? (
              <div className="mb-4 space-y-3">
                <FriendAddQrCard
                  displayName={profileName}
                  avatarUrl={avatarUrl}
                  userId={user.id}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void shareQrLink()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#3182f6] py-3 text-[14px] font-semibold text-white active:scale-[0.98]"
                  >
                    <Share2 className="size-4" aria-hidden />
                    {fa.shareQr}
                  </button>
                </div>
                <p className="text-center text-[12px] text-[#8b95a1]">
                  {fa.qrHint}
                </p>
              </div>
            ) : null}
            <IdentityVaultSettingsPanel
              className="mb-4"
              onSaved={() => onSaved?.()}
            />
            <PaymentVaultSettingsPanel
              className="mb-4"
              onSaved={() => onSaved?.()}
            />
            <RimvioAccountProfilePanel
              variant="embedded"
              onSaved={() => {
                onSaved?.();
                onOpenChange(false);
              }}
            />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
