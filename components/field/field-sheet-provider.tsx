"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  bindLegacyOpenFieldSheet,
  requestOpenFieldSheet,
} from "@/lib/nav/open-field-sheet-request";
import {
  publishFieldSheetOpen,
  type FieldSheetOpenRequest,
} from "@/lib/nav/field-sheet-bridge";
import type { FieldDashboardTab } from "@/lib/nav/field-dashboard-types";
import { OpportunityFieldErrorBoundary } from "@/components/field/opportunity-field-error-boundary";
import { useIosPwaMemoryGuards } from "@/hooks/use-ios-pwa-memory-guards";

const OpportunityDashboardSheet = dynamic(
  () =>
    import("@/components/field/opportunity-dashboard-sheet").then((mod) => ({
      default: mod.OpportunityDashboardSheet,
    })),
  { ssr: false, loading: () => null },
);

type FieldSheetContextValue = {
  open: boolean;
  openFieldSheet: (request?: FieldSheetOpenRequest) => void;
  closeFieldSheet: () => void;
};

const FieldSheetContext = createContext<FieldSheetContextValue | null>(null);

export function useFieldSheet(): FieldSheetContextValue {
  const ctx = useContext(FieldSheetContext);
  if (!ctx) {
    throw new Error("useFieldSheet must be used within FieldSheetProvider");
  }
  return ctx;
}

/** Global Field sheet — 밖 지구 통로 (자원 찾기 · 외부 대화 · 내 게시물). */
export function FieldSheetProvider({ children }: { children: ReactNode }) {
  const iosPwaLazySheet = useIosPwaMemoryGuards();
  const [open, setOpen] = useState(false);
  const [primaryEventId, setPrimaryEventId] = useState<string | null>(null);
  const [dashboardTab, setDashboardTab] = useState<FieldDashboardTab | null>(null);
  const [highlightTradeId, setHighlightTradeId] = useState<string | null>(null);
  const [ingressGeneration, setIngressGeneration] = useState(0);

  const applyOpen = useCallback((request?: FieldSheetOpenRequest) => {
    setPrimaryEventId(request?.primaryEventId ?? null);
    setDashboardTab(request?.tab ?? null);
    setHighlightTradeId(request?.highlightTradeId ?? null);
    setIngressGeneration((value) => value + 1);
    setOpen(true);
  }, []);

  const openFieldSheet = useCallback(
    (request?: FieldSheetOpenRequest) => {
      requestOpenFieldSheet(applyOpen, request);
    },
    [applyOpen],
  );

  const closeFieldSheet = useCallback(() => {
    publishFieldSheetOpen(false);
    setOpen(false);
    setPrimaryEventId(null);
    setDashboardTab(null);
    setHighlightTradeId(null);
  }, []);

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        publishFieldSheetOpen(true);
        setOpen(true);
        return;
      }
      closeFieldSheet();
    },
    [closeFieldSheet],
  );

  useEffect(() => {
    publishFieldSheetOpen(open);
  }, [open]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    if (open) {
      document.body.dataset.rimvioFieldSheetOpen = "true";
    } else {
      delete document.body.dataset.rimvioFieldSheetOpen;
    }
    return () => {
      delete document.body.dataset.rimvioFieldSheetOpen;
    };
  }, [open]);

  useEffect(() => {
    return bindLegacyOpenFieldSheet(applyOpen);
  }, [applyOpen]);

  const value = useMemo(
    () => ({
      open,
      openFieldSheet,
      closeFieldSheet,
    }),
    [closeFieldSheet, open, openFieldSheet],
  );

  return (
    <FieldSheetContext.Provider value={value}>
      {children}
      {open || !iosPwaLazySheet ? (
        <OpportunityFieldErrorBoundary onReset={() => setPrimaryEventId((id) => id)}>
          <OpportunityDashboardSheet
            open={open}
            onOpenChange={onOpenChange}
            primaryEventId={primaryEventId}
            dashboardTab={dashboardTab}
            highlightTradeId={highlightTradeId}
            ingressGeneration={ingressGeneration}
          />
        </OpportunityFieldErrorBoundary>
      ) : null}
    </FieldSheetContext.Provider>
  );
}
