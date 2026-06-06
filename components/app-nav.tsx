"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  /** side = desktop rail; inline/fixed = mobile bottom bar (portaled to body) */
  placement?: "side" | "inline" | "fixed";
};

type NavTab = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
  icon: "feed" | "search" | "peers" | "settings";
};

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

const NAV_ICON_CLASS = "size-6 shrink-0";
const NAV_ICON_STROKE = 2;
const NAV_ICON_SLOT = "rimvio-bottom-nav-slot";

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

function NavLinks({
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
              "rimvio-bottom-nav-tab relative z-10 flex h-full w-full min-h-11 min-w-11 items-center justify-center transition-opacity active:opacity-60 touch-manipulation",
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
        <NavLinks
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
}: {
  tabs: NavTab[];
  pathname: string;
  guest: ReturnType<typeof useRoomGuest>;
}) {
  return (
    <>
      <div className="rimvio-bottom-nav-grid">
        <NavLinks tabs={tabs} pathname={pathname} guest={guest} />
      </div>
      <div className="rimvio-bottom-nav-safe" aria-hidden />
    </>
  );
}

function PortaledBottomNavBar({
  tabs,
  pathname,
  guest,
}: {
  tabs: NavTab[];
  pathname: string;
  guest: ReturnType<typeof useRoomGuest>;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const bar = (
    <nav
      className={cn(
        GRID.navBottomFrame,
        "lg:hidden",
        rimvioNavBarClass,
        "flex flex-col",
      )}
      aria-label="Primary"
      data-testid="rimvio-bottom-nav"
      data-rimvio-bottom-nav-portal
    >
      <BottomNavGrid tabs={tabs} pathname={pathname} guest={guest} />
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
    <PortaledBottomNavBar tabs={tabs} pathname={pathname} guest={guest} />
  );
}
