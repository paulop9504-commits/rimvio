"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { OpportunityDashboardSheet } from "@/components/field/opportunity-dashboard-sheet";
import { useGlobeLayerMode } from "@/hooks/use-globe-layer-mode";
import {
  publishFieldSheetOpen,
  subscribeOpenFieldSheet,
  type FieldSheetOpenRequest,
} from "@/lib/nav/field-sheet-bridge";

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

function FieldSheetUrlBootstrap({
  onOpen,
}: {
  onOpen: (request?: FieldSheetOpenRequest) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("openField") !== "1") {
      return;
    }
    onOpen();
    const params = new URLSearchParams(window.location.search);
    params.delete("openField");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, [onOpen, searchParams]);

  return null;
}

/** Global Field sheet — bottom nav + /field redirect land here (iOS PWA safe). */
export function FieldSheetProvider({ children }: { children: ReactNode }) {
  const { layerMode, setLayerMode } = useGlobeLayerMode();
  const [open, setOpen] = useState(false);
  const [primaryEventId, setPrimaryEventId] = useState<string | null>(null);

  const openFieldSheet = useCallback((request?: FieldSheetOpenRequest) => {
    setPrimaryEventId(request?.primaryEventId ?? null);
    setOpen(true);
  }, []);

  const closeFieldSheet = useCallback(() => {
    setOpen(false);
    setPrimaryEventId(null);
  }, []);

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
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
    return subscribeOpenFieldSheet(openFieldSheet);
  }, [openFieldSheet]);

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
      <FieldSheetUrlBootstrap onOpen={openFieldSheet} />
      {children}
      <OpportunityDashboardSheet
        open={open}
        onOpenChange={onOpenChange}
        layerMode={layerMode}
        primaryEventId={primaryEventId}
        onSwitchToDiscovery={() => setLayerMode("discovery")}
      />
    </FieldSheetContext.Provider>
  );
}
