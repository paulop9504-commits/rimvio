"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, ImagePlus, Loader2, MapPin, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import {
  SharedGlobe3DStage,
  type SharedGlobe3DStageHandle,
} from "@/components/peer-chat/shared-globe-3d-stage";
import {
  PinContextFieldSheet,
  type PinContextFieldKind,
} from "@/components/globe/pin-context-field-sheet";
import { PinContextTappableField } from "@/components/globe/pin-context-tappable-field";
import { useAuth } from "@/hooks/use-auth";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { useSharedGlobePins } from "@/hooks/use-shared-globe-pins";
import type { SharedGlobePin } from "@/lib/peer-chat/globe-pin-types";
import { attachMediaSpacetime } from "@/lib/location-ping/attach-media-spacetime";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { projectSharedGlobeClassifiedPins } from "@/lib/peer-chat/project-thread-globe-pins";
import {
  formatSharedGlobePinLabel,
  resolveSharedGlobePinCoords,
} from "@/lib/peer-chat/resolve-shared-globe-pin-coords";
import {
  deleteSharedGlobePinRemote,
  sendSharedGlobePinRemote,
  updateSharedGlobePinRemote,
} from "@/lib/peer-chat/peer-chat-client";
import { cn } from "@/lib/utils";

export type SharedGlobeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peerThreadId: string;
  displayName: string;
  myDisplayName?: string;
};

type PinCoords = {
  lat: number;
  lng: number;
  placeLabel: string;
};

export function SharedGlobeSheet({
  open,
  onOpenChange,
  peerThreadId,
  displayName,
  myDisplayName = "나",
}: SharedGlobeSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<{
    pin: SharedGlobePin;
    kind: Extract<PinContextFieldKind, "place" | "note">;
  } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const globeRef = useRef<SharedGlobe3DStageHandle>(null);
  const liveLocation = useLiveLocationSnapshot();
  const { pins, loading, error, resolvedThreadId, refresh, upsertPin, removePin } =
    useSharedGlobePins({
      peerThreadId,
      enabled: open,
    });

  useEffect(() => {
    setMounted(true);
  }, []);

  const classifiedPins = useMemo(
    () => projectSharedGlobeClassifiedPins(pins),
    [pins],
  );
  const globePins = useMemo(() => {
    const rows: ClassifiedGlobePin[] = [...classifiedPins];
    if (liveLocation) {
      rows.push({
        id: "viewer:here",
        kind: "gps",
        label: "현재 위치",
        lat: liveLocation.lat,
        lng: liveLocation.lng,
        pinX: 0,
        pinY: 0,
        pinShape: "viewer",
        emphasis: "primary",
      });
    }
    return rows;
  }, [classifiedPins, liveLocation]);

  const focusPin = useCallback((pinId: string) => {
    if (pinId === "viewer:here") {
      if (liveLocation) {
        globeRef.current?.flyToPin(
          liveLocation.lat,
          liveLocation.lng,
          "neighborhood",
        );
      }
      return;
    }
    setActivePinId(pinId);
    const pin = classifiedPins.find((row) => row.id === pinId);
    if (pin) {
      globeRef.current?.flyToPin(pin.lat, pin.lng, "neighborhood");
    }
  }, [classifiedPins, liveLocation]);

  useEffect(() => {
    if (!open) {
      setActivePinId(null);
    }
  }, [open]);

  const placePinAt = async (coords: PinCoords, file?: File) => {
    if (placing || photoBusy) {
      return;
    }
    if (file) {
      setPhotoBusy(true);
    } else {
      setPlacing(true);
    }
    try {
      const { pin } = await sendSharedGlobePinRemote({
        threadId: peerThreadId,
        displayName: myDisplayName,
        lat: coords.lat,
        lng: coords.lng,
        placeLabel: coords.placeLabel,
        file,
      });
      upsertPin(pin);
      setActivePinId(pin.payload.pinId);
      globeRef.current?.flyToPin(coords.lat, coords.lng, "neighborhood");
      try {
        const { mirrorSharedGlobePinToPersonalGlobe } = await import(
          "@/lib/peer-chat/mirror-shared-globe-pin-to-personal"
        );
        mirrorSharedGlobePinToPersonalGlobe({
          payload: pin.payload,
          peerThreadId: peerThreadId,
          peerDisplayName: displayName,
        });
      } catch (mirrorError) {
        console.warn("[shared-globe] personal mirror", mirrorError);
      }
      toast.success(
        file
          ? `${coords.placeLabel}에 사진 핀을 박았어요 · 내 지구에도 남겼어요`
          : `${coords.placeLabel}에 핀을 박았어요 · 내 지구에도 남겼어요`,
      );
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "핀을 박지 못했어요.";
      toast.error(message);
    } finally {
      setPlacing(false);
      setPhotoBusy(false);
    }
  };

  const placePinHere = async () => {
    try {
      const coords = await resolveSharedGlobePinCoords();
      await placePinAt(coords);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "위치를 확인할 수 없어요.";
      toast.error(message);
    }
  };

  const deletePin = async (messageId: string, placeLabel: string) => {
    if (deletingMessageId) {
      return;
    }
    setDeletingMessageId(messageId);
    try {
      await deleteSharedGlobePinRemote({
        threadId: peerThreadId,
        messageId,
      });
      removePin(messageId);
      if (activePinId) {
        const deleted = pins.find((row) => row.messageId === messageId);
        if (deleted?.payload.pinId === activePinId) {
          setActivePinId(null);
        }
      }
      toast.success(`${placeLabel} 핀을 삭제했어요`);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "핀을 삭제하지 못했어요.";
      toast.error(message);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const sharePhotoPin = async (file: File) => {
    if (photoBusy || placing) {
      return;
    }
    try {
      const spacetime = await attachMediaSpacetime({
        file,
        origin: "peer_chat",
        originRef: peerThreadId,
      });
      if (spacetime.lat === null || spacetime.lng === null) {
        toast.error("사진에서 위치를 찾지 못했어요. 여기에 핀 박기를 써 주세요.");
        return;
      }
      await placePinAt(
        {
          lat: spacetime.lat,
          lng: spacetime.lng,
          placeLabel:
            spacetime.placeLabel?.trim() ||
            formatSharedGlobePinLabel(spacetime.lat, spacetime.lng),
        },
        file,
      );
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "사진 핀을 박지 못했어요.";
      toast.error(message);
    } finally {
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
    }
  };

  if (!mounted) {
    return null;
  }

  const feedHref = `/feed?sharedGlobe=${encodeURIComponent(resolvedThreadId)}`;
  const busy = placing || photoBusy;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shared-globe-sheet-title"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex max-h-[min(92vh,720px)] max-w-lg flex-col overflow-hidden rounded-t-[1.25rem] border border-white/10 bg-[#0a0c12] shadow-2xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.08] px-4 pb-3 pt-4">
              <div className="min-w-0">
                <p
                  id="shared-globe-sheet-title"
                  className="flex items-center gap-1.5 text-[15px] font-semibold text-white"
                >
                  <Globe className="size-4 text-sky-300" aria-hidden />
                  우리 지구
                </p>
                <p className="mt-0.5 truncate text-[12px] text-white/55">
                  {displayName} · 사진·GPS로 핀을 박아요
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/80"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <SharedGlobe3DStage
                ref={globeRef}
                pins={globePins}
                activePinId={activePinId}
                viewerLocation={
                  liveLocation
                    ? {
                        lat: liveLocation.lat,
                        lng: liveLocation.lng,
                        accuracyM: liveLocation.accuracyM,
                      }
                    : null
                }
                onPinPress={focusPin}
              />

              <div className="space-y-3 px-4 py-3">
                {loading && pins.length === 0 ? (
                  <p className="flex items-center gap-2 text-[12px] text-white/45">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    핀 불러오는 중…
                  </p>
                ) : null}

                {error ? (
                  <p className="text-[12px] text-rose-300/90">{error}</p>
                ) : null}

                {pins.length === 0 && !loading ? (
                  <p className="rounded-2xl bg-white/[0.04] px-3 py-3 text-[13px] leading-relaxed text-white/60">
                    아직 핀이 없어요. 사진·GPS로 함께 박아보세요.
                  </p>
                ) : null}

                {pins.length > 0 ? (
                  <>
                    <p className="px-1 text-[11px] text-white/40">
                      내 핀은 장소·메모를 탭해서 고칠 수 있어요
                    </p>
                    <ul className="space-y-2">
                      {pins.map((pin) => {
                        const isOwn = Boolean(
                          user?.id && pin.senderUserId === user.id,
                        );
                        return (
                          <li key={pin.messageId}>
                            <div
                              className={cn(
                                "flex items-start gap-2 rounded-2xl px-2 py-2.5 ring-1 transition",
                                activePinId === pin.payload.pinId
                                  ? "bg-sky-400/10 ring-sky-400/35"
                                  : "bg-white/[0.04] ring-white/10",
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => focusPin(pin.payload.pinId)}
                                className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/6 ring-1 ring-white/10"
                                aria-label={`${pin.payload.placeLabel} 지도에서 보기`}
                              >
                                {pin.payload.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={pin.payload.imageUrl}
                                    alt=""
                                    className="size-10 rounded-xl object-cover"
                                  />
                                ) : (
                                  <MapPin className="size-4 text-sky-300" />
                                )}
                              </button>
                              <div className="min-w-0 flex-1">
                                {isOwn ? (
                                  <PinContextTappableField
                                    label="장소"
                                    value={pin.payload.placeLabel}
                                    variant="dark"
                                    onPress={() =>
                                      setEditTarget({ pin, kind: "place" })
                                    }
                                  />
                                ) : (
                                  <p className="truncate px-2 text-[13px] font-medium text-white">
                                    {pin.payload.placeLabel}
                                  </p>
                                )}
                                <p className="mt-0.5 px-2 text-[11px] text-white/45">
                                  {pin.payload.senderDisplayName}
                                  {pin.payload.imageUrl ? " · 사진" : ""}
                                </p>
                                {isOwn ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditTarget({ pin, kind: "note" })
                                    }
                                    className="mt-1 px-2 text-left text-[11px] text-sky-300/90 underline-offset-2 hover:underline"
                                  >
                                    {pin.payload.note?.trim() || "메모 추가"}
                                  </button>
                                ) : pin.payload.note?.trim() ? (
                                  <p className="mt-1 px-2 text-[11px] text-white/50">
                                    {pin.payload.note}
                                  </p>
                                ) : null}
                              </div>
                              {isOwn ? (
                                <button
                                  type="button"
                                  disabled={
                                    deletingMessageId === pin.messageId || busy
                                  }
                                  onClick={() =>
                                    void deletePin(
                                      pin.messageId,
                                      pin.payload.placeLabel,
                                    )
                                  }
                                  className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-rose-300 disabled:opacity-40"
                                  aria-label={`${pin.payload.placeLabel} 핀 삭제`}
                                >
                                  {deletingMessageId === pin.messageId ? (
                                    <Loader2
                                      className="size-4 animate-spin"
                                      aria-hidden
                                    />
                                  ) : (
                                    <Trash2 className="size-4" aria-hidden />
                                  )}
                                </button>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : null}

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <MainActionButton
                    type="button"
                    disabled={busy}
                    onClick={() => void placePinHere()}
                    className="w-full"
                  >
                    {placing ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        위치 확인 중…
                      </span>
                    ) : (
                      "여기에 핀 박기"
                    )}
                  </MainActionButton>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => photoInputRef.current?.click()}
                    className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-white/85 ring-1 ring-white/12 active:bg-white/12 disabled:opacity-50"
                    aria-label="사진으로 핀 박기"
                  >
                    {photoBusy ? (
                      <Loader2 className="size-5 animate-spin" aria-hidden />
                    ) : (
                      <ImagePlus className="size-5" aria-hidden />
                    )}
                  </button>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void sharePhotoPin(file);
                    }
                  }}
                />

                <div className="flex items-center justify-between gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <button
                    type="button"
                    onClick={() => void refresh()}
                    className="text-[12px] font-medium text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
                  >
                    새로고침
                  </button>
                  <Link
                    href={feedHref}
                    className="text-[12px] font-medium text-sky-300/90 underline-offset-2 hover:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    피드에서 보기
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
          <PinContextFieldSheet
            open={editTarget !== null}
            onOpenChange={(next) => {
              if (!next) {
                setEditTarget(null);
              }
            }}
            kind={editTarget?.kind ?? "place"}
            value={
              editTarget?.kind === "note"
                ? editTarget.pin.payload.note ?? ""
                : editTarget?.pin.payload.placeLabel ?? ""
            }
            onSave={async (next) => {
              if (!editTarget) {
                return;
              }
              try {
                const { pin } = await updateSharedGlobePinRemote({
                  threadId: peerThreadId,
                  messageId: editTarget.pin.messageId,
                  ...(editTarget.kind === "place"
                    ? { placeLabel: next }
                    : { note: next }),
                });
                upsertPin(pin);
                toast.success(
                  editTarget.kind === "place"
                    ? "장소를 고쳤어요"
                    : "메모를 저장했어요",
                );
              } catch (caught) {
                const message =
                  caught instanceof Error
                    ? caught.message
                    : "저장하지 못했어요.";
                toast.error(message);
                throw caught;
              }
            }}
          />
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
