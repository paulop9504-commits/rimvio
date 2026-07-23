"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MaterializeVaultSyncMount } from "@/components/materialize-vault-sync-mount";
import { useAuth } from "@/hooks/use-auth";

type AuthGateProps = {
  children: ReactNode;
};

/**
 * Guest-first shell — never full-screen login at app start.
 * Login lives at Commit/payment (checkout) and cloud sync (peers/vault).
 * Soft UI: GuestPeersLanding · Field login strip · checkout login_required.
 */
export function AuthGate({ children }: AuthGateProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      {user ? <MaterializeVaultSyncMount /> : null}
      <div key={pathname}>{children}</div>
    </>
  );
}
