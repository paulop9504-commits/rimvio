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
import {
  capabilityDraftToPlatformManifest,
  clearPendingManifest,
  exportPlatformManifestJson,
  importManifestIntoDraft,
  platformManifestToCapabilityDraft,
  readPendingManifest,
} from "@/lib/hub/capability/manifest-bridge";
import { registerCapabilityIndexFromManifest } from "@/lib/platform-sdk/capability-index";
import { validateRimvioPlatformManifest } from "@/lib/platform-sdk/manifest";
import {
  mountPlatformHostApis,
  registerPlatformManifest,
} from "@/lib/platform-sdk/platform-host";

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
  const [importError, setImportError] = useState<string | null>(null);
  const [lastPublishedPlatformId, setLastPublishedPlatformId] = useState<string | null>(
    null,
  );
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const pending = readPendingManifest();
    const stored = readStoredDraft();
    if (pending) {
      setDraft(platformManifestToCapabilityDraft(pending, stored ?? undefined));
      clearPendingManifest();
      setCurrentStep(6);
    } else if (stored) {
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

  const platformManifest = useMemo(
    () => capabilityDraftToPlatformManifest(draft),
    [draft],
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

  const exportManifest = useCallback(() => {
    const json = exportPlatformManifestJson(draft);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${draft.id || "platform"}-manifest.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    return json;
  }, [draft]);

  const importManifest = useCallback(
    (raw: string) => {
      const { draft: next, error } = importManifestIntoDraft(raw, draft);
      if (!next || error) {
        setImportError(error ?? "Import failed");
        return false;
      }
      setImportError(null);
      setDraft(next);
      setDirty(true);
      void persistDraft(next);
      return true;
    },
    [draft, persistDraft],
  );

  const importManifestFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        importManifest(String(reader.result));
      };
      reader.readAsText(file);
    },
    [importManifest],
  );

  const runSandboxTest = useCallback(async (): Promise<{ passed: boolean }> => {
    setTestStatus("running");
    setTestsPassed(false);
    await new Promise((r) => setTimeout(r, 1400));
    const undeclared = draft.permissions.find(
      (p) => p.id === "filesystem.write" && p.enabled,
    );
    if (undeclared) {
      setTestStatus("failed");
      setTestOutput("");
      return { passed: false };
    }
    setTestOutput(DEFAULT_TEST_OUTPUT);
    setTestStatus("passed");
    setTestsPassed(true);
    return { passed: true };
  }, [draft.permissions]);

  const publishCapability = useCallback(async () => {
    if (!publishReady) return;
    setPublishStatus("submitting");

    const manifest = capabilityDraftToPlatformManifest(draft);
    const validation = validateRimvioPlatformManifest(manifest);
    if (!validation.valid) {
      setPublishStatus("idle");
      setImportError(validation.errors[0] ?? "Manifest validation failed");
      return;
    }

    await new Promise((r) => setTimeout(r, 1200));

    mountPlatformHostApis();
    registerPlatformManifest(manifest);
    registerCapabilityIndexFromManifest(manifest, "published");
    setLastPublishedPlatformId(manifest.package.id);

    setPublishStatus("pending-review");
  }, [draft, publishReady]);

  const completeAgentPublish = useCallback((platformId: string) => {
    setLastPublishedPlatformId(platformId);
    setPublishStatus("pending-review");
  }, []);

  const resetWizard = useCallback(() => {
    const fresh = createDefaultCapabilityDraft();
    setDraft(fresh);
    setCurrentStep(1);
    setTestsPassed(false);
    setTestStatus("idle");
    setPublishStatus("idle");
    setImportError(null);
    setLastPublishedPlatformId(null);
    localStorage.setItem(HUB_CAPABILITY_DRAFT_STORAGE_KEY, JSON.stringify(fresh));
  }, []);

  return {
    hydrated,
    currentStep,
    draft,
    platformManifest,
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
    importError,
    lastPublishedPlatformId,
    goToStep,
    goNext,
    goBack,
    saveDraftNow,
    exportManifest,
    importManifest,
    importManifestFile,
    runSandboxTest,
    publishCapability,
    completeAgentPublish,
    resetWizard,
  };
}

export type HubCapabilityWizard = ReturnType<typeof useHubCapabilityWizard>;
