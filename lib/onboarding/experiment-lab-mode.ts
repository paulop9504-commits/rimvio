/** Dev experiment lab flag — L0 onboarding (not lib/demo). */
export const EXPERIMENT_LAB_FLAG = "rimvio-experiment-lab-v3";

export function isExperimentLabMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return localStorage.getItem(EXPERIMENT_LAB_FLAG) === "1";
}
