"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { shareDemoHref } from "@/lib/share/share-demo";

type AppNavProps = {
  immersive?: boolean;
};

function isShareSurface(pathname: string) {
  return pathname === "/" || pathname.startsWith("/now") || pathname.startsWith("/share");
}

function isInboxSurface(pathname: string) {
  return pathname.startsWith("/inbox");
}

export function AppNav({ immersive = false }: AppNavProps) {
  const pathname = usePathname() ?? "/";
  const shareActive = isShareSurface(pathname);
  const inboxActive = isInboxSurface(pathname);

  const baseClass = immersive
    ? "fixed inset-x-0 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md justify-center gap-6 text-[11px]"
    : "mt-8 flex justify-center gap-6 border-t border-border/40 pt-4 text-xs";

  const linkClass = (active: boolean) =>
    cn(
      "transition-colors",
      active
        ? "font-semibold text-foreground"
        : "text-muted-foreground hover:text-foreground"
    );

  return (
    <nav className={baseClass} aria-label="Primary">
      <Link href={shareDemoHref()} className={linkClass(shareActive)}>
        공유
      </Link>
      <Link href="/inbox" className={linkClass(inboxActive)}>
        Inbox
      </Link>
    </nav>
  );
}
