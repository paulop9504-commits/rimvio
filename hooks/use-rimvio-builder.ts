"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  compilePlatformRirToManifest,
  isPlatformRir,
  planFromUtterance,
  type BuilderChangeLogEntry,
  type BuilderClarification,
  type BuilderPhase,
  type BuilderSession,
  type BuilderViewMode,
  type PlatformRir,
  type RimvioBuilderRir,
} from "@/lib/platform-builder";
import { validateRimvioPlatformManifest } from "@/lib/platform-sdk/manifest";
import type { RimvioPlatformManifest } from "@/lib/platform-sdk/types";

const STORAGE_KEY = "rimvio.builder.session.v1";

function createSession(): BuilderSession {
  return {
    id: `builder_${Date.now()}`,
    phase: "describe",
    viewMode: "visual",
    rir: null,
    pendingClarification: null,
    changeLog: [],
    lastPreviewAtIso: null,
    testPassed: false,
  };
}

function pushChange(
  log: readonly BuilderChangeLogEntry[],
  entry: Omit<BuilderChangeLogEntry, "id" | "atIso">,
): BuilderChangeLogEntry[] {
  return [
    ...log,
    {
      ...entry,
      id: `chg_${Date.now()}`,
      atIso: new Date().toISOString(),
    },
  ];
}

export function useRimvioBuilder() {
  const [session, setSession] = useState<BuilderSession>(createSession);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSession(JSON.parse(raw) as BuilderSession);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }
  }, [session, hydrated]);

  const manifest = useMemo((): RimvioPlatformManifest | null => {
    if (!session.rir || !isPlatformRir(session.rir)) return null;
    return compilePlatformRirToManifest(session.rir);
  }, [session.rir]);

  const manifestValidation = useMemo(() => {
    if (!manifest) return null;
    return validateRimvioPlatformManifest(manifest);
  }, [manifest]);

  const submitUtterance = useCallback(
    (utterance: string) => {
      const existingPlatform =
        session.rir && isPlatformRir(session.rir) ? session.rir : null;

      const result = planFromUtterance(utterance, {
        pendingClarification: session.pendingClarification,
        existingRir:
          session.phase === "preview" || session.phase === "test"
            ? existingPlatform
            : null,
      });

      setSession((prev) => {
        if (result.type === "clarify") {
          const clarification: BuilderClarification = {
            question: result.question,
            answer: null,
            options: [...result.options],
          };
          return {
            ...prev,
            phase: "clarify",
            pendingClarification: clarification,
            changeLog: pushChange(prev.changeLog, {
              userMessage: utterance,
              summaryKo: result.question,
              patchIds: [],
            }),
          };
        }

        if (result.type === "blueprint" || result.type === "patch") {
          const nextPhase: BuilderPhase =
            result.type === "blueprint" ? "blueprint" : "preview";
          return {
            ...prev,
            phase: nextPhase,
            rir: result.rir,
            pendingClarification: null,
            lastPreviewAtIso: new Date().toISOString(),
            testPassed: false,
            changeLog: pushChange(prev.changeLog, {
              userMessage: utterance,
              summaryKo: result.summaryKo,
              patchIds: ["rir"],
            }),
          };
        }

        if (result.type === "capability") {
          return {
            ...prev,
            phase: "blueprint",
            rir: result.rir,
            pendingClarification: null,
            changeLog: pushChange(prev.changeLog, {
              userMessage: utterance,
              summaryKo: result.summaryKo,
              patchIds: ["capability"],
            }),
          };
        }

        return prev;
      });
    },
    [session.pendingClarification, session.phase, session.rir],
  );

  const generatePlatform = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      phase: "generate",
    }));
    window.setTimeout(() => {
      setSession((prev) => ({
        ...prev,
        phase: "preview",
        lastPreviewAtIso: new Date().toISOString(),
      }));
    }, 600);
  }, []);

  const runTest = useCallback(() => {
    setSession((prev) => ({ ...prev, phase: "test" }));
    window.setTimeout(() => {
      setSession((prev) => ({
        ...prev,
        phase: "preview",
        testPassed: Boolean(manifestValidation?.valid),
      }));
    }, 800);
  }, [manifestValidation?.valid]);

  const setViewMode = useCallback((viewMode: BuilderViewMode) => {
    setSession((prev) => ({ ...prev, viewMode }));
  }, []);

  const resetBuilder = useCallback(() => {
    const fresh = createSession();
    setSession(fresh);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // ignore
    }
  }, []);

  const selectClarifyOption = useCallback(
    (option: string) => {
      submitUtterance(option);
    },
    [submitUtterance],
  );

  const addFeatureChip = useCallback(
    (chip: string) => {
      const prompts: Record<string, string> = {
        payments: "결제 기능을 추가해줘",
        location: "위치 기반 검색을 추가해줘",
        ai_price: "AI 가격 추천 기능을 추가해줘",
      };
      submitUtterance(prompts[chip] ?? chip);
    },
    [submitUtterance],
  );

  return {
    hydrated,
    session,
    manifest,
    manifestValidation,
    submitUtterance,
    generatePlatform,
    runTest,
    setViewMode,
    resetBuilder,
    selectClarifyOption,
    addFeatureChip,
    platformRir: session.rir && isPlatformRir(session.rir) ? session.rir : null,
    capabilityRir: session.rir && session.rir.kind === "capability" ? session.rir : null,
  };
}

export type RimvioBuilder = ReturnType<typeof useRimvioBuilder>;
