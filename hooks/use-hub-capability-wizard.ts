"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDefaultCapabilityDraft,
  HUB_CAPABILITY_DRAFT_STORAGE_KEY,
} from "@/lib/hub/capability/defaults";
import {
  canPublish,
  computeStepValidation,
} from "@/lib/hub/capability/validation";
import type {
  AutosaveStatus,
  CapabilityDraft,
  PublishStatus,
  TestRunStatus,
  WizardStepId,
} from "@/lib/hub/capability/types";
import { DEFAULT_TEST_OUTPUT } from "@/lib/hub/capability/defaults";

const AUTOSAVE_DEBOUNCE_MS = 800;

function readStoredDraft(): CapabilityDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(HUB_CAPABILITY_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CapabilityDraft;
  } catch {
    return null;
  }
}

export function useHubCapabilityWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStepId>(1);
  const [draft, setDraft] = useState<CapabilityDraft>(createDefaultCapabilityDraft);
  const [hydrated, setHydrated] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [testsPassed, setTestsPassed] = useState(false);
  const [testStatus, setTestStatus] = useState<TestRunStatus>("idle");
  const [testOutput, setTestOutput] = useState("");
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("idle");
  const [dirty, setDirty] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const stored = readStoredDraft();
    if (stored) {
      setDraft(stored);
    }
    setHydrated(true);
  }, []);

  const persistDraft = useCallback(async (next: CapabilityDraft) => {
    setAutosaveStatus("saving");
    try {
      localStorage.setItem(HUB_CAPABILITY_DRAFT_STORAGE_KEY, JSON.stringify(next));
      await new Promise((r) => setTimeout(r, 200));
      setAutosaveStatus("saved");
      setLastSavedAt(new Date());
      setDirty(false);
    } catch {
      setAutosaveStatus("error");
    }
  }, []);

  const updateDraft = useCallback(
    (patch: Partial<CapabilityDraft> | ((prev: CapabilityDraft) => CapabilityDraft)) => {
      setDraft((prev) => {
        const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
        setDirty(true);
        if (saveTimerRef.current) {
          window.clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = window.setTimeout(() => {
          void persistDraft(next);
        }, AUTOSAVE_DEBOUNCE_MS);
        return next;
      });
    },
    [persistDraft],
  );

  const stepValidation = useMemo(
    () => computeStepValidation(draft, testsPassed),
    [draft, testsPassed],
  );

  const publishReady = useMemo(
    () => canPublish(stepValidation, draft),
    [draft, stepValidation],
  );

  const goToStep = useCallback((step: WizardStepId) => {
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    setCurrentStep((s) => (s < 6 ? ((s + 1) as WizardStepId) : s));
  }, []);

  const goBack = useCallback(() => {
    setCurrentStep((s) => (s > 1 ? ((s - 1) as WizardStepId) : s));
  }, []);

  const saveDraftNow = useCallback(() => {
    void persistDraft(draft);
  }, [draft, persistDraft]);

  const runSandboxTest = useCallback(async () => {
    setTestStatus("running");
    setTestsPassed(false);
    await new Promise((r) => setTimeout(r, 1400));
    const undeclared = draft.permissions.find(
      (p) => p.id === "filesystem.write" && p.enabled,
    );
    if (undeclared) {
      setTestStatus("failed");
      setTestOutput("");
      return;
    }
    setTestOutput(DEFAULT_TEST_OUTPUT);
    setTestStatus("passed");
    setTestsPassed(true);
  }, [draft.permissions]);

  const publishCapability = useCallback(async () => {
    if (!publishReady) return;
    setPublishStatus("submitting");
    await new Promise((r) => setTimeout(r, 2200));
    setPublishStatus("pending-review");
  }, [publishReady]);

  const resetWizard = useCallback(() => {
    const fresh = createDefaultCapabilityDraft();
    setDraft(fresh);
    setCurrentStep(1);
    setTestsPassed(false);
    setTestStatus("idle");
    setPublishStatus("idle");
    localStorage.setItem(HUB_CAPABILITY_DRAFT_STORAGE_KEY, JSON.stringify(fresh));
  }, []);

  return {
    hydrated,
    currentStep,
    draft,
    updateDraft,
    stepValidation,
    autosaveStatus,
    lastSavedAt,
    dirty,
    testsPassed,
    testStatus,
    testOutput,
    publishStatus,
    publishReady,
    goToStep,
    goNext,
    goBack,
    saveDraftNow,
    runSandboxTest,
    publishCapability,
    resetWizard,
  };
}

export type HubCapabilityWizard = ReturnType<typeof useHubCapabilityWizard>;
