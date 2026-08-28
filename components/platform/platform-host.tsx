"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { RimvioPlatformManifest } from "@/lib/platform-sdk/types";
import { cn } from "@/lib/utils";

const MOCK_LISTINGS = [
  { title: "로드 자전거", price: "₩350,000", loc: "강남" },
  { title: "맥북 프로 14", price: "₩890,000", loc: "서초" },
  { title: "책상", price: "₩120,000", loc: "송파" },
];

export type PlatformHostProps = {
  manifest: RimvioPlatformManifest;
  routePath: string;
  capabilityId?: string | null;
  className?: string;
};

function normalizePath(path: string): string {
  if (!path || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function PlatformHost({
  manifest,
  routePath,
  capabilityId,
  className,
}: PlatformHostProps) {
  const path = normalizePath(routePath);
  const platformName = manifest.package.name;

  const activeRoute = useMemo(() => {
    const routes = manifest.ui.routes;
    const exact = routes.find((r) => normalizePath(r.path) === path);
    if (exact) return exact;
    if (path.startsWith("/sell") || capabilityId?.includes("create")) {
      return routes.find((r) => r.path.includes("sell")) ?? routes[0];
    }
    if (path.startsWith("/product")) {
      return routes.find((r) => r.path.includes("product")) ?? routes[0];
    }
    if (path.startsWith("/messages")) {
      return routes.find((r) => r.path.includes("message")) ?? routes[0];
    }
    return routes.find((r) => r.path === "/") ?? routes[0];
  }, [capabilityId, manifest.ui.routes, path]);

  const navRoutes = manifest.ui.routes.filter((r) => !r.path.includes(":"));

  return (
    <div
      className={cn(
        "flex h-full min-h-[360px] flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white",
        className,
      )}
      data-platform-host={manifest.package.id}
      data-platform-route={path}
    >
      <header className="border-b border-[#E2E8F0] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[15px] font-semibold text-[#0F172A]">{platformName}</p>
          <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#6366F1]">
            L1 Native
          </span>
        </div>
        {navRoutes.length > 1 ? (
          <nav className="mt-2 flex gap-1 overflow-x-auto">
            {navRoutes.map((route) => (
              <span
                key={route.path}
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium",
                  normalizePath(route.path) === normalizePath(activeRoute?.path ?? "/")
                    ? "bg-[#6366F1] text-white"
                    : "bg-[#F1F5F9] text-[#64748B]",
                )}
              >
                {route.component}
              </span>
            ))}
          </nav>
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {renderRouteSurface({
          path,
          component: activeRoute?.component ?? "PlatformHome",
          capabilityId,
          platformName,
        })}
      </div>

      <footer className="border-t border-[#F1F5F9] px-4 py-2 text-[10px] text-[#94A3B8]">
        {manifest.package.id}
        {capabilityId ? ` · ${capabilityId}` : ""}
      </footer>
    </div>
  );
}

function renderRouteSurface(input: {
  path: string;
  component: string;
  capabilityId?: string | null;
  platformName: string;
}) {
  const { path, component, capabilityId, platformName } = input;

  if (path.startsWith("/sell") || component.toLowerCase().includes("sell")) {
    return (
      <div className="space-y-3">
        <h2 className="text-[14px] font-semibold text-[#0F172A]">상품 등록</h2>
        <div className="space-y-2">
          <div className="h-9 rounded-lg border border-[#E2E8F0] px-3 text-[12px] leading-9 text-[#94A3B8]">
            제목
          </div>
          <div className="h-9 rounded-lg border border-[#E2E8F0] px-3 text-[12px] leading-9 text-[#94A3B8]">
            가격
          </div>
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-[#CBD5E1] text-[11px] text-[#94A3B8]">
            사진 업로드 (최대 10장)
          </div>
        </div>
        <button
          type="button"
          className="w-full rounded-lg bg-[#6366F1] py-2 text-[12px] font-semibold text-white"
        >
          등록하기
        </button>
        {capabilityId ? (
          <p className="text-[10px] text-[#94A3B8]">Capability: {capabilityId}</p>
        ) : null}
      </div>
    );
  }

  if (path.startsWith("/messages") || component.toLowerCase().includes("message")) {
    return (
      <div className="space-y-2">
        <h2 className="text-[14px] font-semibold text-[#0F172A]">메시지</h2>
        <p className="text-[12px] text-[#64748B]">구매자와 판매자 대화</p>
      </div>
    );
  }

  if (path.startsWith("/profile") || component.toLowerCase().includes("profile")) {
    return (
      <div className="space-y-2">
        <h2 className="text-[14px] font-semibold text-[#0F172A]">프로필</h2>
        <p className="text-[12px] text-[#64748B]">판매자 · 구매자 프로필</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-[13px] text-[#94A3B8]">
        Search products...
      </div>
      <div className="grid grid-cols-3 gap-2">
        {MOCK_LISTINGS.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-[#E2E8F0] bg-white p-2 shadow-sm"
          >
            <div className="mb-2 aspect-square rounded-lg bg-gradient-to-br from-[#EEF2FF] to-[#F1F5F9]" />
            <p className="truncate text-[11px] font-medium">{item.title}</p>
            <p className="text-[10px] font-semibold text-[#6366F1]">{item.price}</p>
            <p className="text-[9px] text-[#94A3B8]">{item.loc}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-[11px] text-[#94A3B8]">{platformName} · Home</p>
    </div>
  );
}

export function PlatformHostLink({
  platformId,
  routePath,
  capabilityId,
  children,
  className,
}: {
  platformId: string;
  routePath: string;
  capabilityId?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const params = new URLSearchParams();
  params.set("path", routePath);
  if (capabilityId) params.set("capability", capabilityId);
  return (
    <Link
      href={`/platform/${encodeURIComponent(platformId)}?${params.toString()}`}
      className={className}
    >
      {children}
    </Link>
  );
}
