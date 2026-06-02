"use client";

import "@/lib/demo/experiment-lab-init";
import { Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/use-auth";
import { AutoLocaleBootstrap } from "@/components/auto-locale-bootstrap";
import { DevDemoSeed } from "@/components/dev-demo-seed";
import { ExperimentLabBootstrap } from "@/components/experiment-lab-bootstrap";
import { IosShareBanner } from "@/components/ios-share-banner";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import type { AppLocale } from "@/lib/i18n/types";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ReminderPoller } from "@/components/reminder-poller";
import { ServiceWorkerBootstrap } from "@/components/service-worker-bootstrap";
import { NativeBridgeBoot } from "@/components/native-bridge-boot";
import { Toaster } from "@/components/ui/sonner";

type ProvidersProps = {
  children: React.ReactNode;
  initialLocale: AppLocale;
};

export function Providers({ children, initialLocale }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <LocaleProvider initialLocale={initialLocale}>
        <AuthProvider>
          <AutoLocaleBootstrap />
          <Suspense fallback={null}>
            <ExperimentLabBootstrap />
          </Suspense>
          <DevDemoSeed />
          <IosShareBanner />
          {children}
          <ReminderPoller />
          <ServiceWorkerBootstrap />
          <NativeBridgeBoot />
          <PwaInstallPrompt />
        </AuthProvider>
      </LocaleProvider>
      <Toaster />
    </ThemeProvider>
  );
}
