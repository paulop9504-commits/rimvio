"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Contact,
  QrCode,
  Share2,
  Smartphone,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  FriendAddContactFlow,
  type FriendAddResult,
} from "@/components/peer-chat/friend-add-contact-flow";
import { FriendAddQrCard } from "@/components/peer-chat/friend-add-qr-card";
import { FriendAddQrScanner } from "@/components/peer-chat/friend-add-qr-scanner";
import { PeerContactSyncButton } from "@/components/peer-chat/peer-contact-sync-button";
import { useCopy } from "@/hooks/use-copy";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyAccountProfile } from "@/lib/peer-chat/peer-chat-client";
import { buildFriendAddQrUrl } from "@/lib/peer-chat/friend-add-qr-url";
import { isShareUserAbort } from "@/lib/platform/share-abort";
import type { PinnedSlotIndex } from "@/lib/context/peer-thread-types";
import { cn } from "@/lib/utils";

export type FriendAddSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pinSlot?: PinnedSlotIndex | null;
  onAdded: (result: FriendAddResult) => void | Promise<void>;
  onContactSynced?: () => void;
};

type FriendAddMode = "qr" | "contacts" | "phone";

export function FriendAddSheet({
  open,
  onOpenChange,
  pinSlot = null,
  onAdded,
  onContactSynced,
}: FriendAddSheetProps) {
  const copy = useCopy();
  const fa = copy.peers.friendAdd;
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<FriendAddMode>("qr");
  const [phone, setPhone] = useState("");
  const [scannedContact, setScannedContact] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");

  const isPinMode = pinSlot !== null;
  const title = isPinMode ? fa.pinTitle((pinSlot ?? 0) + 1) : fa.sheetTitle;
  const subtitle = isPinMode ? fa.pinSubtitle : fa.sheetSubtitle;
  const confirmHint = isPinMode ? fa.previewPin : fa.previewTap;

  const phoneContact = useMemo(() => phone.replace(/\D/g, ""), [phone]);
  const activeContact = mode === "phone" ? phoneContact : scannedContact;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setPhone("");
      setScannedContact("");
      setMode("qr");
      setScannerOpen(false);
      return;
    }
    void fetchMyAccountProfile()
      .then((profile) => {
        setProfileName(profile.displayName?.trim() || fa.myNameFallback);
        setAvatarUrl(profile.avatarUrl ?? null);
      })
      .catch(() => {});
  }, [open, fa.myNameFallback]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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
      await navigator.clipboard?.writeText?.(url);
      toast.success(fa.copyInviteDone);
    } catch (error) {
      if (isShareUserAbort(error)) {
        return;
      }
      toast.error(fa.shareFailed);
    }
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="닫기"
              className="fixed inset-0 z-[82] bg-black/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onOpenChange(false)}
            />
            <motion.div
              role="dialog"
              aria-label={title}
              className="fixed inset-x-0 bottom-0 z-[83] mx-auto w-full max-w-lg overflow-hidden rounded-t-[24px] border border-[#0220470f] bg-white shadow-[0_-16px_48px_rgba(0,0,0,0.14)]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[#d1d6db]" />

              <div className="flex items-start justify-between px-4 pb-2 pt-3">
                <div className="min-w-0 pr-3">
                  <h2 className="text-[17px] font-semibold text-[#191f28]">
                    {title}
                  </h2>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-[#6b7684]">
                    {subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="닫기"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#6b7684] hover:bg-[#f2f4f6]"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 px-4 pb-3">
                {(
                  [
                    ["qr", fa.modeQr, QrCode],
                    ["contacts", fa.modeContacts, Contact],
                    ["phone", fa.modePhone, Smartphone],
                  ] as const
                ).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-2xl py-3 text-[11px] font-semibold transition",
                      mode === key
                        ? "bg-[#f2f4f6] text-[#191f28]"
                        : "text-[#6b7684]",
                    )}
                  >
                    <Icon className="size-6" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>

              <div className="max-h-[min(68dvh,30rem)] space-y-4 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {mode === "qr" ? (
                  <>
                    {user?.id ? (
                      <FriendAddQrCard
                        displayName={profileName}
                        avatarUrl={avatarUrl}
                        userId={user.id}
                      />
                    ) : null}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setScannerOpen(true)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#3182f6] py-3 text-[14px] font-semibold text-white active:scale-[0.98]"
                      >
                        <QrCode className="size-4" aria-hidden />
                        {fa.scanQr}
                      </button>
                      <button
                        type="button"
                        onClick={() => void shareQrLink()}
                        className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#f2f4f6] text-[#4e5968] active:scale-[0.98]"
                        aria-label={fa.shareQr}
                      >
                        <Share2 className="size-5" aria-hidden />
                      </button>
                    </div>
                    {scannedContact ? (
                      <FriendAddContactFlow
                        contact={scannedContact}
                        previewHint={confirmHint}
                        loginRequiredMessage={fa.loginRequired}
                        loginCtaLabel={fa.loginCta}
                        onAdded={async (result) => {
                          await onAdded(result);
                          onOpenChange(false);
                        }}
                      />
                    ) : (
                      <p className="text-center text-[12px] text-[#8b95a1]">
                        {fa.qrHint}
                      </p>
                    )}
                  </>
                ) : null}

                {mode === "contacts" ? (
                  <>
                    <PeerContactSyncButton
                      variant="light"
                      onSynced={() => {
                        onContactSynced?.();
                        onOpenChange(false);
                      }}
                    />
                    <p className="text-center text-[12px] text-[#8b95a1]">
                      {fa.contactsHint}
                    </p>
                  </>
                ) : null}

                {mode === "phone" ? (
                  <>
                    <div className="flex gap-2">
                      <div className="flex h-12 shrink-0 items-center rounded-2xl bg-[#f2f4f6] px-3 text-[14px] font-medium text-[#4e5968]">
                        {fa.countryCode}
                      </div>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={fa.placeholderPhone}
                        inputMode="tel"
                        autoFocus
                        className="h-12 min-w-0 flex-1 rounded-2xl border border-[#02204714] bg-[#f9fafb] px-4 text-[15px] text-[#191f28] outline-none placeholder:text-[#8b95a1] focus:border-[#3182f6]/40 focus:bg-white focus:ring-2 focus:ring-[#3182f6]/25"
                      />
                    </div>
                    <FriendAddContactFlow
                      contact={phoneContact}
                      previewHint={confirmHint}
                      confirmLabel={fa.previewConfirm}
                      loginRequiredMessage={fa.loginRequired}
                      loginCtaLabel={fa.loginCta}
                      onAdded={async (result) => {
                        await onAdded(result);
                        onOpenChange(false);
                      }}
                    />
                  </>
                ) : null}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <FriendAddQrScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        title={fa.scanQr}
        hint={fa.scanHint}
        unsupportedHint={fa.scanUnsupported}
        onScanned={(contact) => {
          setScannedContact(contact);
          setMode("qr");
        }}
      />
    </>,
    document.body,
  );
}
