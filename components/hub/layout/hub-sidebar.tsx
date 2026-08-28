"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  FileText,
  Hammer,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAIN_NAV = [
  { label: "Discover", href: "/hub", icon: Search },
  { label: "My Capabilities", href: "/hub", icon: FileText },
  { label: "Analytics", href: "/hub", icon: BarChart3 },
  { label: "Community", href: "/hub", icon: MessageSquare },
  { label: "Docs", href: "/hub", icon: BookOpen },
] as const;

const DEV_NAV = [
  { label: "Dashboard", href: "/hub", icon: LayoutDashboard },
  { label: "Builder", href: "/hub/build", icon: Hammer },
  { label: "Submissions", href: "/hub/submit", icon: Upload },
  { label: "Capability", href: "/hub/submit/capability", icon: FileText },
  { label: "Platform", href: "/hub/submit/platform", icon: Layers },
  { label: "Settings", href: "/hub", icon: Settings },
] as const;

export function HubSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/hub/submit/capability") {
      return pathname.startsWith("/hub/submit/capability");
    }
    if (href === "/hub/submit/platform") {
      return pathname.startsWith("/hub/submit/platform");
    }
    if (href === "/hub/submit") {
      return pathname === "/hub/submit";
    }
    if (href === "/hub/build") {
      return pathname.startsWith("/hub/build");
    }
    return pathname === href;
  };

  return (
    <aside className="hidden w-[220px] shrink-0 flex-col bg-[#0F172A] text-white lg:flex">
      <div className="px-4 pb-4 pt-5">
        <Link href="/hub" className="text-[15px] font-bold tracking-tight text-white">
          Rimvio Hub <span className="text-[11px] font-semibold text-[#8ec0ff]">Beta</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-2 rimvio-scroll-touch">
        <div>
          <ul className="space-y-0.5">
            {MAIN_NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href && !pathname.startsWith("/hub/submit");
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-white/10 text-white"
                        : "text-[#94A3B8] hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
            Developer
          </p>
          <ul className="space-y-0.5">
            {DEV_NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-[#6366F1] text-white"
                        : "text-[#94A3B8] hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="m-3 rounded-xl bg-[#1E293B] p-4">
        <p className="text-[12px] font-semibold text-white">Need Help?</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#94A3B8]">
          Read the Submission Guide and Capability Contract docs.
        </p>
        <Link
          href="/hub"
          className="mt-2.5 inline-block text-[11px] font-semibold text-[#818CF8] hover:text-[#A5B4FC]"
        >
          Submission Guide →
        </Link>
        <Link
          href="/hub"
          className="mt-1 block text-[11px] font-semibold text-[#818CF8] hover:text-[#A5B4FC]"
        >
          Documentation →
        </Link>
      </div>
    </aside>
  );
}
