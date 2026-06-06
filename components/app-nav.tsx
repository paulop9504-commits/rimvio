"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Globe2, Search, Settings, Users } from "lucide-react";
import { RimvioFeedMark } from "@/lib/brand/rimvio-feed-mark";
import { useCopy } from "@/hooks/use-copy";
import { useRoomGuest } from "@/hooks/use-room-guest";
import { rimvioNavBarClass } from "@/lib/brand/rimvio-neon-theme";
import { GRID } from "@/lib/ui/responsive-grid";
import { cn } from "@/lib/utils";

type AppNavProps = {
  immersive?: boolean;
  /** side = desktop rail; inline = compact pages; fixed = immersive feed bottom bar */
  placement?: "side" | "inline" | "fixed";
};

type NavTab = {
  href: string;
  label: string;
  isActive: (pathname: string, filter: string | null) => boolean;
  icon: "feed" | "globe" | "search" | "peers" | "settings";
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
    case "globe":
      return (
        <NavIconSlot>
          <Globe2
            className={cn(NAV_ICON_CLASS, active ? "text-sky-300" : "text-foreground/70")}
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
  filter,
  guest,
  linkClassName,
}: {
  tabs: NavTab[];
  pathname: string;
  filter: string | null;
  guest: ReturnType<typeof useRoomGuest>;
  linkClassName?: string;
}) {
  return (
    <>
      {tabs.map((tab) => {
        const active = tab.isActive(pathname, filter);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "mx-auto flex w-full items-center justify-center transition-opacity active:opacity-60 touch-manipulation",
              linkClassName
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
  filter,
  guest,
}: {
  tabs: NavTab[];
  pathname: string;
  filter: string | null;
  guest: ReturnType<typeof useRoomGuest>;
}) {
  return (
    <nav className={cn(GRID.navSide, "hidden lg:flex")} aria-label="Primary">
      <div className="flex flex-col items-center gap-[var(--space-phi2)]">
        <NavLinks
          tabs={tabs}
          pathname={pathname}
          filter={filter}
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
  filter,
  guest,
}: {
  tabs: NavTab[];
  pathname: string;
  filter: string | null;
  guest: ReturnType<typeof useRoomGuest>;
}) {
  return (
    <>
      <div className="rimvio-bottom-nav-grid">
        <NavLinks tabs={tabs} pathname={pathname} filter={filter} guest={guest} />
      </div>
      <div className="rimvio-bottom-nav-safe" aria-hidden />
    </>
  );
}

function InlineNavBar({
  tabs,
  pathname,
  filter,
  guest,
}: {
  tabs: NavTab[];
  pathname: string;
  filter: string | null;
  guest: ReturnType<typeof useRoomGuest>;
}) {
  return (
    <nav
      className={cn(
        "mt-[var(--space-phi2)] flex shrink-0 flex-col rimvio-nav-bar lg:hidden",
      )}
      aria-label="Primary"
    >
      <BottomNavGrid
        tabs={tabs}
        pathname={pathname}
        filter={filter}
        guest={guest}
      />
    </nav>
  );
}

function FixedBottomNavBar({
  tabs,
  pathname,
  filter,
  guest,
}: {
  tabs: NavTab[];
  pathname: string;
  filter: string | null;
  guest: ReturnType<typeof useRoomGuest>;
}) {
  return (
    <nav
      className={cn(
        GRID.navBottomFrame,
        "lg:hidden",
        rimvioNavBarClass,
        "flex flex-col",
      )}
      aria-label="Primary"
      data-testid="rimvio-bottom-nav"
    >
      <BottomNavGrid
        tabs={tabs}
        pathname={pathname}
        filter={filter}
        guest={guest}
      />
    </nav>
  );
}

export function AppNav({ immersive = false, placement }: AppNavProps) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");
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
        href: "/globe",
        label: copy.nav.globe,
        isActive: (p) => p === "/globe" || p.startsWith("/globe/"),
        icon: "globe",
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
    [copy]
  );

  const resolvedPlacement = placement ?? (immersive ? "fixed" : "inline");

  switch (resolvedPlacement) {
    case "side":
      return (
        <SideNavRail
          tabs={tabs}
          pathname={pathname}
          filter={filter}
          guest={guest}
        />
      );
    case "fixed":
      return (
        <FixedBottomNavBar
          tabs={tabs}
          pathname={pathname}
          filter={filter}
          guest={guest}
        />
      );
    case "inline":
      return (
        <InlineNavBar
          tabs={tabs}
          pathname={pathname}
          filter={filter}
          guest={guest}
        />
      );
  }
}
