"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  HUB_DEV_BUILD_NAV,
  HUB_DEV_CONNECT_NAV,
  HUB_DEV_HUB_NAV,
  HUB_DEV_OBSERVE_NAV,
  HUB_DEV_OPERATE_NAV,
  HUB_DEV_SHIP_NAV,
  type HubDevNavId,
} from "@/lib/hub/dev/platform-nav";

type HubDevSidebarProps = {
  platformName: string;
  platformTagline?: string;
  platformStatus: "Development" | "Preview" | "Production";
  activeNav: HubDevNavId;
  onNavChange: (id: HubDevNavId) => void;
  capabilityCount: number;
  testCount: number;
  version: string;
};

function NavButton({
  label,
  icon,
  active,
  badge,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors",
        active
          ? "bg-[#4593fc]/15 text-[#8ec0ff]"
          : "text-[#9aa3af] hover:bg-white/[0.04] hover:text-[#e2e8f0]",
      )}
    >
      <span className="w-4 shrink-0 text-center text-[11px]">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? (
        <span className="shrink-0 rounded bg-white/[0.06] px-1.5 text-[10px] text-[#6b7684]">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function HubDevSidebar({
  platformName,
  platformTagline,
  platformStatus,
  activeNav,
  onNavChange,
  capabilityCount,
  testCount,
  version,
}: HubDevSidebarProps) {
  const statusColor =
    platformStatus === "Production"
      ? "text-emerald-400"
      : platformStatus === "Preview"
        ? "text-amber-400"
        : "text-[#8ec0ff]";

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0e1014]">
      <div className="border-b border-white/[0.06] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">
          My Platforms
        </p>
        <p className="mt-1 truncate text-[13px] font-semibold text-[#f2f4f6]">{platformName}</p>
        <p className={cn("mt-0.5 text-[10px] font-medium", statusColor)}>● {platformStatus}</p>
        <p className="mt-1 text-[10px] text-[#6b7684]">
          {platformTagline ?? "Creator-operated Platform"}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 rimvio-scroll-touch">
        <NavSection
          title="Build"
          items={HUB_DEV_BUILD_NAV}
          activeNav={activeNav}
          onNavChange={onNavChange}
          badgeFor={(id) =>
            id === "capabilities" ? String(capabilityCount) : undefined
          }
        />
        <NavSection
          title="Ship"
          items={HUB_DEV_SHIP_NAV}
          activeNav={activeNav}
          onNavChange={onNavChange}
          badgeFor={(id) =>
            id === "tests" && testCount > 0
              ? String(testCount)
              : id === "versions"
                ? version
                : undefined
          }
        />
        <NavSection
          title="Operate"
          items={HUB_DEV_OPERATE_NAV}
          activeNav={activeNav}
          onNavChange={onNavChange}
        />
        <NavSection
          title="Connect"
          items={HUB_DEV_CONNECT_NAV}
          activeNav={activeNav}
          onNavChange={onNavChange}
        />
        <NavSection
          title="Observe"
          items={HUB_DEV_OBSERVE_NAV}
          activeNav={activeNav}
          onNavChange={onNavChange}
        />

        <div className="my-3 border-t border-white/[0.06]" />

        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-[#4b5563]">
          Hub
        </p>
        <div className="space-y-0.5">
          {HUB_DEV_HUB_NAV.map((item) => (
            <NavButton
              key={item.id}
              label={item.label}
              icon={item.icon}
              active={activeNav === item.id}
              onClick={() => onNavChange(item.id)}
            />
          ))}
          <Link
            href="/hub/workspace?nav=deployments"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#9aa3af] hover:bg-white/[0.04]"
          >
            <span className="w-4 text-center text-[11px]">↑</span>
            Publish
          </Link>
        </div>
      </nav>
    </aside>
  );
}

function NavSection({
  title,
  items,
  activeNav,
  onNavChange,
  badgeFor,
}: {
  title: string;
  items: readonly { id: HubDevNavId; label: string; icon: string }[];
  activeNav: HubDevNavId;
  onNavChange: (id: HubDevNavId) => void;
  badgeFor?: (id: HubDevNavId) => string | undefined;
}) {
  return (
    <>
      <p className="mb-1 mt-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-[#4b5563]">
        {title}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavButton
            key={item.id}
            label={item.label}
            icon={item.icon}
            active={activeNav === item.id}
            badge={badgeFor?.(item.id)}
            onClick={() => onNavChange(item.id)}
          />
        ))}
      </div>
    </>
  );
}
