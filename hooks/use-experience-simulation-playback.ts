"use client";

import { useEffect } from "react";
import {
  advanceExperienceSimulationStep,
  readExperienceSimulationState,
  subscribeExperienceSimulation,
} from "@/lib/globe/experience-simulation";

const TICK_MS = 2200;

/** Auto-advance simulation cursor while playing. */
export function useExperienceSimulationPlayback(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const clearTimer = () => {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const sync = () => {
      const { playback, scenario } = readExperienceSimulationState();
      if (!scenario || !playback.playing) {
        clearTimer();
        return;
      }
      if (timer != null) {
        return;
      }
      timer = setInterval(() => {
        const advanced = advanceExperienceSimulationStep();
        if (!advanced) {
          clearTimer();
        }
      }, TICK_MS);
    };

    sync();
    return subscribeExperienceSimulation(() => {
      sync();
    });
  }, []);
}
