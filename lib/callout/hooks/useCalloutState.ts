"use client";

import { useCallback, useState } from "react";
import type { CalloutIntentAxis, CalloutMode } from "@/lib/callout/types";

export type CalloutUiState = {
  mode: CalloutMode;
  setMode: (mode: CalloutMode) => void;
  selectedAxes: readonly string[];
  toggleAxis: (axisId: string) => void;
  setAxesFromDescriptors: (axes: readonly CalloutIntentAxis[]) => void;
  askText: string;
  setAskText: (text: string) => void;
  clearAsk: () => void;
};

export function useCalloutState(
  initialMode: CalloutMode = "observe",
): CalloutUiState {
  const [mode, setMode] = useState<CalloutMode>(initialMode);
  const [selectedAxes, setSelectedAxes] = useState<readonly string[]>([]);
  const [askText, setAskText] = useState("");

  const toggleAxis = useCallback((axisId: string) => {
    setSelectedAxes((prev) =>
      prev.includes(axisId)
        ? prev.filter((id) => id !== axisId)
        : [...prev, axisId],
    );
  }, []);

  const setAxesFromDescriptors = useCallback(
    (axes: readonly CalloutIntentAxis[]) => {
      setSelectedAxes(axes.map((a) => a.id));
    },
    [],
  );

  const clearAsk = useCallback(() => setAskText(""), []);

  return {
    mode,
    setMode,
    selectedAxes,
    toggleAxis,
    setAxesFromDescriptors,
    askText,
    setAskText,
    clearAsk,
  };
}
