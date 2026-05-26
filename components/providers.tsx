"use client";

import { ThemeProvider } from "next-themes";
import { DevDemoSeed } from "@/components/dev-demo-seed";
import { Toaster } from "@/components/ui/sonner";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <DevDemoSeed />
      {children}
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: "rounded-2xl shadow-sm border-0",
          },
        }}
      />
    </ThemeProvider>
  );
}
