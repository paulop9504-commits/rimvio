"use client";

import {
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Calendar, Search, Settings, Users } from "lucide-react";
import { RimvioFeedMark } from "@/lib/brand/rimvio-feed-mark";
import { useCopy } from "@/hooks/use-copy";
import { useRoomGuest } from "@/hooks/use-room-guest";
import { rimvioNavBarClass } from "@/lib/brand/rimvio-neon-theme";
import { GRID } from "@/lib/ui/responsive-grid";
import { cn } from "@/lib/utils";

type AppNavProps = {
  immersive?: boolean;
  /** side = desktop rail; fixed = mobile bottom bar (portaled to body) */
  placement?: "side" | "inline" | "fixed";
};

type NavTab = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
  icon: "feed" | "search" | "calendar" | "peers" | "settings";
};

function isSameNavTab(href: string, pathname: string): boolean {
  if (href === "/feed") {
    return (
      pathname === "/" ||
      pathname === "/feed" ||
      pathname.startsWith("/feed/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function IgFeedIcon({
  active,
  variant,
  drawn,
}: {
  active: boolean;
  variant: ReturnType<typeof useRoomGuest>["avatarVariant"];
  drawn: boolean;
}) {
  return (
    <span className={NAV_ICON_SLOT} aria-hidden>
      <RimvioFeedMark
        filled={active}
        variant={drawn ? variant : null}
        nav
      />
    </span>
  );
}

const NAV_ICON_CLASS = "size-6 shrink-0 pointer-events-none";
const NAV_ICON_STROKE = 2;
const NAV_ICON_SLOT =
  "rimvio-bottom-nav-slot pointer-events-none select-none";

function NavIconSlot({ children }: { children: ReactNode }) {
  return (
    <span className={NAV_ICON_SLOT} aria-hidden>
      {children}
    </span>
  );
}

function IgSearchIcon({ active }: { active: boolean }) {
  return (
    <NavIconSlot>
      <Search
        className={cn(NAV_ICON_CLASS, active ? "text-foreground" : "text-foreground/70")}
        strokeWidth={NAV_ICON_STROKE}
      />
    </NavIconSlot>
  );
}

function IgSettingsIcon({ active }: { active: boolean }) {
  return (
    <NavIconSlot>
      <Settings
        className={cn(NAV_ICON_CLASS, active ? "text-foreground" : "text-foreground/70")}
        strokeWidth={NAV_ICON_STROKE}
      />
    </NavIconSlot>
  );
}

function NavTabIcon({
  icon,
  active,
  guest,
}: {
  icon: NavTab["icon"];
  active: boolean;
  guest: ReturnType<typeof useRoomGuest>;
}) {
  switch (icon) {
    case "feed":
      return (
        <IgFeedIcon
          active={active}
          variant={guest.avatarVariant}
          drawn={guest.avatarDrawn}
        />
      );
    case "calendar":
      return (
        <NavIconSlot>
          <Calendar
            className={cn(NAV_ICON_CLASS, active ? "text-foreground" : "text-foreground/70")}
            strokeWidth={NAV_ICON_STROKE}
          />
        </NavIconSlot>
      );
    case "peers":
      return (
        <NavIconSlot>
          <Users
            className={cn(NAV_ICON_CLASS, active ? "text-foreground" : "text-foreground/70")}
            strokeWidth={NAV_ICON_STROKE}
          />
        </NavIconSlot>
      );
    case "search":
      return <IgSearchIcon active={active} />;
    case "settings":
      return <IgSettingsIcon active={active} />;
  }
}

function NavTabButton({
  tab,
  active,
  guest,
  onNavigate,
  className,
}: {
  tab: NavTab;
  active: boolean;
  guest: ReturnType<typeof useRoomGuest>;
  onNavigate: (href: string) => void;
  className?: string;
}) {
  const activate = () => {
    onNavigate(tab.href);
  };

  return (
    <button
      type="button"
      aria-label={tab.label}
      aria-current={active ? "page" : undefined}
      data-nav-href={tab.href}
      onTouchEnd={(event) => {
        event.preventDefault();
        event.stopPropagation();
        activate();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
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
        "rimvio-bottom-nav-tab relative z-10 flex h-full w-full min-h-11 min-w-11 items-center justify-center border-0 bg-transparent p-0 transition-opacity active:opacity-60 touch-manipulation",
        className,
      )}
    >
      <span className="pointer-events-none flex items-center justify-center">
        <NavTabIcon icon={tab.icon} active={active} guest={guest} />
      </span>
    </button>
  );
}

function MobileNavLinks({
  tabs,
  pathname,
  guest,
  onNavigate,
}: {
  tabs: NavTab[];
  pathname: string;
  guest: ReturnType<typeof useRoomGuest>;
  onNavigate: (href: string) => void;
}) {
  return (
    <>
      {tabs.map((tab) => (
        <NavTabButton
          key={tab.href}
          tab={tab}
          active={tab.isActive(pathname)}
          guest={guest}
          onNavigate={onNavigate}
        />
      ))}
    </>
  );
}

function SideNavLinks({
  tabs,
  pathname,
  guest,
  onNavigate,
  linkClassName,
}: {
  tabs: NavTab[];
  pathname: string;
  guest: ReturnType<typeof useRoomGuest>;
  onNavigate: (href: string) => void;
  linkClassName?: string;
}) {
  return (
    <>
      {tabs.map((tab) => (
        <NavTabButton
          key={tab.href}
          tab={tab}
          active={tab.isActive(pathname)}
          guest={guest}
          onNavigate={onNavigate}
          className={linkClassName}
        />
      ))}
    </>
  );
}

function SideNavRail({
  tabs,
  pathname,
  guest,
  onNavigate,
}: {
  tabs: NavTab[];
  pathname: string;
  guest: ReturnType<typeof useRoomGuest>;
  onNavigate: (href: string) => void;
}) {
  return (
    <nav className={cn(GRID.navSide, "hidden lg:flex")} aria-label="Primary">
      <div className="flex flex-col items-center gap-[var(--space-phi2)]">
        <SideNavLinks
          tabs={tabs}
          pathname={pathname}
          guest={guest}
          onNavigate={onNavigate}
          linkClassName="size-11 rounded-2xl hover:bg-foreground/[0.04]"
        />
      </div>
    </nav>
  );
}

function BottomNavGrid({
  tabs,
  pathname,
  guest,
  onNavigate,
}: {
  tabs: NavTab[];
  pathname: string;
  guest: ReturnType<typeof useRoomGuest>;
  onNavigate: (href: string) => void;
}) {
  return (
    <>
      <div className="rimvio-bottom-nav-safe" aria-hidden />
      <div className="rimvio-bottom-nav-grid">
        <MobileNavLinks
          tabs={tabs}
          pathname={pathname}
          guest={guest}
          onNavigate={onNavigate}
        />
      </div>
    </>
  );
}

function PortaledBottomNavBar({
  tabs,
  pathname,
  guest,
  onNavigate,
}: {
  tabs: NavTab[];
  pathname: string;
  guest: ReturnType<typeof useRoomGuest>;
  onNavigate: (href: string) => void;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  const bar = (
    <nav
      className={cn(
        GRID.navBottomFrame,
        "rimvio-bottom-nav-shell lg:hidden",
        rimvioNavBarClass,
        "flex flex-col",
      )}
      aria-label="Primary"
      data-testid="rimvio-bottom-nav"
      data-rimvio-bottom-nav-portal
    >
      <BottomNavGrid
        tabs={tabs}
        pathname={pathname}
        guest={guest}
        onNavigate={onNavigate}
      />
    </nav>
  );

  return createPortal(bar, document.body);
}

export function AppNav({ placement }: AppNavProps) {
  const pathname = usePathname() ?? "/";
  const copy = useCopy();
  const guest = useRoomGuest();
  const lastNavRef = useRef<{ href: string; at: number } | null>(null);

  const navigate = useCallback(
    (href: string) => {
      if (isSameNavTab(href, pathname)) {
        return;
      }

      const now = Date.now();
      if (
        lastNavRef.current?.href === href &&
        now - lastNavRef.current.at < 420
      ) {
        return;
      }
      lastNavRef.current = { href, at: now };

      window.location.assign(href);
    },
    [pathname],
  );

  const tabs = useMemo<NavTab[]>(
    () => [
      {
        href: "/feed",
        label: copy.nav.feed,
        isActive: (p) =>
          p === "/" || p === "/feed" || p.startsWith("/feed/"),
        icon: "feed",
      },
      {
        href: "/search",
        label: copy.nav.search,
        isActive: (p) => p === "/search" || p.startsWith("/search/"),
        icon: "search",
      },
      {
        href: "/calendar",
        label: copy.nav.calendar,
        isActive: (p) => p === "/calendar" || p.startsWith("/calendar/"),
        icon: "calendar",
      },
      {
        href: "/peers",
        label: copy.nav.peers,
        isActive: (p) => p.startsWith("/peers"),
        icon: "peers",
      },
      {
        href: "/welcome",
        label: copy.nav.settings,
        isActive: (p) => p.startsWith("/welcome") || p.startsWith("/privacy"),
        icon: "settings",
      },
    ],
    [copy],
  );

  if (placement === "side") {
    return (
      <SideNavRail
        tabs={tabs}
        pathname={pathname}
        guest={guest}
        onNavigate={navigate}
      />
    );
  }

  return (
    <PortaledBottomNavBar
      tabs={tabs}
      pathname={pathname}
      guest={guest}
      onNavigate={navigate}
    />
  );
}
