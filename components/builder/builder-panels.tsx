"use client";

import type { ReactNode } from "react";
import type { PlatformRir } from "@/lib/platform-builder/rir";
import { cn } from "@/lib/utils";

const MOCK_PRODUCTS = [
  { title: "로드 자전거", price: "₩350,000", loc: "강남" },
  { title: "맥북 프로", price: "₩890,000", loc: "서초" },
  { title: "책상", price: "₩120,000", loc: "송파" },
];

export function BuilderLivePreview({
  rir,
  platformName,
  showLocationOnCards,
}: {
  rir: PlatformRir | null;
  platformName: string;
  showLocationOnCards?: boolean;
}) {
  if (!rir) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-[15px] font-medium text-[#64748B]">Live Preview</p>
        <p className="mt-2 max-w-sm text-[13px] text-[#94A3B8]">
          아이디어를 설명하면 여기에 플랫폼 미리보기가 나타나요.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-lg flex-col bg-[#FAFBFC]">
      <header className="border-b border-[#E2E8F0] bg-white px-4 py-3">
        <p className="text-[16px] font-semibold text-[#0F172A]">{platformName}</p>
        <div className="mt-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-[13px] text-[#94A3B8]">
          Search products...
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-2">
          {MOCK_PRODUCTS.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-[#E2E8F0] bg-white p-2 shadow-sm"
            >
              <div className="mb-2 aspect-square rounded-lg bg-gradient-to-br from-[#EEF2FF] to-[#F1F5F9]" />
              <p className="truncate text-[11px] font-medium text-[#0F172A]">{item.title}</p>
              <p className="text-[10px] font-semibold text-[#6366F1]">{item.price}</p>
              {showLocationOnCards ? (
                <p className="text-[9px] text-[#94A3B8]">{item.loc}</p>
              ) : null}
            </div>
          ))}
        </div>
        {rir.pages.some((p) => p.id === "messages") ? (
          <p className="mt-4 text-center text-[10px] text-[#94A3B8]">+ Messages · Profile</p>
        ) : null}
      </div>
    </div>
  );
}

export function BuilderBlueprintPanel({
  rir,
  onGenerate,
  phase,
}: {
  rir: PlatformRir;
  onGenerate: () => void;
  phase: string;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <p className="text-[13px] font-semibold text-[#0F172A]">Platform Blueprint</p>
      <p className="mt-1 text-[12px] text-[#64748B]">{rir.product.summary}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <BlueprintSection title="Users">
          {rir.roles.map((r) => (
            <li key={r.id} className="font-mono text-[11px] text-[#64748B]">
              {r.label}
            </li>
          ))}
        </BlueprintSection>
        <BlueprintSection title="Objects">
          {rir.objects.map((o) => (
            <li key={o.id} className="font-mono text-[11px] text-[#64748B]">
              {o.label}
            </li>
          ))}
        </BlueprintSection>
        <BlueprintSection title="Actions">
          {rir.actions.map((a) => (
            <li key={a.id} className="font-mono text-[11px] text-[#64748B]">
              {a.label}
            </li>
          ))}
        </BlueprintSection>
        <BlueprintSection title="Pages">
          {rir.pages.map((p) => (
            <li key={p.id} className="font-mono text-[11px] text-[#64748B]">
              {p.label}
            </li>
          ))}
        </BlueprintSection>
      </div>

      {phase === "blueprint" ? (
        <button
          type="button"
          onClick={onGenerate}
          className="mt-4 w-full rounded-lg bg-[#6366F1] py-2.5 text-[13px] font-semibold text-white hover:bg-[#4F46E5]"
        >
          Generate Platform
        </button>
      ) : null}
    </div>
  );
}

function BlueprintSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-[#F8FAFC] p-3">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
        {title}
      </p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

export function BuilderProjectTree({
  rir,
  selectedId,
  onSelect,
}: {
  rir: PlatformRir | null;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const pages = rir?.pages ?? [
    { id: "home", label: "Home" },
    { id: "sell", label: "Sell" },
  ];
  const collections = rir?.objects ?? [];

  return (
    <nav className="space-y-4 text-[12px]">
      <div>
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
          Project
        </p>
        <ul className="space-y-0.5">
          {pages.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => onSelect(page.id)}
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-left",
                  selectedId === page.id
                    ? "bg-[#EEF2FF] font-semibold text-[#6366F1]"
                    : "text-[#64748B] hover:bg-[#F1F5F9]",
                )}
              >
                {page.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {collections.length > 0 ? (
        <div>
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
            Data
          </p>
          <ul className="space-y-0.5">
            {collections.map((obj) => (
              <li key={obj.id}>
                <button
                  type="button"
                  onClick={() => onSelect(`data:${obj.collection}`)}
                  className={cn(
                    "w-full rounded-md px-2 py-1.5 text-left font-mono text-[11px]",
                    selectedId === `data:${obj.collection}`
                      ? "bg-[#EEF2FF] text-[#6366F1]"
                      : "text-[#64748B] hover:bg-[#F1F5F9]",
                  )}
                >
                  {obj.collection}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}
