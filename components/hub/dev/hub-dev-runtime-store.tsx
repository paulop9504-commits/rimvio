"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RIMVIO_CORE_RUNTIME_STANDARD } from "@/lib/hub/dev/hub-registry-stores";
import {
  defaultRimvioRuntimeManifest,
  readRuntimeIndex,
  registerRuntimeFromManifest,
  subscribeRuntimeIndex,
  type RuntimeInterface,
  type RuntimeSupport,
  type RuntimeType,
} from "@/lib/hub/dev/runtime-registry";
import { buildRimvioRuntimeManifestJson, RUNTIME_PACKAGE_LAYOUT } from "@/lib/hub/dev/runtime-manifest";
import { appendDevExecutionLog } from "@/lib/hub/dev/execution-log";
import { resolveCapabilitiesForRuntime } from "@/lib/hub/dev/runtime-compatibility";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

const RUNTIME_TYPES: { id: RuntimeType; label: string }[] = [
  { id: "pc", label: "PC" },
  { id: "browser", label: "Browser" },
  { id: "industrial", label: "Industrial" },
  { id: "cloud", label: "Cloud" },
  { id: "mobile", label: "Mobile" },
];

const SUPPORTS: RuntimeSupport[] = ["camera", "plc", "sensor", "database", "network"];
const INTERFACES: RuntimeInterface[] = ["context", "event", "tool", "permission"];

type HubDevRuntimeStoreProps = {
  draft: PlatformDraft;
};

export function HubDevRuntimeStore({ draft }: HubDevRuntimeStoreProps) {
  const [tab, setTab] = useState<"list" | "create">("list");
  const [, bump] = useState(0);
  const [name, setName] = useState("Factory Runtime");
  const [type, setType] = useState<RuntimeType>("industrial");
  const [supports, setSupports] = useState<RuntimeSupport[]>(["plc", "sensor", "network"]);
  const [interfaces, setInterfaces] = useState<RuntimeInterface[]>([
    "context",
    "event",
    "tool",
    "permission",
  ]);
  const [selectedRuntimeId, setSelectedRuntimeId] = useState<string | null>(null);

  const ownerId = draft.operator?.name ?? draft.name;

  useEffect(() => subscribeRuntimeIndex(() => bump((n) => n + 1)), []);

  const runtimes = readRuntimeIndex();
  const selected = runtimes.find((r) => r.id === selectedRuntimeId) ?? null;
  const capCompat = useMemo(
    () =>
      selected
        ? resolveCapabilitiesForRuntime(
            selected.id,
            draft.actions.map((a) => a.name),
          )
        : [],
    [selected, draft.actions],
  );

  const handleUpload = useCallback(() => {
    const manifest = defaultRimvioRuntimeManifest({
      name,
      ownerCreatorId: ownerId,
      type,
    });
    const full = { ...manifest, supports, interfaces };
    registerRuntimeFromManifest(full, "published");
    appendDevExecutionLog({
      platformId: draft.id,
      platformName: draft.name,
      source: "runtime-upload",
      ok: true,
      detail: `Registered runtime ${name} (${type}) to Hub`,
    });
    setTab("list");
  }, [draft.id, draft.name, interfaces, name, ownerId, supports, type]);

  const manifestPreview = useMemo(() => {
    const m = defaultRimvioRuntimeManifest({ name, ownerCreatorId: ownerId, type });
    return buildRimvioRuntimeManifestJson({ ...m, supports, interfaces });
  }, [interfaces, name, ownerId, supports, type]);

  const toggle = <T extends string>(list: T[], item: T, set: (v: T[]) => void) => {
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
      <div className="mx-auto max-w-3xl">
        <p className="text-[10px] font-semibold uppercase text-[#64748b]">Runtime Store</p>
        <h2 className="mt-1 text-[20px] font-bold text-[#0f172a]">Hub Runtime Registry</h2>
        <p className="mt-1 text-[12px] text-[#64748b]">
          Core Runtime (Rimvio) + Extension Runtime (Creator). Protocol은 Rimvio Standard가
          통제합니다.
        </p>

        <div className="mt-4 flex gap-2">
          <TabButton active={tab === "list"} onClick={() => setTab("list")}>
            Runtimes
          </TabButton>
          <TabButton active={tab === "create"} onClick={() => setTab("create")}>
            + Create Runtime
          </TabButton>
        </div>

        <section className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-4 text-[11px]">
          <p className="font-semibold text-[#334155]">Rimvio Core Standard v{RIMVIO_CORE_RUNTIME_STANDARD.version}</p>
          <p className="mt-1 text-[#64748b]">
            {RIMVIO_CORE_RUNTIME_STANDARD.protocols.join(" · ")} — Dev Runtime은 이 위에서만
            구현합니다. securityPolicy = rimvio-enforced.
          </p>
        </section>

        {tab === "create" ? (
          <div className="mt-4 space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5">
            <label className="block text-[12px]">
              <span className="font-semibold text-[#334155]">Runtime Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
              />
            </label>

            <div>
              <p className="text-[12px] font-semibold text-[#334155]">Runtime Type</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {RUNTIME_TYPES.map((rt) => (
                  <label key={rt.id} className="flex items-center gap-1.5 text-[12px]">
                    <input
                      type="radio"
                      checked={type === rt.id}
                      onChange={() => setType(rt.id)}
                    />
                    {rt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[12px] font-semibold text-[#334155]">Supports</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SUPPORTS.map((s) => (
                  <label key={s} className="flex items-center gap-1 text-[11px]">
                    <input
                      type="checkbox"
                      checked={supports.includes(s)}
                      onChange={() => toggle(supports, s, setSupports)}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[12px] font-semibold text-[#334155]">Interfaces</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {INTERFACES.map((i) => (
                  <label key={i} className="flex items-center gap-1 text-[11px]">
                    <input
                      type="checkbox"
                      checked={interfaces.includes(i)}
                      onChange={() => toggle(interfaces, i, setInterfaces)}
                    />
                    {i}
                  </label>
                ))}
              </div>
            </div>

            <pre className="rounded-lg bg-[#0f172a] p-3 font-mono text-[10px] text-[#94a3b8]">
              {RUNTIME_PACKAGE_LAYOUT}
            </pre>

            <pre className="max-h-40 overflow-auto rounded-lg border border-[#E2E8F0] bg-[#f8fafc] p-3 font-mono text-[10px] text-[#475569]">
              {manifestPreview}
            </pre>

            <button
              type="button"
              onClick={handleUpload}
              className="w-full rounded-xl bg-[#6366f1] py-2.5 text-[13px] font-bold text-white"
            >
              Upload Runtime to Hub
            </button>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ul className="space-y-2">
              {runtimes.map((rt) => (
                <li key={rt.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRuntimeId(rt.id)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left",
                      selectedRuntimeId === rt.id
                        ? "border-[#6366f1] bg-[#eef2ff]"
                        : "border-[#E2E8F0] bg-white",
                    )}
                  >
                    <p className="text-[13px] font-semibold text-[#0f172a]">{rt.name}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-[#64748b]">
                      v{rt.version} · {rt.tier} · {rt.type}
                    </p>
                    <p className="mt-1 text-[10px] text-[#94a3b8]">Owner · {rt.ownerCreatorId}</p>
                  </button>
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
              {selected ? (
                <>
                  <p className="text-[12px] font-semibold text-[#334155]">
                    Capabilities on this Runtime
                  </p>
                  <ul className="mt-3 space-y-1 text-[11px]">
                    {capCompat.length === 0 ? (
                      <li className="text-[#94a3b8]">No capabilities in draft</li>
                    ) : (
                      capCompat.map((row) => (
                        <li
                          key={row.capabilityId}
                          className={row.compatible ? "text-emerald-700" : "text-[#94a3b8]"}
                        >
                          {row.compatible ? "✓" : "✕"} {row.capabilityId}
                        </li>
                      ))
                    )}
                  </ul>
                </>
              ) : (
                <p className="text-[12px] text-[#94a3b8]">Runtime을 선택하면 호환 Capability를 봅니다.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-[12px] font-semibold",
        active ? "bg-[#6366f1] text-white" : "bg-white text-[#64748b] ring-1 ring-[#E2E8F0]",
      )}
    >
      {children}
    </button>
  );
}
