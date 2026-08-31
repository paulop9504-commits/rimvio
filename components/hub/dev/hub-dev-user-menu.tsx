"use client";

import { useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type HubDevUserMenuProps = {
  readonly liveUser?: {
    readonly id?: string;
    readonly name: string;
    readonly email: string | null;
    readonly avatarUrl: string | null;
  } | null;
  readonly className?: string;
};

export function HubDevUserMenu({ liveUser, className }: HubDevUserMenuProps) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const user =
    liveUser ??
    (auth.user
      ? {
          name:
            (auth.user.user_metadata?.full_name as string | undefined) ??
            (auth.user.user_metadata?.name as string | undefined) ??
            auth.user.email ??
            "User",
          email: auth.user.email ?? null,
          avatarUrl:
            (auth.user.user_metadata?.avatar_url as string | undefined) ??
            (auth.user.user_metadata?.picture as string | undefined) ??
            null,
        }
      : null);

  if (auth.loading) {
    return <div className={cn("size-8 animate-pulse rounded-full bg-[#e5e7eb]", className)} />;
  }

  if (!user) {
    return (
      <GoogleSignInButton
        size="sm"
        label="Google 로그인"
        busy={busy}
        className={className}
        onClick={() => {
          setBusy(true);
          void auth.signInWithGoogle("/hub/workspace").finally(() => setBusy(false));
        }}
      />
    );
  }

  const initials = user.name.slice(0, 1).toUpperCase();

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white py-0.5 pl-0.5 pr-2 shadow-sm hover:bg-[#fafafa]"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="size-7 rounded-full object-cover" />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[11px] font-bold text-white">
            {initials}
          </span>
        )}
        <span className="hidden max-w-[120px] truncate text-[11px] font-medium text-[#374151] sm:block">
          {user.name}
        </span>
        <ChevronDown className="size-3 text-[#9ca3af]" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-[#e5e7eb] bg-white p-2 shadow-lg">
            <p className="truncate px-2 py-1 text-[11px] font-semibold text-[#111827]">{user.name}</p>
            {user.email ? (
              <p className="truncate px-2 pb-2 text-[10px] text-[#9ca3af]">{user.email}</p>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void auth.signOut();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-[#374151] hover:bg-[#f3f4f6]"
            >
              <LogOut className="size-3.5" />
              로그아웃
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
