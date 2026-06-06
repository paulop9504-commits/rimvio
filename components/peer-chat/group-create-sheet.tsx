"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Users, X } from "lucide-react";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { friendContactErrorMessage } from "@/lib/peer-chat/friend-contact-errors";
import { isRegisteredPeerDmThread } from "@/lib/peer-chat/peer-chat-client";
import { upsertGroupThreadCache } from "@/lib/peer-chat/group-threads-cache";
import { createGroupThreadRemote } from "@/lib/peer-chat/peer-chat-client";
import { cn } from "@/lib/utils";

export type GroupCreateSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (input: { threadId: string; displayName: string }) => void;
};

function eligibleContacts(contacts: PeerContact[]): PeerContact[] {
  return contacts.filter((row) => isRegisteredPeerDmThread(row.peerThreadId));
}

export function GroupCreateSheet({
  open,
  onOpenChange,
  onCreated,
}: GroupCreateSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contacts = useMemo(() => eligibleContacts(readPeerContacts()), [open]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setName("");
      setSelected(new Set());
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

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

  const toggleContact = (threadId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (selected.size < 1) {
      setError("친구 1명 이상을 선택해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await createGroupThreadRemote({
        displayName: name.trim() || "단톡",
        memberThreadIds: [...selected],
      });
      onOpenChange(false);
      upsertGroupThreadCache({
        peerThreadId: result.threadId,
        displayName: result.displayName,
      });
      onCreated({
        threadId: result.threadId,
        displayName: result.displayName,
      });
    } catch (err) {
      setError(
        friendContactErrorMessage(err instanceof Error ? err.message : undefined),
      );
    } finally {
      setSubmitting(false);
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
            aria-label="닫기"
            className="fixed inset-0 z-[82] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label="단톡 만들기"
            className="fixed inset-x-0 bottom-0 z-[83] mx-auto w-full max-w-lg overflow-hidden rounded-t-[24px] border border-white/10 bg-rimvio-base shadow-[0_-12px_40px_rgba(0,0,0,0.4)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-rimvio-neon-cyan" aria-hidden />
                <h2 className="text-[16px] font-semibold text-white">단톡 만들기</h2>
              </div>
              <button
                type="button"
                aria-label="닫기"
                className="flex size-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[min(70dvh,28rem)] space-y-4 overflow-y-auto px-4 py-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  방 이름
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="예: 주말 약속"
                  className="mt-1.5 h-11 w-full rounded-2xl border-0 bg-white/[0.06] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:ring-2 focus:ring-rimvio-neon-cyan/35"
                />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  친구 선택
                </p>
                {contacts.length === 0 ? (
                  <p className="mt-2 text-[13px] text-white/45">
                    먼저 1:1 친구를 추가해 주세요.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {contacts.map((contact) => {
                      const checked = selected.has(contact.peerThreadId);
                      return (
                        <li key={contact.peerThreadId}>
                          <button
                            type="button"
                            onClick={() => toggleContact(contact.peerThreadId)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
                              checked ? "bg-rimvio-neon-cyan/12 ring-1 ring-rimvio-neon-cyan/30" : "bg-white/[0.04] hover:bg-white/[0.07]",
                            )}
                          >
                            <PeerProfileAvatar
                              displayName={contact.displayName}
                              size="sm"
                            />
                            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-white">
                              {contact.displayName}
                            </span>
                            <span
                              className={cn(
                                "flex size-5 items-center justify-center rounded-full border text-[10px] font-bold",
                                checked
                                  ? "border-rimvio-neon-cyan bg-rimvio-neon-cyan text-black"
                                  : "border-white/25 text-transparent",
                              )}
                              aria-hidden
                            >
                              ✓
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {error ? (
                <p className="text-[12px] text-red-300">{error}</p>
              ) : null}
            </div>

            <div className="border-t border-white/10 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <MainActionButton
                label={submitting ? "만드는 중…" : "단톡 시작"}
                disabled={submitting || contacts.length === 0 || selected.size < 1}
                onClick={() => void handleCreate()}
              />
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
