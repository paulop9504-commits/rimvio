"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Loader2, MapPin, Navigation, PenLine, X } from "lucide-react";
import { toast } from "sonner";
import { applyDateOverrideToPhotoDraft } from "@/lib/globe/apply-date-override-to-photo-draft";
import { applyPlaceOverrideToPhotoDraft } from "@/lib/globe/apply-place-override-to-photo-draft";
import { sealPhotoDraftForCommit } from "@/lib/globe/seal-photo-draft-for-commit";
import { commitGlobePhotoIngestDraft } from "@/lib/globe/commit-globe-photo-ingest-draft";
import { draftHasExplicitGps } from "@/lib/globe/draft-has-explicit-gps";
import { geocodeAndSyncGlobeContextPlace } from "@/lib/globe/geocode-and-sync-globe-context-place";
import { isCoordsPlaceLabel } from "@/lib/globe/is-coords-place-label";
import type { GlobePhotoIngestDraft } from "@/lib/globe/prepare-globe-photo-ingest-draft";
import {
  parsePhotoDateInputValue,
  resolveGlobePhotoDateHint,
} from "@/lib/globe/resolve-globe-photo-date-hint";
import { resolveGlobePhotoPlaceBranch } from "@/lib/globe/resolve-globe-photo-place-branch";
import {
  sampleEphemeralGpsPlaceDetailed,
} from "@/lib/globe/sample-ephemeral-gps-place";
import { syncPersonalGlobePinFromEvent } from "@/lib/globe/sync-personal-globe-pin";
import { stageGlobeMediaFilesToPool } from "@/lib/globe/stage-globe-media-to-pool";
import { normalizePlaceLabel } from "@/lib/globe/normalize-place-label";
import {
  listAmbiguousDistrictCandidates,
  type KoreaMetroDistrict,
} from "@/lib/globe/korea-metro-districts";
import {
  rimvioGhostCtaClass,
  rimvioHeroCtaClass,
} from "@/lib/design/rimvio-ontology";
import { copy } from "@/lib/copy/human-ko";
import { resolveRimvioHonorific } from "@/lib/copy/rimvio-honorific";
import { useAuth } from "@/hooks/use-auth";
import { GlobeContextSendRail } from "@/components/globe/globe-context-send-rail";
import { formatPinDateLabel } from "@/lib/globe/format-pin-date-label";
import { resolveGlobeContextPlaceLabel } from "@/lib/globe/globe-context-card-coords";
import { findLifeEventCandidate } from "@/lib/life-read-model";

export type GlobePhotoPlaceWalkthroughProps = {
  visible: boolean;
  preparing?: boolean;
  prepareError?: string | null;
  draft: GlobePhotoIngestDraft | null;
  attachTarget?: {
    eventId: string;
    title: string;
    force?: boolean;
  } | null;
  className?: string;
  onDismiss: () => void;
  onCommitProgress?: (done: number, total: number) => void;
  onCommitFileIndexProgress?: (
    event: import("@/lib/feed/ingest-globe-context-media").GlobeMediaIngestProgressEvent,
  ) => void;
  onConfirmed?: (input: {
    eventId: string | null;
    toastLine: string;
    needsPlaceVerify?: boolean;
    ok?: boolean;
  }) => void;
};

type WalkthroughStep =
  | "analyzing"
  | "date_confirm"
  | "date_edit"
  | "case_a"
  | "case_b"
  | "place_method"
  | "manual_input"
  | "district_pick"
  | "gps_confirm"
  | "share_people";

function resolveProgress(
  step: WalkthroughStep,
  branch: "case_a" | "case_b" | null,
): { index: number; total: number } {
  const total = branch === "case_a" ? 3 : 5;
  const indexByStep: Partial<Record<WalkthroughStep, number>> = {
    analyzing: 0,
    date_confirm: 1,
    date_edit: 1,
    case_a: 2,
    case_b: 2,
    place_method: 3,
    manual_input: 4,
    district_pick: 4,
    gps_confirm: 4,
  };
  return { index: indexByStep[step] ?? 0, total };
}

function ProgressBar({ index, total }: { index: number; total: number }) {
  const pct = total <= 1 ? 100 : Math.round(((index + 1) / total) * 100);
  return (
    <div className="mb-4">
      <div className="h-1 overflow-hidden rounded-full bg-black/[0.06]">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      </div>
      <p className="mt-1.5 text-center text-[11px] font-medium text-muted-foreground">
        {copy.globe.photoWalkthroughProgress(index + 1, total)}
      </p>
    </div>
  );
}

function HeroButton(props: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(rimvioHeroCtaClass(), "min-h-12")}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function MethodRow(props: {
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className="flex w-full items-center gap-3 rounded-2xl bg-black/[0.03] px-3.5 py-3.5 text-left active:bg-black/[0.06] disabled:opacity-40"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm ring-1 ring-black/[0.04]">
        {props.icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-foreground">{props.label}</span>
        {props.hint ? (
          <span className="mt-0.5 block text-[12px] text-muted-foreground">{props.hint}</span>
        ) : null}
      </span>
    </button>
  );
}

/** Toss-style progressive disclosure — one step on globe overlay. */
export function GlobePhotoPlaceWalkthrough({
  visible,
  preparing = false,
  prepareError = null,
  draft,
  attachTarget = null,
  className,
  onDismiss,
  onCommitProgress,
  onCommitFileIndexProgress,
  onConfirmed,
}: GlobePhotoPlaceWalkthroughProps) {
  const { user, configured } = useAuth();
  const honorific = resolveRimvioHonorific(user);
  const [step, setStep] = useState<WalkthroughStep>("analyzing");
  const [busy, setBusy] = useState(false);
  const [committedShare, setCommittedShare] = useState<{
    eventId: string;
    toastLine: string;
    needsPlaceVerify: boolean;
  } | null>(null);
  const [workingDraft, setWorkingDraft] = useState<GlobePhotoIngestDraft | null>(null);
  const [dateInput, setDateInput] = useState("");
  const [manualPlace, setManualPlace] = useState("");
  const [districtCandidates, setDistrictCandidates] = useState<
    readonly KoreaMetroDistrict[]
  >([]);
  const [gpsLabel, setGpsLabel] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const branch = useMemo(
    () => (workingDraft ? resolveGlobePhotoPlaceBranch(workingDraft) : null),
    [workingDraft],
  );

  const dateHint = useMemo(
    () => (workingDraft ? resolveGlobePhotoDateHint(workingDraft) : null),
    [workingDraft],
  );

  const progress = resolveProgress(step, branch?.branch ?? null);
  const timeHint = dateHint?.dateLabel?.trim() || null;
  const hasKnownDate = Boolean(
    timeHint && timeHint !== "날짜 미확인" && dateHint?.capturedAtIso,
  );

  const shareEvent = useMemo(() => {
    const eventId = committedShare?.eventId?.trim();
    if (!eventId) {
      return null;
    }
    return findLifeEventCandidate(eventId);
  }, [committedShare?.eventId]);

  const finalizeAfterShare = useCallback(() => {
    if (!committedShare) {
      onDismiss();
      return;
    }
    onConfirmed?.({
      eventId: committedShare.eventId,
      toastLine: committedShare.toastLine,
      needsPlaceVerify: committedShare.needsPlaceVerify,
      ok: true,
    });
    onDismiss();
  }, [committedShare, onConfirmed, onDismiss]);

  const goToSharePeopleStep = useCallback(
    (summary: {
      eventId: string;
      toastLine: string;
      needsPlaceVerify: boolean;
    }) => {
      if (!configured || !user?.id) {
        onConfirmed?.({
          eventId: summary.eventId,
          toastLine: summary.toastLine,
          needsPlaceVerify: summary.needsPlaceVerify,
          ok: true,
        });
        onDismiss();
        return;
      }
      setCommittedShare(summary);
      setStep("share_people");
    },
    [configured, onConfirmed, onDismiss, user?.id],
  );

  const goToPlaceStep = useCallback(() => {
    const nextBranch = workingDraft
      ? resolveGlobePhotoPlaceBranch(workingDraft)
      : null;
    setStep(nextBranch?.branch === "case_a" ? "case_a" : "case_b");
  }, [workingDraft]);

  useEffect(() => {
    if (step !== "share_people" || !committedShare || shareEvent) {
      return;
    }
    const timer = window.setTimeout(() => {
      finalizeAfterShare();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [committedShare, finalizeAfterShare, shareEvent, step]);

  useEffect(() => {
    if (!visible) {
      setStep("analyzing");
      setWorkingDraft(null);
      setDateInput("");
      setManualPlace("");
      setDistrictCandidates([]);
      setGpsLabel(null);
      setGpsCoords(null);
      setCommittedShare(null);
      return;
    }
    if (preparing) {
      setStep("analyzing");
      return;
    }
    if (!draft || prepareError) {
      return;
    }
    setWorkingDraft(draft);
    const hint = resolveGlobePhotoDateHint(draft);
    setDateInput(hint.dateInputValue);
    setStep(hint.capturedAtIso ? "date_confirm" : "date_edit");
  }, [visible, preparing, draft, prepareError]);

  const finishCommit = useCallback(
    async (nextDraft: GlobePhotoIngestDraft) => {
      const summary = await commitGlobePhotoIngestDraft(nextDraft, {
        hintEventId: attachTarget?.eventId ?? null,
        hintTitle: attachTarget?.title ?? null,
        forceAttachToHint: attachTarget?.force === true,
        onProgress: (done, total) => {
          onCommitProgress?.(done, total);
        },
        onFileIndexProgress: (event) => {
          onCommitFileIndexProgress?.(event);
        },
      });

      if (summary.succeeded === 0) {
        const line =
          summary.lastError?.trim() ||
          summary.toastLine ||
          copy.globe.photoWalkthroughCommitFail;
        toast.error(line);
        onConfirmed?.({
          eventId: null,
          toastLine: line,
          ok: false,
        });
        return;
      }

      if (summary.failed > 0) {
        toast.message(
          copy.globe.photoIngestPartialSuccess(summary.succeeded, summary.failed),
        );
      }

      if (!summary.lastEventId) {
        const line =
          summary.lastError?.trim() ||
          summary.toastLine ||
          copy.globe.photoWalkthroughCommitFail;
        toast.error(line);
        onConfirmed?.({
          eventId: null,
          toastLine: line,
          ok: false,
        });
        return;
      }

      let needsPlaceVerify = false;
      const place =
        nextDraft.candidates[0]?.placeLabel?.trim() ||
        nextDraft.clusters[0]?.placeLabel?.trim();
      const explicitGps = draftHasExplicitGps(nextDraft);

      if (explicitGps) {
        syncPersonalGlobePinFromEvent(summary.lastEventId);
        needsPlaceVerify = isCoordsPlaceLabel(place);
      } else if (place) {
        try {
          const geocoded = await Promise.race([
            geocodeAndSyncGlobeContextPlace({
              eventId: summary.lastEventId,
              placeLabel: place,
              title: nextDraft.candidates[0]?.title,
              userLat: nextDraft.clusters[0]?.anchor.lat,
              userLng: nextDraft.clusters[0]?.anchor.lng,
              force: false,
            }),
            new Promise<null>((resolve) => {
              window.setTimeout(() => resolve(null), 18_000);
            }),
          ]);
          needsPlaceVerify = geocoded?.needsPlaceVerify === true;
        } catch {
          // Pin commit succeeded — geocode is best-effort before fly-to.
        }
      }
      goToSharePeopleStep({
        eventId: summary.lastEventId,
        toastLine: summary.toastLine,
        needsPlaceVerify,
      });
    },
    [attachTarget, goToSharePeopleStep, onCommitFileIndexProgress, onCommitProgress, onConfirmed, onDismiss],
  );

  const handleCaseAConfirm = useCallback(async () => {
    if (!workingDraft || busy || !branch) {
      return;
    }
    setBusy(true);
    try {
      await finishCommit(sealPhotoDraftForCommit(workingDraft, branch));
    } catch (caught) {
      const message =
        caught instanceof Error && caught.message.trim()
          ? caught.message.trim()
          : copy.globe.photoWalkthroughCommitFail;
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }, [branch, busy, finishCommit, workingDraft]);

  const handleSkip = useCallback(async () => {
    if (!workingDraft || busy) {
      return;
    }
    setBusy(true);
    try {
      const result = await stageGlobeMediaFilesToPool(workingDraft.mediaFiles);
      onConfirmed?.({ eventId: null, toastLine: result.toastLine });
      onDismiss();
    } finally {
      setBusy(false);
    }
  }, [busy, onConfirmed, onDismiss, workingDraft]);

  const commitManualPlace = useCallback(
    async (label: string) => {
      if (!workingDraft || busy) {
        return;
      }
      const normalized = normalizePlaceLabel(label);
      if (!normalized) {
        return;
      }
      setBusy(true);
      try {
        const patched = applyPlaceOverrideToPhotoDraft(workingDraft, {
          placeLabel: normalized,
        });
        await finishCommit(patched);
      } catch (caught) {
        const message =
          caught instanceof Error && caught.message.trim()
            ? caught.message.trim()
            : copy.globe.photoWalkthroughCommitFail;
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, finishCommit, workingDraft],
  );

  const handleManualCommit = useCallback(async () => {
    if (!workingDraft || busy) {
      return;
    }
    const label = normalizePlaceLabel(manualPlace);
    if (!label) {
      return;
    }
    const ambiguous = listAmbiguousDistrictCandidates(label);
    if (ambiguous && ambiguous.length >= 2) {
      setDistrictCandidates(ambiguous);
      setStep("district_pick");
      return;
    }
    await commitManualPlace(label);
  }, [busy, commitManualPlace, manualPlace, workingDraft]);

  const handleDistrictPick = useCallback(
    async (entry: KoreaMetroDistrict) => {
      await commitManualPlace(entry.label);
    },
    [commitManualPlace],
  );

  const handleGpsLoad = useCallback(async () => {
    if (busy) {
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      toast.error(copy.globe.photoPlaceGpsSecureContext);
      return;
    }
    setBusy(true);
    try {
      const result = await sampleEphemeralGpsPlaceDetailed();
      if (!result.ok) {
        const message =
          result.reason === "denied"
            ? copy.globe.photoPlaceGpsDenied
            : result.reason === "timeout"
              ? copy.globe.photoPlaceGpsTimeout
              : copy.globe.photoPlaceGpsFail;
        toast.error(message);
        return;
      }
      setGpsLabel(result.sample.placeLabel);
      setGpsCoords({ lat: result.sample.lat, lng: result.sample.lng });
      setStep("gps_confirm");
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const handleGpsCommit = useCallback(async () => {
    if (!workingDraft || busy || !gpsCoords) {
      return;
    }
    const label = normalizePlaceLabel(gpsLabel) || copy.globe.photoPlaceGpsFallback;
    setBusy(true);
    try {
      const patched = applyPlaceOverrideToPhotoDraft(workingDraft, {
        placeLabel: label,
        lat: gpsCoords.lat,
        lng: gpsCoords.lng,
      });
      await finishCommit(patched);
    } catch (caught) {
      const message =
        caught instanceof Error && caught.message.trim()
          ? caught.message.trim()
          : copy.globe.photoWalkthroughCommitFail;
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }, [busy, finishCommit, gpsCoords, gpsLabel, workingDraft]);

  const handleDateConfirmYes = useCallback(() => {
    goToPlaceStep();
  }, [goToPlaceStep]);

  const handleDateConfirmNo = useCallback(() => {
    setStep("date_edit");
  }, []);

  const handleDateEditSubmit = useCallback(() => {
    if (!workingDraft) {
      return;
    }
    const iso = parsePhotoDateInputValue(dateInput);
    if (!iso) {
      return;
    }
    const patched = applyDateOverrideToPhotoDraft(workingDraft, iso);
    setWorkingDraft(patched);
    goToPlaceStep();
  }, [dateInput, goToPlaceStep, workingDraft]);

  if (!visible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        key="globe-photo-walkthrough"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className={cn(
          "overflow-hidden rounded-[1.5rem] bg-white/96 p-5 shadow-[0_16px_48px_rgba(2,32,71,0.16)] ring-1 ring-black/[0.05] backdrop-blur-xl",
          className,
        )}
        data-globe-photo-walkthrough
        data-globe-photo-place-step={step}
        role="dialog"
        aria-live="polite"
      >
        {step !== "share_people" ? (
          <ProgressBar index={progress.index} total={progress.total} />
        ) : null}

        <div className="mb-4 flex items-start justify-between gap-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="min-w-0 flex-1"
            >
              {step === "analyzing" ? (
                <>
                  <p className="text-[20px] font-bold leading-snug tracking-tight text-foreground">
                    {copy.globe.photoPlaceAnalyzingTitle}
                  </p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                    {copy.globe.photoWalkthroughAnalyzingSub}
                  </p>
                </>
              ) : step === "date_confirm" && timeHint ? (
                <>
                  <p className="flex items-start gap-2 text-[20px] font-bold leading-snug tracking-tight text-foreground">
                    <CalendarDays className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
                    <span>{copy.globe.photoWalkthroughDateConfirm(timeHint)}</span>
                  </p>
                  {dateHint?.confidence !== "exif" ? (
                    <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                      {copy.globe.photoWalkthroughDateEditSub}
                    </p>
                  ) : null}
                </>
              ) : step === "date_edit" ? (
                <>
                  <p className="text-[20px] font-bold leading-snug tracking-tight text-foreground">
                    {copy.globe.photoWalkthroughDateUnknownTitle}
                  </p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                    {copy.globe.photoWalkthroughDateUnknownSub}
                  </p>
                </>
              ) : step === "case_a" && branch?.placeLabel ? (
                <>
                  <p className="text-[20px] font-bold leading-snug tracking-tight text-foreground">
                    {attachTarget
                      ? copy.globe.photoWalkthroughAttachFound(
                          attachTarget.title,
                          branch.placeLabel,
                        )
                      : copy.globe.photoWalkthroughPlaceFound(branch.placeLabel)}
                  </p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                    {attachTarget
                      ? timeHint
                        ? copy.globe.photoWalkthroughTimeHint(timeHint)
                        : copy.globe.photoPlaceCaseASub
                      : copy.globe.memoriesSavePrompt(honorific)}
                  </p>
                </>
              ) : step === "case_b" ? (
                <>
                  <p className="text-[20px] font-bold leading-snug tracking-tight text-foreground">
                    {hasKnownDate && timeHint
                      ? copy.globe.photoWalkthroughCaseBWithDate(timeHint)
                      : copy.globe.photoPlaceCaseBHeadline}
                  </p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                    {copy.globe.photoPlaceCaseBSub}
                  </p>
                </>
              ) : step === "place_method" ? (
                <p className="text-[20px] font-bold leading-snug tracking-tight text-foreground">
                  {copy.globe.photoPlaceMethodTitle}
                </p>
              ) : step === "manual_input" ? (
                <p className="text-[20px] font-bold leading-snug tracking-tight text-foreground">
                  {copy.globe.photoPlaceManualLabel}
                </p>
              ) : step === "district_pick" ? (
                <>
                  <p className="text-[20px] font-bold leading-snug tracking-tight text-foreground">
                    {copy.globe.photoWalkthroughDistrictPickTitle(
                      districtCandidates[0]?.district ?? manualPlace.trim(),
                    )}
                  </p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                    {copy.globe.photoWalkthroughDistrictPickSub}
                  </p>
                </>
              ) : step === "gps_confirm" ? (
                <>
                  <p className="flex items-start gap-2 text-[20px] font-bold leading-snug tracking-tight text-foreground">
                    <MapPin className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
                    <span>
                      {copy.globe.photoWalkthroughHereNow(
                        gpsLabel ?? copy.globe.photoPlaceGpsFallback,
                      )}
                    </span>
                  </p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                    {copy.globe.photoPlaceGpsBody}
                  </p>
                </>
              ) : step === "share_people" ? (
                <>
                  <p className="text-[20px] font-bold leading-snug tracking-tight text-foreground">
                    {copy.globe.photoWalkthroughShareTitle}
                  </p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                    {copy.globe.photoWalkthroughShareSub}
                  </p>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>
          <button
            type="button"
            className="shrink-0 rounded-xl p-2 text-muted-foreground hover:bg-black/[0.04]"
            aria-label={copy.globe.contextConfirmCloseAria}
            onClick={onDismiss}
            disabled={busy}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {prepareError ? (
          <p className="mb-3 text-[13px] text-destructive">{prepareError}</p>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={`actions-${step}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="space-y-2"
          >
            {step === "analyzing" ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
              </div>
            ) : null}

            {step === "date_confirm" ? (
              <>
                <HeroButton disabled={busy} onClick={handleDateConfirmYes}>
                  {copy.globe.photoWalkthroughConfirmYes}
                </HeroButton>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDateConfirmNo}
                  className={cn(rimvioGhostCtaClass(), "w-full")}
                >
                  {copy.globe.photoWalkthroughDateConfirmNo}
                </button>
              </>
            ) : null}

            {step === "date_edit" ? (
              <>
                <input
                  type="date"
                  value={dateInput}
                  onChange={(event) => setDateInput(event.target.value)}
                  className="w-full rounded-2xl border-0 bg-black/[0.04] px-4 py-3.5 text-[15px] outline-none ring-primary/30 focus:ring-2"
                  disabled={busy}
                  autoFocus
                />
                <HeroButton
                  disabled={busy || !dateInput.trim()}
                  onClick={handleDateEditSubmit}
                >
                  {copy.globe.photoWalkthroughDateSave}
                </HeroButton>
                {hasKnownDate ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setStep("date_confirm")}
                    className={cn(rimvioGhostCtaClass(), "w-full")}
                  >
                    {copy.globe.photoPlaceBack}
                  </button>
                ) : null}
              </>
            ) : null}

            {step === "case_a" && branch?.placeLabel ? (
              <>
                <HeroButton disabled={busy} onClick={() => void handleCaseAConfirm()}>
                  {busy ? (
                    <Loader2 className="size-5 animate-spin" aria-hidden />
                  ) : (
                    copy.globe.photoWalkthroughConfirmYes
                  )}
                </HeroButton>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep("place_method")}
                  className={cn(rimvioGhostCtaClass(), "w-full")}
                >
                  {copy.globe.photoWalkthroughConfirmNo}
                </button>
              </>
            ) : null}

            {step === "case_b" ? (
              <>
                <HeroButton disabled={busy} onClick={() => setStep("place_method")}>
                  {copy.globe.photoPlaceCaseBAdd}
                </HeroButton>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSkip()}
                  className={cn(rimvioGhostCtaClass(), "w-full")}
                >
                  {copy.globe.photoPlaceCaseBSkip}
                </button>
              </>
            ) : null}

            {step === "place_method" ? (
              <>
                <MethodRow
                  icon={<PenLine className="size-[18px]" aria-hidden />}
                  label={copy.globe.photoPlaceMethodManual}
                  hint={copy.globe.photoWalkthroughManualHint}
                  disabled={busy}
                  onClick={() => setStep("manual_input")}
                />
                <MethodRow
                  icon={<Navigation className="size-[18px]" aria-hidden />}
                  label={copy.globe.photoPlaceMethodGps}
                  hint={copy.globe.photoWalkthroughHereHint}
                  disabled={busy}
                  onClick={() => void handleGpsLoad()}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep(branch?.branch === "case_a" ? "case_a" : "case_b")}
                  className={cn(rimvioGhostCtaClass(), "w-full")}
                >
                  {copy.globe.photoPlaceBack}
                </button>
              </>
            ) : null}

            {step === "manual_input" ? (
              <>
                <input
                  type="text"
                  value={manualPlace}
                  onChange={(event) => setManualPlace(event.target.value)}
                  placeholder={copy.globe.photoPlaceManualPlaceholder}
                  className="w-full rounded-2xl border-0 bg-black/[0.04] px-4 py-3.5 text-[15px] outline-none ring-primary/30 placeholder:text-muted-foreground focus:ring-2"
                  disabled={busy}
                  autoFocus
                />
                <HeroButton
                  disabled={busy || !manualPlace.trim()}
                  onClick={() => void handleManualCommit()}
                >
                  {copy.globe.photoPlaceManualConfirm}
                </HeroButton>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep("place_method")}
                  className={cn(rimvioGhostCtaClass(), "w-full")}
                >
                  {copy.globe.photoPlaceBack}
                </button>
              </>
            ) : null}

            {step === "district_pick" ? (
              <>
                {districtCandidates.map((entry) => (
                  <MethodRow
                    key={entry.label}
                    icon={<MapPin className="size-[18px]" aria-hidden />}
                    label={entry.label}
                    disabled={busy}
                    onClick={() => void handleDistrictPick(entry)}
                  />
                ))}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep("manual_input")}
                  className={cn(rimvioGhostCtaClass(), "w-full")}
                >
                  {copy.globe.photoPlaceBack}
                </button>
              </>
            ) : null}

            {step === "gps_confirm" && gpsCoords ? (
              <>
                <HeroButton disabled={busy} onClick={() => void handleGpsCommit()}>
                  {copy.globe.photoWalkthroughConfirmYes}
                </HeroButton>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep("place_method")}
                  className={cn(rimvioGhostCtaClass(), "w-full")}
                >
                  {copy.globe.photoPlaceBack}
                </button>
              </>
            ) : null}

            {step === "share_people" ? (
              <>
                {shareEvent ? (
                  <GlobeContextSendRail
                    event={shareEvent}
                    delivery={{
                      title: shareEvent.title.trim() || "경험",
                      date: formatPinDateLabel(shareEvent.datetime),
                      place: resolveGlobeContextPlaceLabel(shareEvent),
                    }}
                    onSent={finalizeAfterShare}
                  />
                ) : (
                  <p className="text-center text-[13px] text-muted-foreground">
                    {copy.globe.photoWalkthroughShareLoading}
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={finalizeAfterShare}
                  className={cn(rimvioGhostCtaClass(), "w-full")}
                >
                  {copy.globe.photoWalkthroughShareSkip}
                </button>
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
