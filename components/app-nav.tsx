"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Search, Settings, Users } from "lucide-react";
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
  icon: "feed" | "search" | "peers" | "settings";
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
      {tabs.map((tab) => {
        const active = tab.isActive(pathname);

        const go = () => {
          onNavigate(tab.href);
        };

        return (
          <a
            key={tab.href}
            href={tab.href}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            onPointerUp={(event) => {
              if (event.pointerType === "mouse" && event.button !== 0) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              go();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") {
                return;
              }
              event.preventDefault();
              go();
            }}
            className={cn(
              "rimvio-bottom-nav-tab relative z-10 flex h-full w-full min-h-11 min-w-11 items-center justify-center no-underline transition-opacity active:opacity-60 touch-manipulation",
            )}
          >
            <span className="pointer-events-none flex items-center justify-center">
              <NavTabIcon icon={tab.icon} active={active} guest={guest} />
            </span>
          </a>
        );
      })}
    </>
  );
}

function DesktopNavLinks({
  tabs,
  pathname,
  guest,
  linkClassName,
}: {
  tabs: NavTab[];
  pathname: string;
  guest: ReturnType<typeof useRoomGuest>;
  linkClassName?: string;
}) {
  return (
    <>
      {tabs.map((tab) => {
        const active = tab.isActive(pathname);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative z-10 flex min-h-11 min-w-11 items-center justify-center transition-opacity active:opacity-60 touch-manipulation",
              linkClassName,
            )}
          >
            <NavTabIcon icon={tab.icon} active={active} guest={guest} />
          </Link>
        );
      })}
    </>
  );
}

function SideNavRail({
  tabs,
  pathname,
  guest,
}: {
  tabs: NavTab[];
  pathname: string;
  guest: ReturnType<typeof useRoomGuest>;
}) {
  return (
    <nav className={cn(GRID.navSide, "hidden lg:flex")} aria-label="Primary">
      <div className="flex flex-col items-center gap-[var(--space-phi2)]">
        <DesktopNavLinks
          tabs={tabs}
          pathname={pathname}
          guest={guest}
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) {
    return null;
  }

  return createPortal(bar, document.body);
}

export function AppNav({ placement }: AppNavProps) {
  const pathname = usePathname() ?? "/";
  const copy = useCopy();
  const guest = useRoomGuest();
  const lastNavRef = useRef<{ href: string; at: number } | null>(null);

  const navigateMobile = useCallback(
    (href: string) => {
      if (isSameNavTab(href, pathname)) {
        return;
      }

      const now = Date.now();
      if (
        lastNavRef.current?.href === href &&
        now - lastNavRef.current.at < 480
      ) {
        return;
      }
      lastNavRef.current = { href, at: now };

      // Hard navigation: iOS/PWA often drops soft router transitions on bottom chrome.
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
    return <SideNavRail tabs={tabs} pathname={pathname} guest={guest} />;
  }

  return (
    <PortaledBottomNavBar
      tabs={tabs}
      pathname={pathname}
      guest={guest}
      onNavigate={navigateMobile}
    />
  );
}
