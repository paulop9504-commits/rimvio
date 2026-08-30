/**
 * Active Experience role — same person, different Context.
 */

import type { ExperienceActor, ExperienceAppRole } from "@/lib/experience-app/types";

const KEY = "rimvio.experience-app.role.v1";

export const DEFAULT_ACTORS: Record<ExperienceAppRole, ExperienceActor> = {
  consumer: { userId: "user_102", role: "consumer" },
  merchant: { userId: "user_102", role: "merchant", storeId: "store_42" },
  courier: { userId: "user_102", role: "courier", courierId: "courier_7" },
};

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function readExperienceRole(): ExperienceAppRole {
  if (!canUseStorage()) return "consumer";
  const raw = window.localStorage.getItem(KEY);
  if (raw === "merchant" || raw === "courier" || raw === "consumer") return raw;
  return "consumer";
}

export function writeExperienceRole(role: ExperienceAppRole): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(KEY, role);
  window.dispatchEvent(new CustomEvent("rimvio:experience-role"));
}

export function readExperienceActor(role?: ExperienceAppRole): ExperienceActor {
  return DEFAULT_ACTORS[role ?? readExperienceRole()];
}

export function subscribeExperienceRole(listener: () => void): () => void {
  if (!canUseStorage()) return () => {};
  window.addEventListener("rimvio:experience-role", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("rimvio:experience-role", listener);
    window.removeEventListener("storage", listener);
  };
}
