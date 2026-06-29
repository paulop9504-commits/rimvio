"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Globe, Plus, Sparkles, Users } from "lucide-react";
import { CaptureSheet } from "@/components/globe/capture-sheet";
import { useCopy } from "@/hooks/use-copy";
import { useFieldNavBadge } from "@/hooks/use-field-nav-badge";
import { useFieldSheet } from "@/components/field/field-sheet-provider";
import { subscribeOpenCaptureSheet } from "@/lib/nav/open-capture-sheet-bridge";
import { subscribeFieldSheetOpenState } from "@/lib/nav/field-sheet-bridge";
import { openFieldDashboardFromBottomNav } from "@/lib/nav/field-dashboard-ingress";
import { GRID } from "@/lib/ui/responsive-grid";
import { cn } from "@/lib/utils";

type AppNavProps = {
  immersive?: boolean;
  /** side = desktop rail; fixed = mobile bottom bar (portaled to body) */
  placement?: "side" | "inline" | "fixed";
};

type NavTab = {
  href?: string;
  action?: "capture";
  label: string;
  isActive: (pathname: string) => boolean;
  icon: "globe" | "field" | "people" | "capture";
  badge?: number;
};

function isGlobePath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/feed" ||
    pathname.startsWith("/feed/") ||
    pathname === "/globe" ||
    pathname.startsWith("/globe/")
  );
}

const NAV_ICON_CLASS = "size-[22px] shrink-0 pointer-events-none";
const NAV_ICON_STROKE = 2;
const NAV_ICON_STROKE_ACTIVE = 2.35;
const NAV_CAPTURE_ICON_CLASS = "size-[22px] shrink-0 pointer-events-none";
const NAV_ICON_SLOT =
  "rimvio-bottom-nav-slot pointer-events-none select-none";

function NavIconSlot({ children }: { children: ReactNode }) {
  return (
    <span className={NAV_ICON_SLOT} aria-hidden>
      {children}
    </span>
  );
}

function NavTabIcon({
  icon,
  active,
}: {
  icon: NavTab["icon"];
  active: boolean;
}) {
  const inactiveTone = "text-[#94a3b8]/75";
  const stroke = active ? NAV_ICON_STROKE_ACTIVE : NAV_ICON_STROKE;
  switch (icon) {
    case "globe":
      return (
        <NavIconSlot>
          <Globe
            className={cn(
              NAV_ICON_CLASS,
              active ? "text-[#0284c7] fill-sky-200/55" : inactiveTone,
            )}
            strokeWidth={stroke}
          />
        </NavIconSlot>
      );
    case "field":
      return (
        <NavIconSlot>
          <Sparkles
            className={cn(
              NAV_ICON_CLASS,
              active ? "text-[#3182f6] fill-sky-100/70" : inactiveTone,
            )}
            strokeWidth={stroke}
          />
        </NavIconSlot>
      );
    case "people":
      return (
        <NavIconSlot>
          <Users
            className={cn(
              NAV_ICON_CLASS,
              active ? "text-[#7c3aed] fill-violet-200/50" : inactiveTone,
            )}
            strokeWidth={stroke}
          />
        </NavIconSlot>
      );
    case "capture":
      return (
        <NavIconSlot>
          <Plus
            className={cn(NAV_CAPTURE_ICON_CLASS, "text-[#f472b6]/85")}
            strokeWidth={stroke}
          />
        </NavIconSlot>
      );
  }
}

function NavTabButton({
  tab,
  active,
  onNavigate,
  onCapture,
  className,
  showLabel = false,
}: {
  tab: NavTab;
  active: boolean;
  onNavigate: (href: string) => void;
  onCapture: () => void;
  className?: string;
  showLabel?: boolean;
}) {
  const activatedRef = useRef(false);

  const activate = () => {
    if (tab.action === "capture") {
      onCapture();
      return;
    }
    if (tab.href) {
      onNavigate(tab.href);
    }
  };

  const isCapture = tab.action === "capture";

  return (
    <button
      type="button"
      aria-label={tab.label}
      aria-current={active ? "page" : undefined}
      data-nav-href={tab.href ?? "capture"}
      data-nav-action={tab.action}
      onPointerUp={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        activatedRef.current = true;
        activate();
        window.setTimeout(() => {
          activatedRef.current = false;
        }, 400);
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (activatedRef.current) {
          return;
        }
        activate();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        activate();
      }}
      className={cn(
        "rimvio-bottom-nav-tab relative z-10 flex shrink-0 flex-col items-center justify-center gap-0.5 border-0 bg-transparent p-0 transition-transform active:scale-95 touch-manipulation",
        showLabel ? "h-auto min-h-11 w-[3.75rem] py-0.5" : "h-11 w-11",
        tab.action === "capture" && "active:[&_.rimvio-bottom-nav-icon-pill]:bg-rose-100/70",
        className,
      )}
    >
      <span
        className={cn(
          "rimvio-bottom-nav-icon-pill pointer-events-none relative",
          active && !isCapture && "rimvio-bottom-nav-icon-pill--active",
        )}
      >
        <NavTabIcon icon={tab.icon} active={active} />
        {tab.badge != null && tab.badge > 0 ? (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-extrabold leading-none tabular-nums",
              active ? "bg-[#3182f6] text-white" : "bg-[#3182f6] text-white shadow-sm",
            )}
            aria-hidden
          >
            {tab.badge > 9 ? "9+" : tab.badge}
          </span>
        ) : null}
      </span>
      {showLabel ? (
        <span
          className={cn(
            "pointer-events-none max-w-full truncate text-[10px] font-semibold leading-none",
            active && !isCapture ? "text-[#191f28]" : "text-[#8b95a1]",
          )}
        >
          {tab.label}
        </span>
      ) : null}
    </button>
  );
}

function MobileNavLinks({
  tabs,
  pathname,
  onNavigate,
  onCapture,
}: {
  tabs: NavTab[];
  pathname: string;
  onNavigate: (href: string) => void;
  onCapture: () => void;
}) {
  return (
    <>
      {tabs.map((tab) => (
        <NavTabButton
          key={tab.href ?? tab.action ?? tab.label}
          tab={tab}
          active={tab.isActive(pathname)}
          onNavigate={onNavigate}
          onCapture={onCapture}
          showLabel
        />
      ))}
    </>
  );
}

function SideNavLinks({
  tabs,
  pathname,
  onNavigate,
  onCapture,
  linkClassName,
}: {
  tabs: NavTab[];
  pathname: string;
  onNavigate: (href: string) => void;
  onCapture: () => void;
  linkClassName?: string;
}) {
  return (
    <>
      {tabs.map((tab) => (
        <NavTabButton
          key={tab.href ?? tab.action ?? tab.label}
          tab={tab}
          active={tab.isActive(pathname)}
          onNavigate={onNavigate}
          onCapture={onCapture}
          className={linkClassName}
        />
      ))}
    </>
  );
}

function SideNavRail({
  tabs,
  pathname,
  onNavigate,
  onCapture,
}: {
  tabs: NavTab[];
  pathname: string;
  onNavigate: (href: string) => void;
  onCapture: () => void;
}) {
  return (
    <nav className={cn(GRID.navSide, "hidden lg:flex")} aria-label="Primary">
      <div className="flex flex-col items-center gap-[var(--space-phi2)]">
        <SideNavLinks
          tabs={tabs}
          pathname={pathname}
          onNavigate={onNavigate}
          onCapture={onCapture}
          linkClassName="size-11 rounded-2xl hover:bg-foreground/[0.04]"
        />
      </div>
    </nav>
  );
}

function BottomNavGrid({
  tabs,
  pathname,
  onNavigate,
  onCapture,
}: {
  tabs: NavTab[];
  pathname: string;
  onNavigate: (href: string) => void;
  onCapture: () => void;
}) {
  return (
    <div className="rimvio-bottom-nav-pill" role="tablist">
      <MobileNavLinks
        tabs={tabs}
        pathname={pathname}
        onNavigate={onNavigate}
        onCapture={onCapture}
      />
    </div>
  );
}

function PortaledBottomNavBar({
  tabs,
  pathname,
  onNavigate,
  onCapture,
}: {
  tabs: NavTab[];
  pathname: string;
  onNavigate: (href: string) => void;
  onCapture: () => void;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  const bar = (
    <nav
      className={cn(GRID.navBottomFrame, "rimvio-bottom-nav-shell lg:hidden")}
      aria-label="Primary"
      data-testid="rimvio-bottom-nav"
      data-rimvio-bottom-nav-portal
    >
      <BottomNavGrid
        tabs={tabs}
        pathname={pathname}
        onNavigate={onNavigate}
        onCapture={onCapture}
      />
    </nav>
  );

  return createPortal(bar, document.body);
}

export function AppNav({ placement }: AppNavProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const copy = useCopy();
  const { open: fieldSheetOpen, closeFieldSheet } = useFieldSheet();
  const { total: fieldNavBadge, suggestedTab: fieldSuggestedTab } = useFieldNavBadge();
  const [fieldSheetSignalOpen, setFieldSheetSignalOpen] = useState(false);
  const fieldTabActive = fieldSheetOpen || fieldSheetSignalOpen;
  const [captureOpen, setCaptureOpen] = useState(false);
  const lastNavRef = useRef<{ href: string; at: number } | null>(null);

  useEffect(() => {
    return subscribeOpenCaptureSheet(() => setCaptureOpen(true));
  }, []);

  useEffect(() => {
    return subscribeFieldSheetOpenState(setFieldSheetSignalOpen);
  }, []);

  useEffect(() => {
    router.prefetch("/peers");
  }, [router]);

  const navigate = useCallback(
    (href: string) => {
      const now = Date.now();
      if (
        lastNavRef.current?.href === href &&
        now - lastNavRef.current.at < 420
      ) {
        return;
      }
      lastNavRef.current = { href, at: now };

      if (href === "/field") {
        if (fieldTabActive) {
          closeFieldSheet();
          return;
        }
        openFieldDashboardFromBottomNav({ tab: fieldSuggestedTab });
        return;
      }

      const isSame =
        (href === "/" && isGlobePath(pathname)) ||
        pathname === href ||
        pathname.startsWith(`${href}/`);
      if (isSame) {
        return;
      }

      router.push(href);
    },
    [closeFieldSheet, fieldSuggestedTab, fieldTabActive, pathname, router],
  );

  const tabs = useMemo<NavTab[]>(
    () => [
      {
        href: "/",
        label: copy.nav.globe,
        isActive: (p) => isGlobePath(p),
        icon: "globe",
      },
      {
        href: "/field",
        label: copy.nav.field,
        badge: fieldNavBadge > 0 ? fieldNavBadge : undefined,
        isActive: (p) =>
          fieldTabActive || p === "/field" || p.startsWith("/field/"),
        icon: "field",
      },
      {
        href: "/peers",
        label: copy.nav.people,
        isActive: (p) => p.startsWith("/peers"),
        icon: "people",
      },
      {
        action: "capture",
        label: copy.nav.capture,
        isActive: () => false,
        icon: "capture",
      },
    ],
    [copy, fieldNavBadge, fieldTabActive],
  );

  const navChrome = (
    <>
      {placement === "side" ? (
        <SideNavRail
          tabs={tabs}
          pathname={pathname}
          onNavigate={navigate}
          onCapture={() => setCaptureOpen(true)}
        />
      ) : (
        <PortaledBottomNavBar
          tabs={tabs}
          pathname={pathname}
          onNavigate={navigate}
          onCapture={() => setCaptureOpen(true)}
        />
      )}
      <CaptureSheet open={captureOpen} onOpenChange={setCaptureOpen} />
    </>
  );

  if (placement === "side") {
    return navChrome;
  }

  return navChrome;
}
