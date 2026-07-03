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
import { CaptureSheet } from "@/components/globe/capture-sheet";
import {
  RimvioNavChatIcon,
  RimvioNavFieldIcon,
  RimvioNavGlobeIcon,
  RimvioNavRecordIcon,
} from "@/components/nav/rimvio-ai-nav-icons";
import { useCopy } from "@/hooks/use-copy";
import { useFieldNavBadge } from "@/hooks/use-field-nav-badge";
import { useFieldSheet } from "@/components/field/field-sheet-provider";
import { subscribeOpenCaptureSheet, publishCaptureSheetOpen } from "@/lib/nav/open-capture-sheet-bridge";
import { openFieldDashboardFromBottomNav } from "@/lib/nav/field-dashboard-ingress";
import { isPrimaryNavGlobePath } from "@/lib/layers";
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

const NAV_ICON_SLOT =
  "rimvio-bottom-nav-slot pointer-events-none select-none flex items-center justify-center";

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
  switch (icon) {
    case "globe":
      return (
        <NavIconSlot>
          <RimvioNavGlobeIcon active={active} />
        </NavIconSlot>
      );
    case "field":
      return (
        <NavIconSlot>
          <RimvioNavFieldIcon active={active} />
        </NavIconSlot>
      );
    case "people":
      return (
        <NavIconSlot>
          <RimvioNavChatIcon active={active} />
        </NavIconSlot>
      );
    case "capture":
      return (
        <NavIconSlot>
          <RimvioNavRecordIcon active={active} />
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
}: {
  tab: NavTab;
  active: boolean;
  onNavigate: (href: string) => void;
  onCapture: () => void;
  className?: string;
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
        "rimvio-bottom-nav-tab relative z-[1] flex size-12 shrink-0 items-center justify-center border-0 bg-transparent p-0 transition-transform active:scale-[0.94] touch-manipulation",
        className,
      )}
    >
      <span
        className={cn(
          "rimvio-bottom-nav-icon-pill pointer-events-none relative flex items-center justify-center",
          active && !isCapture && "rimvio-bottom-nav-icon-pill--active",
        )}
      >
        <NavTabIcon icon={tab.icon} active={active} />
        {tab.badge != null && tab.badge > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 flex size-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-[#3182f6] px-0.5 text-[9px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(49,130,246,0.45)]"
            aria-hidden
          >
            {tab.badge > 9 ? "9+" : tab.badge}
          </span>
        ) : null}
      </span>
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
    <nav
      className={cn(GRID.navSide, "hidden lg:flex")}
      aria-label="Primary"
      data-surface="primary-nav"
    >
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
    <div
      className="rimvio-bottom-nav-pill"
      role="tablist"
      aria-label="Primary tabs"
      data-rimvio-bottom-nav-pill
    >
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
  fieldSheetOpen,
}: {
  tabs: NavTab[];
  pathname: string;
  onNavigate: (href: string) => void;
  onCapture: () => void;
  fieldSheetOpen: boolean;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  const bar = (
    <nav
      className={cn(GRID.navBottomFrame, "rimvio-bottom-nav-shell lg:hidden")}
      aria-label="Primary"
      data-testid="rimvio-bottom-nav"
      data-surface="primary-nav"
      data-rimvio-bottom-nav-portal
      data-field-sheet-blocked={fieldSheetOpen ? "true" : undefined}
      style={fieldSheetOpen ? { pointerEvents: "none", visibility: "hidden" } : undefined}
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
  const [captureOpen, setCaptureOpen] = useState(false);
  const lastNavRef = useRef<{ href: string; at: number } | null>(null);

  useEffect(() => {
    return subscribeOpenCaptureSheet(() => setCaptureOpen(true));
  }, []);

  useEffect(() => {
    publishCaptureSheetOpen(captureOpen);
  }, [captureOpen]);

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
        if (fieldSheetOpen) {
          closeFieldSheet();
          return;
        }
        openFieldDashboardFromBottomNav({
          tab: fieldSuggestedTab ?? "discovery",
        });
        return;
      }

      const isSame =
        (href === "/" && isPrimaryNavGlobePath(pathname)) ||
        pathname === href ||
        pathname.startsWith(`${href}/`);
      if (isSame) {
        return;
      }

      router.push(href);
    },
    [closeFieldSheet, fieldSheetOpen, fieldSuggestedTab, pathname, router],
  );

  const tabs = useMemo<NavTab[]>(
    () => [
      {
        href: "/",
        label: copy.nav.globe,
        isActive: (p) => isPrimaryNavGlobePath(p),
        icon: "globe",
      },
      {
        href: "/field",
        label: copy.nav.field,
        badge: fieldNavBadge > 0 ? fieldNavBadge : undefined,
        isActive: (p) =>
          fieldSheetOpen || p === "/field" || p.startsWith("/field/"),
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
    [copy, fieldNavBadge, fieldSheetOpen],
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
          fieldSheetOpen={fieldSheetOpen}
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
