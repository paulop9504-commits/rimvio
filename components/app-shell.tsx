import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { GlangoLogo } from "@/components/glango-logo";
import { GLANGO } from "@/lib/brand/glango";
import { glangoHeaderChromeClass } from "@/lib/brand/glango-neon-theme";
import { GOLDEN } from "@/lib/ui/golden-layout";
import { GRID } from "@/lib/ui/responsive-grid";
import { cn } from "@/lib/utils";

type AppShellProps = {
  title: string;
  subtitle?: string;
  /** Hide visible page title (kept for screen readers) */
  hideTitle?: boolean;
  immersive?: boolean;
  compact?: boolean;
  /** Grouped list surface — neon OS base layer */
  iosSurface?: boolean;
  /** Action Chat — feed renders its own header */
  hideBranding?: boolean;
  children: ReactNode;
};

export function AppShell({
  title,
  subtitle,
  hideTitle = false,
  immersive = false,
  compact = false,
  iosSurface = false,
  hideBranding = false,
  children,
}: AppShellProps) {
  return (
    <div className={GRID.viewport}>
      <div className={GRID.shell}>
        <Suspense fallback={null}>
          <AppNav placement="side" />
        </Suspense>

        <div
          className={cn(
            GRID.column,
            "flex h-dvh flex-col overflow-hidden",
            iosSurface ? "bg-glango-base" : "bg-glango-base"
          )}
        >
          <header
            className={
              hideBranding
                ? "sr-only"
                : immersive
                ? "absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-background/90 to-transparent px-[var(--space-phi)] pb-[var(--space-u)] pt-[max(0.75rem,env(safe-area-inset-top))]"
                : compact
                  ? cn(
                      glangoHeaderChromeClass,
                      "sticky top-0 z-10 px-[var(--space-phi)] pb-[var(--space-u)] pt-[max(0.75rem,env(safe-area-inset-top))]",
                      iosSurface ? "bg-glango-base/90" : "bg-glango-base/85",
                    )
                  : cn(
                      glangoHeaderChromeClass,
                      "sticky top-0 z-10 bg-glango-base/80 px-[var(--space-phi)] pb-[var(--space-phi)] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-2xl",
                    )
            }
          >
            <Link
              href="/"
              className={cn(
                "inline-flex items-center gap-2 transition-opacity hover:opacity-90",
                immersive &&
                  "rounded-full bg-background/55 px-2 py-1 backdrop-blur-md ring-1 ring-border/30"
              )}
              aria-label={`${GLANGO.name} 홈`}
            >
              <GlangoLogo
                size={immersive ? "xs" : "sm"}
                framed={!immersive}
                showWordmark
                showKo={!immersive}
                wordmarkClassName={cn(
                  immersive
                    ? "text-xs font-semibold uppercase tracking-[0.14em] text-foreground/90"
                    : "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                )}
              />
            </Link>
            <h1
              className={
                immersive || hideTitle
                  ? "sr-only"
                  : compact
                    ? "mt-[var(--space-u)] text-[22px] font-semibold tracking-tight text-foreground"
                    : "mt-2 text-[28px] font-semibold tracking-tight text-foreground"
              }
            >
              {title}
            </h1>
            {subtitle && !immersive && !compact ? (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </header>

          <main
            className={
              immersive
                ? "relative flex min-h-0 flex-1 flex-col pb-[var(--glango-bottom-nav-offset)] lg:pb-0"
                : compact
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                  : "flex-1 px-[var(--space-phi)] pb-[max(var(--space-phi2),env(safe-area-inset-bottom))]"
            }
          >
            {compact ? (
              <>
                <div
                  className={cn(
                    GOLDEN.shellBody,
                    "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
                    "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                    "px-[var(--space-phi)] pb-[var(--space-phi)]"
                  )}
                >
                  {children}
                </div>
                <Suspense
                  fallback={
                    <div className="h-[3.05rem] shrink-0 lg:hidden" aria-hidden />
                  }
                >
                  <AppNav placement="inline" />
                </Suspense>
              </>
            ) : (
              <>
                {children}
                {!immersive ? (
                  <Suspense
                    fallback={
                      <div className="h-[3.05rem] shrink-0 lg:hidden" aria-hidden />
                    }
                  >
                    <AppNav placement="inline" />
                  </Suspense>
                ) : null}
              </>
            )}
          </main>
        </div>
      </div>

      {immersive ? (
        <Suspense fallback={null}>
          <AppNav placement="fixed" immersive />
        </Suspense>
      ) : null}
    </div>
  );
}
