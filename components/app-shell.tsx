import Link from "next/link";
import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";

type AppShellProps = {
  title: string;
  subtitle?: string;
  immersive?: boolean;
  children: ReactNode;
};

export function AppShell({
  title,
  subtitle,
  immersive = false,
  children,
}: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header
        className={
          immersive
            ? "absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-background/90 to-transparent px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]"
            : "sticky top-0 z-10 bg-background/80 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl"
        }
      >
        <Link
          href="/"
          className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Blink
        </Link>
        <h1
          className={
            immersive
              ? "mt-0.5 text-xl font-semibold tracking-tight text-foreground"
              : "mt-1 text-[28px] font-semibold tracking-tight text-foreground"
          }
        >
          {title}
        </h1>
        {subtitle && !immersive ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </header>

      <main
        className={
          immersive
            ? "flex-1 pb-[max(2.75rem,env(safe-area-inset-bottom))]"
            : "flex-1 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        }
      >
        {children}
        <AppNav immersive={immersive} />
      </main>
    </div>
  );
}
