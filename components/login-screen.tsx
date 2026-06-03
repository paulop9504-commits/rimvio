"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AuthSetupPanel } from "@/components/auth-setup-panel";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { RimvioLogo } from "@/components/rimvio-logo";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";

export function LoginScreen() {
  const copy = useCopy();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { configured, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  const nextPath =
    searchParams.get("next") ??
    (pathname && pathname !== "/auth/callback" ? pathname : "/feed");

  if (!configured) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-rimvio-base px-6 py-10">
        <div className="w-full max-w-sm">
          <AuthSetupPanel variant="card" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-rimvio-base px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <RimvioLogo size="lg" appearance="white" className="mx-auto" />

        <p className="mt-8 text-[15px] font-medium leading-snug text-foreground/90">
          {copy.auth.loginTagline}
        </p>

        <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
          {copy.auth.loginPrompt}
        </p>

        <div className="mt-8">
          <GoogleSignInButton
            label={copy.auth.googleLogin}
            busy={busy}
            onClick={() => {
              setBusy(true);
              void signInWithGoogle(nextPath)
                .catch(() => {
                  toast.error(copy.auth.loginFail, {
                    description: copy.auth.loginFailHint,
                  });
                  setBusy(false);
                });
            }}
          />
        </div>
      </div>
    </div>
  );
}
