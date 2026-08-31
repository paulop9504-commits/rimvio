import { Suspense } from "react";
import { ExperienceAppShell } from "@/components/experience-app/experience-app-shell";

export const metadata = {
  title: "Experience — Rimvio",
  description: "같은 앱 · 역할만 다른 Experience",
};

export default function ExperienceAppPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#f4f6fb]" />}>
      <ExperienceAppShell />
    </Suspense>
  );
}
