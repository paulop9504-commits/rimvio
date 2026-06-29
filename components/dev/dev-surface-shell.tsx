import type { ReactNode } from "react";
import Link from "next/link";
import type { DevSurfaceNavId } from "@/lib/dev/rimvio-surface-tiers";
import { DEV_SURFACE_NAV } from "@/lib/dev/rimvio-surface-tiers";
import { cn } from "@/lib/utils";

type DevSurfaceShellProps = {
  active: DevSurfaceNavId;
  title: string;
  subtitle: string;
  children: ReactNode;
};

/** Dev-only chrome — switches between Context Ops and Dev Intelligence, never Field. */
export function DevSurfaceShell({
  active,
  title,
  subtitle,
  children,
}: DevSurfaceShellProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            dev-only
          </p>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <nav
          className="flex flex-wrap gap-1 rounded-xl border border-border/60 bg-muted/30 p-1"
          aria-label="Dev surfaces"
        >
          {DEV_SURFACE_NAV.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                active === item.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={active === item.id ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
      <p className="text-center text-[11px] text-muted-foreground">
        Field(거래·발견)는 제품 표면 — 하단 탭 「맞춤」에서만 열립니다.{" "}
        <span className="text-foreground/70">/metrics 에서 Field UI를 붙이지 않습니다.</span>
      </p>
    </div>
  );
}
