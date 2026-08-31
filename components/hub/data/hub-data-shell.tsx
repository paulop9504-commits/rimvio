"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type HubDataTopbarProps = {
  readonly role: "supplier" | "verifier" | "business";
  readonly displayName?: string;
};

export function HubDataTopbar({ role, displayName }: HubDataTopbarProps) {
  const roleLabel =
    role === "supplier" ? "공급자" : role === "business" ? "사업자" : "지원자 · 검수";
  const otherHref =
    role === "supplier"
      ? "/hub/data/verifier"
      : role === "business"
        ? "/hub/data/supplier"
        : "/hub/data/supplier";
  const otherLabel =
    role === "supplier" ? "지원자 패널" : role === "business" ? "공급자 패널" : "공급자 패널";
  const badgeClass =
    role === "business"
      ? "bg-sky-50 text-sky-800"
      : role === "supplier"
        ? "bg-emerald-50 text-emerald-800"
        : "bg-violet-50 text-violet-800";

  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white px-4">
      <div className="flex items-center gap-3">
        <Link href="/hub/data" className="text-[13px] font-bold text-[#111827]">
          Rimvio Data
        </Link>
        <span className="text-[#d1d5db]">/</span>
        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", badgeClass)}>
          {roleLabel}
        </span>
        {displayName ? (
          <span className="text-[11px] text-[#6b7280]">{displayName}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={otherHref}
          className="text-[11px] font-medium text-violet-600 hover:underline"
        >
          {otherLabel}
        </Link>
        <Link href="/hub" className="text-[11px] text-[#9ca3af] hover:text-[#6b7280]">
          Hub
        </Link>
      </div>
    </header>
  );
}

type HubDataSidebarProps<T extends string> = {
  readonly items: readonly { readonly id: T; readonly label: string }[];
  readonly active: T;
  readonly onSelect: (id: T) => void;
  readonly sectionLabel: string;
};

export function HubDataSidebar<T extends string>({
  items,
  active,
  onSelect,
  sectionLabel,
}: HubDataSidebarProps<T>) {
  return (
    <aside className="flex w-[168px] shrink-0 flex-col border-r border-[#e5e7eb] bg-[#fafafa] py-3">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wide text-[#9ca3af]">
        {sectionLabel}
      </p>
      <nav className="flex flex-col gap-0.5 px-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition-colors",
              active === item.id
                ? "bg-white text-[#111827] shadow-sm"
                : "text-[#6b7280] hover:bg-white/60 hover:text-[#374151]",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export function HubDataDemoBadge() {
  return (
    <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
      Dev · Sandbox
    </span>
  );
}
