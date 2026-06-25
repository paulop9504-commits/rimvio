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
import { useGlobeLayerMode } from "@/hooks/use-globe-layer-mode";
import {
  bindLegacyOpenFieldSheet,
  requestOpenFieldSheet,
} from "@/lib/nav/open-field-sheet-request";
import {
  publishFieldSheetOpen,
  type FieldSheetOpenRequest,
} from "@/lib/nav/field-sheet-bridge";
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

/** Global Field sheet — bottom nav opens overlay; no /field navigation on iOS PWA. */
export function FieldSheetProvider({ children }: { children: ReactNode }) {
  const { layerMode, setLayerMode } = useGlobeLayerMode();
  const iosPwaLazySheet = useIosPwaMemoryGuards();
  const [open, setOpen] = useState(false);
  const [primaryEventId, setPrimaryEventId] = useState<string | null>(null);

  const applyOpen = useCallback((request?: FieldSheetOpenRequest) => {
    setPrimaryEventId(request?.primaryEventId ?? null);
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
        <OpportunityDashboardSheet
          open={open}
          onOpenChange={onOpenChange}
          layerMode={layerMode}
          primaryEventId={primaryEventId}
          onSwitchToDiscovery={() => setLayerMode("discovery")}
        />
      ) : null}
    </FieldSheetContext.Provider>
  );
}
