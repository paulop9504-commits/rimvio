"use client";

/**
 * Sheets-style Workspace share settings — RTS roles (ADR-047).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useGlobeContextShareCandidates } from "@/hooks/use-globe-context-share-candidates";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  shareGlobeContextWithFriends,
  type GlobeContextShareFriend,
} from "@/lib/experience-bridge/share-context-with-friends";
import { fetchMyAccountProfile } from "@/lib/peer-chat/peer-chat-client";
import {
  ASSIGNABLE_SHARE_ROLES,
  contextShareRoleHintKo,
  contextShareRoleLabelKo,
  type ContextShareRole,
  type ContextShareRoster,
} from "@/lib/context-workspace/rts-share/types";
import {
  CONTEXT_SHARE_ROSTER_UPDATED,
  ensureContextShareRoster,
  readContextShareRoster,
  removeContextShareMember,
  setContextShareMemberRole,
  upsertContextShareMember,
} from "@/lib/context-workspace/rts-share/context-share-roster-store";
import { canManageContextShare } from "@/lib/context-workspace/rts-share/rts-permission-gates";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type WorkspaceShareSettingsSheetProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly contextEventId: string;
};

export function WorkspaceShareSettingsSheet({
  open,
  onOpenChange,
  contextEventId,
}: WorkspaceShareSettingsSheetProps) {
  const { user } = useAuth();
  const eventId = contextEventId.trim();
  const event = useMemo(
    () => (eventId ? findLifeEventCandidate(eventId) : null),
    [eventId],
  );
  const [roster, setRoster] = useState<ContextShareRoster | null>(null);
  const [inviteRole, setInviteRole] = useState<ContextShareRole>("player");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const canManage = canManageContextShare({
    contextEventId: eventId,
    userId: user?.id,
  });

  const refresh = useCallback(() => {
    if (!eventId || !user?.id) {
      setRoster(null);
      return;
    }
    const display =
      user.email?.split("@")[0]?.trim() || copy.globe.workspaceShareYou;
    ensureContextShareRoster({
      contextEventId: eventId,
      mapOwnerUserId: user.id,
      mapOwnerDisplayName: display,
    });
    setRoster(readContextShareRoster(eventId));
  }, [eventId, user?.email, user?.id]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener(CONTEXT_SHARE_ROSTER_UPDATED, onUpdate);
    return () => window.removeEventListener(CONTEXT_SHARE_ROSTER_UPDATED, onUpdate);
  }, [open, refresh]);

  const { visible, fetching } = useGlobeContextShareCandidates({
    event: event ?? (eventId ? ({ id: eventId } as never) : null),
    maxVisible: 16,
  });

  const inviteFriend = async (friend: GlobeContextShareFriend) => {
    if (!event || !user?.id || busyUserId || !canManage) return;
    setBusyUserId(friend.userId);
    try {
      const profile = await fetchMyAccountProfile().catch(() => null);
      const hostDisplayName =
        profile?.displayName?.trim() ||
        profile?.rimvioId?.trim() ||
        user.email?.split("@")[0] ||
        copy.globe.workspaceShareYou;
      ensureContextShareRoster({
        contextEventId: eventId,
        mapOwnerUserId: user.id,
        mapOwnerDisplayName: hostDisplayName,
      });
      upsertContextShareMember({
        contextEventId: eventId,
        member: {
          userId: friend.userId,
          displayName: friend.displayName,
          peerThreadId: friend.peerThreadId,
          role: inviteRole === "map_owner" ? "player" : inviteRole,
          status: "pending",
        },
      });
      await shareGlobeContextWithFriends({
        event,
        hostDisplayName,
        friends: [friend],
      });
      toast.success(copy.globe.workspaceShareInviteSent(friend.displayName));
      refresh();
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.bridgeShareFail,
      );
    } finally {
      setBusyUserId(null);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-3 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
          data-workspace-share-settings
        >
          <motion.div
            role="dialog"
            aria-label={copy.globe.workspaceShareTitle}
            className="flex max-h-[min(88vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-[24px] bg-white shadow-xl"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-black/[0.06] px-4 pb-3 pt-4">
              <div className="min-w-0">
                <h2 className="text-[17px] font-semibold text-[#191f28]">
                  {copy.globe.workspaceShareTitle}
                </h2>
                <p className="mt-0.5 text-[12px] text-[#8b95a1]">
                  {copy.globe.workspaceShareSubtitle}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-[#8b95a1]"
                aria-label={copy.globe.workspaceCollapse}
                onClick={() => onOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8b95a1]">
                {copy.globe.workspaceSharePeople}
              </p>
              <ul className="space-y-1.5">
                {(roster?.members ?? []).map((member) => {
                  const isOwner = member.role === "map_owner";
                  return (
                    <li
                      key={member.userId}
                      className="flex items-center gap-2 rounded-xl bg-[#f2f4f6] px-3 py-2.5"
                      data-share-member={member.userId}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[#191f28]">
                        {(member.displayName.trim() || "?").slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-[#191f28]">
                          {member.displayName}
                          {member.status === "pending" ? (
                            <span className="ml-1 text-[11px] font-normal text-[#8b95a1]">
                              {copy.globe.workspaceSharePending}
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate text-[11px] text-[#8b95a1]">
                          {contextShareRoleHintKo(member.role)}
                        </span>
                      </span>
                      {isOwner || !canManage ? (
                        <span className="shrink-0 text-[12px] font-medium text-[#4e5968]">
                          {contextShareRoleLabelKo(member.role)}
                        </span>
                      ) : (
                        <select
                          className="max-w-[8.5rem] shrink-0 rounded-lg border-0 bg-white px-2 py-1.5 text-[12px] font-medium text-[#191f28] shadow-sm"
                          value={member.role}
                          onChange={(e) => {
                            try {
                              setContextShareMemberRole({
                                contextEventId: eventId,
                                userId: member.userId,
                                role: e.target.value as ContextShareRole,
                                actorUserId: user!.id,
                              });
                              refresh();
                            } catch (caught) {
                              toast.message(
                                caught instanceof Error
                                  ? caught.message
                                  : copy.globe.workspaceShareRoleFail,
                              );
                            }
                          }}
                          aria-label={copy.globe.workspaceShareRoleAria}
                        >
                          {ASSIGNABLE_SHARE_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {contextShareRoleLabelKo(role)}
                            </option>
                          ))}
                        </select>
                      )}
                      {!isOwner && canManage ? (
                        <button
                          type="button"
                          className="shrink-0 text-[11px] font-medium text-[#8b95a1]"
                          onClick={() => {
                            try {
                              removeContextShareMember({
                                contextEventId: eventId,
                                userId: member.userId,
                                actorUserId: user!.id,
                              });
                              refresh();
                              toast.message(copy.globe.workspaceShareRemoved);
                            } catch (caught) {
                              toast.message(
                                caught instanceof Error
                                  ? caught.message
                                  : copy.globe.workspaceShareRoleFail,
                              );
                            }
                          }}
                        >
                          {copy.globe.workspaceShareRemove}
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {canManage && event ? (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8b95a1]">
                      {copy.globe.workspaceShareInvite}
                    </p>
                    <select
                      className="rounded-lg bg-[#f2f4f6] px-2 py-1 text-[11px] font-medium text-[#191f28]"
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(e.target.value as ContextShareRole)
                      }
                      aria-label={copy.globe.workspaceShareInviteRoleAria}
                    >
                      {ASSIGNABLE_SHARE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {contextShareRoleLabelKo(role)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {fetching ? (
                    <p className="flex items-center gap-2 py-4 text-[13px] text-[#8b95a1]">
                      <Loader2 className="size-4 animate-spin" />
                    </p>
                  ) : visible.length === 0 ? (
                    <p className="py-3 text-[13px] text-[#8b95a1]">
                      {copy.globe.workspaceShareNoFriends}
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {visible.map((friend) => {
                        const already = roster?.members.some(
                          (m) => m.userId === friend.userId,
                        );
                        return (
                          <li key={friend.userId}>
                            <button
                              type="button"
                              disabled={Boolean(busyUserId) || already}
                              onClick={() => void inviteFriend(friend)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left",
                                already
                                  ? "opacity-40"
                                  : "hover:bg-[#f2f4f6] active:bg-[#e8ebef]",
                              )}
                            >
                              <UserPlus className="size-4 shrink-0 text-[#3182f6]" />
                              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#191f28]">
                                {friend.displayName}
                              </span>
                              <span className="text-[11px] text-[#8b95a1]">
                                {already
                                  ? copy.globe.workspaceShareAlready
                                  : copy.globe.workspaceShareSend}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}

              {!event ? (
                <p className="mt-4 text-[12px] leading-relaxed text-[#8b95a1]">
                  {copy.globe.workspaceShareNeedContext}
                </p>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
