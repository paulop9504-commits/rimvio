"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Send, Settings, Users } from "lucide-react";
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
  icon: "feed" | "peers" | "send" | "settings";
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
    <RimvioFeedMark
      filled={active}
      variant={drawn ? variant : null}
    />
  );
}

function IgSendIcon({ active }: { active: boolean }) {
  return (
    <Send
      className={cn("size-[1.625rem]", active ? "text-foreground" : "text-foreground/85")}
      strokeWidth={1.85}
    />
  );
}

function IgSettingsIcon({ active }: { active: boolean }) {
  return (
    <Settings
      className={cn("size-[1.625rem]", active ? "text-foreground" : "text-foreground/85")}
      strokeWidth={active ? 2.2 : 1.85}
    />
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
        <Users
          className={cn(
            "size-[1.625rem]",
            active ? "text-foreground" : "text-foreground/85"
          )}
          strokeWidth={active ? 2.2 : 1.85}
        />
      );
    case "send":
      return <IgSendIcon active={active} />;
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
              "flex items-center justify-center transition-opacity active:opacity-60",
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
        "mt-[var(--space-phi2)] flex justify-between rimvio-nav-bar px-[var(--space-phi2)] pt-[var(--space-u)] lg:hidden"
      )}
      aria-label="Primary"
    >
      <NavLinks
        tabs={tabs}
        pathname={pathname}
        filter={filter}
        guest={guest}
        linkClassName="size-10"
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
        "pb-[max(0.25rem,env(safe-area-inset-bottom))]"
      )}
      aria-label="Primary"
      data-testid="rimvio-bottom-nav"
    >
      <div className="flex h-[3.05rem] items-center justify-between px-[var(--space-phi2)]">
        <NavLinks
          tabs={tabs}
          pathname={pathname}
          filter={filter}
          guest={guest}
          linkClassName="size-11"
        />
      </div>
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
          p === "/" || p === "/feed" || p.startsWith("/feed/") || p.startsWith("/chat"),
        icon: "feed",
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
