"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_TEST_OUTPUT } from "@/lib/hub/capability/defaults";
import {
  capabilityDraftToPlatformManifest,
  clearPendingManifest,
  exportPlatformManifestJson,
  importManifestIntoDraft,
  platformManifestToCapabilityDraft,
  readPendingManifest,
} from "@/lib/hub/capability/manifest-bridge";
import {
  createDefaultPlatformDraft,
  HUB_PLATFORM_DRAFT_STORAGE_KEY,
} from "@/lib/hub/platform/defaults";
import type {
  AutosaveStatus,
  PlatformDraft,
  PlatformWizardStepId,
  PublishStatus,
  TestRunStatus,
} from "@/lib/hub/platform/types";
import {
  canPublishPlatform,
  computePlatformStepValidation,
} from "@/lib/hub/platform/validation";
import { registerCapabilityIndexFromManifest } from "@/lib/platform-sdk/capability-index";
import { validateRimvioPlatformManifest } from "@/lib/platform-sdk/manifest";
import type { RimvioPlatformManifest } from "@/lib/platform-sdk/types";
import {
  mountPlatformHostApis,
  registerPlatformManifest,
} from "@/lib/platform-sdk/platform-host";
import { appendDevExecutionLog } from "@/lib/hub/dev/execution-log";

const AUTOSAVE_DEBOUNCE_MS = 800;
const TOTAL_STEPS = 14 as const;

function readStoredDraft(): PlatformDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(HUB_PLATFORM_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlatformDraft;
  } catch {
    return null;
  }
}

function manifestToPlatformDraft(
  manifest: RimvioPlatformManifest,
  base?: PlatformDraft,
): PlatformDraft {
  const capability = platformManifestToCapabilityDraft(manifest, base);
  const seed = base ?? createDefaultPlatformDraft();
  return {
    ...seed,
    ...capability,
  };
}

export function useHubPlatformWizard() {
  const [currentStep, setCurrentStep] = useState<PlatformWizardStepId>(1);
  const [draft, setDraft] = useState<PlatformDraft>(createDefaultPlatformDraft);
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
      setDraft(manifestToPlatformDraft(pending, stored ?? undefined));
      clearPendingManifest();
      setCurrentStep(14);
    } else if (stored) {
      setDraft(stored);
    }
    setHydrated(true);
  }, []);

  const persistDraft = useCallback(async (next: PlatformDraft) => {
    setAutosaveStatus("saving");
    try {
      localStorage.setItem(HUB_PLATFORM_DRAFT_STORAGE_KEY, JSON.stringify(next));
      await new Promise((r) => setTimeout(r, 200));
      setAutosaveStatus("saved");
      setLastSavedAt(new Date());
      setDirty(false);
    } catch {
      setAutosaveStatus("error");
    }
  }, []);

  const updateDraft = useCallback(
    (patch: Partial<PlatformDraft> | ((prev: PlatformDraft) => PlatformDraft)) => {
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
    () => computePlatformStepValidation(draft, testsPassed),
    [draft, testsPassed],
  );

  const publishReady = useMemo(
    () => canPublishPlatform(stepValidation, draft),
    [draft, stepValidation],
  );

  const platformManifest = useMemo(
    () => capabilityDraftToPlatformManifest(draft),
    [draft],
  );

  const goToStep = useCallback((step: PlatformWizardStepId) => {
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    setCurrentStep((s) => (s < TOTAL_STEPS ? ((s + 1) as PlatformWizardStepId) : s));
  }, []);

  const goBack = useCallback(() => {
    setCurrentStep((s) => (s > 1 ? ((s - 1) as PlatformWizardStepId) : s));
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
      const platformNext = { ...createDefaultPlatformDraft(), ...next };
      setDraft(platformNext);
      setDirty(true);
      void persistDraft(platformNext);
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
    setDraft((prev) => ({ ...prev, securityScanPassed: true }));
    const manifest = capabilityDraftToPlatformManifest(draft);
    appendDevExecutionLog({
      platformId: manifest.package.id,
      platformName: draft.name,
      source: "sandbox-test",
      ok: true,
      detail: "Sandbox validation passed",
    });
    return { passed: true };
  }, [draft.permissions]);

  const publishPlatform = useCallback(async () => {
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

    appendDevExecutionLog({
      platformId: manifest.package.id,
      platformName: draft.name,
      source: "publish",
      ok: true,
      detail: `Published ${manifest.capabilities.length} capabilities to Registry`,
    });

    setPublishStatus("pending-review");
  }, [draft, publishReady]);

  const completeAgentPublish = useCallback((platformId: string) => {
    setLastPublishedPlatformId(platformId);
    setPublishStatus("pending-review");
  }, []);

  const resetWizard = useCallback(() => {
    const fresh = createDefaultPlatformDraft();
    setDraft(fresh);
    setCurrentStep(1);
    setTestsPassed(false);
    setTestStatus("idle");
    setPublishStatus("idle");
    setImportError(null);
    setLastPublishedPlatformId(null);
    localStorage.setItem(HUB_PLATFORM_DRAFT_STORAGE_KEY, JSON.stringify(fresh));
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
    publishPlatform,
    completeAgentPublish,
    resetWizard,
  };
}

export type HubPlatformWizard = ReturnType<typeof useHubPlatformWizard>;
