"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { RoomInviteSheet } from "@/components/room-invite-sheet";
import { IOS } from "@/lib/ui/ios-surface";
import {
  canCreateRoom,
  countRoomLinks,
  createRoom,
  ensureRoomsBootstrapped,
  readRooms,
} from "@/lib/rooms/client";
import { roomAccentForIndex } from "@/lib/rooms/types";
import { copy } from "@/lib/copy/human-ko";
import type { RoomRow } from "@/lib/rooms/types";
import { GRID } from "@/lib/ui/responsive-grid";
import { cn } from "@/lib/utils";

export function RoomsHubClient() {
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [inviteRoom, setInviteRoom] = useState<RoomRow | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    ensureRoomsBootstrapped();
    setRooms(readRooms());
  }, []);

  const refresh = () => setRooms(readRooms());

  const handleCreate = () => {
    const { room, error } = createRoom(newRoomName);

    if (error || !room) {
      toast.error(error ?? "방을 만들지 못했어요.");
      return;
    }

    setNewRoomName("");
    setCreating(false);
    refresh();
    toast.success(`「${room.name}」 방이 만들어졌어요`);
  };

  const openInvite = (room: RoomRow) => {
    setInviteRoom(room);
    setInviteOpen(true);
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 pb-2">
        <p className="text-sm text-muted-foreground">
          {copy.room.hubSubtitle} · 피드에서 ← 밀면 바로 추가
        </p>

        <div className={GRID.roomHubGrid}>
          {rooms.map((room, index) => {
            const accent = roomAccentForIndex(index);
            const openCount = countRoomLinks(room.id);

            return (
              <div key={room.id} className={cn("overflow-hidden", IOS.cardSm)}>
                <div className={cn("h-1 bg-gradient-to-r", accent.gradient)} />
                <div className="flex items-center gap-3 px-4 py-4">
                  <span
                    className={cn(
                      "flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br text-xl ring-2 ring-white",
                      accent.gradient
                    )}
                  >
                    {accent.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold tracking-tight">{room.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {openCount}개 아직 해볼 차례
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-black/[0.06] px-3 py-3">
                  <Link
                    href={`/r/${room.slug}`}
                    className={cn(
                      "flex flex-1 items-center justify-center rounded-[14px] py-2.5 text-sm font-semibold text-white",
                      "bg-[#007AFF] active:scale-[0.98]"
                    )}
                  >
                    열기
                  </Link>
                  <button
                    type="button"
                    onClick={() => openInvite(room)}
                    className={cn(
                      "flex flex-1 items-center justify-center rounded-[14px] py-2.5 text-sm font-semibold",
                      IOS.secondaryBtn
                    )}
                  >
                    초대
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {creating && canCreateRoom() ? (
          <div className={cn("space-y-2 p-4", IOS.cardSm)}>
            <input
              value={newRoomName}
              onChange={(event) => setNewRoomName(event.target.value)}
              placeholder="방 이름 (예: 주말 여행)"
              className={cn(
                "h-11 w-full rounded-2xl border-0 bg-[#f2f2f7] px-4 text-sm outline-none",
                "focus:ring-2 focus:ring-[#007AFF]/30"
              )}
              maxLength={24}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreate}
                disabled={!newRoomName.trim()}
                className={cn("flex-1", IOS.primaryBtn, "h-11 text-sm")}
              >
                만들기
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className={cn("rounded-[14px] px-4", IOS.secondaryBtn)}
              >
                취소
              </button>
            </div>
          </div>
        ) : canCreateRoom() ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={cn(
              "flex items-center justify-center gap-2 py-4 text-sm font-medium text-muted-foreground",
              "rounded-2xl border border-dashed border-black/10 bg-white/50",
              "transition-colors hover:text-foreground active:bg-white"
            )}
          >
            <Plus className="size-4" />
            내 방 만들기
          </button>
        ) : (
          <p className={cn("px-4 py-3 text-center text-xs text-muted-foreground", IOS.cardSm)}>
            <Users className="mb-1 inline size-3.5" /> {copy.room.roomLimitHint}
          </p>
        )}
      </div>

      <RoomInviteSheet
        room={inviteRoom}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
    </>
  );
}
