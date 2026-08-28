"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  FileCode2,
  FileJson,
  Folder,
  Play,
  Shield,
} from "lucide-react";
import type { TestRunStatus } from "@/lib/hub/capability/types";
import { cn } from "@/lib/utils";

type DeployFileId = "manifest" | "entry" | "schemas" | "package";

const FILE_TREE: { id: DeployFileId; label: string; icon: typeof FileJson }[] = [
  { id: "manifest", label: "manifest.json", icon: FileJson },
  { id: "entry", label: "src/capability/index.ts", icon: FileCode2 },
  { id: "schemas", label: "lib/schemas/", icon: Folder },
  { id: "package", label: "package.json", icon: FileJson },
];

type HubDeployEditorProps = {
  manifestJson: string;
  onManifestChange: (raw: string) => void;
  testStatus: TestRunStatus;
  testOutput: string;
  onRunTest: () => void;
  stepPanel: React.ReactNode;
  showStepPanel: boolean;
};

const PLACEHOLDER_ENTRY = `// Rimvio Capability entry — Sandbox Runtime
import { defineCapability } from "@rimvio/platform-sdk";

export default defineCapability({
  async run(ctx) {
  // Agent Workspace Patch → Projection
    return ctx.invoke("travel.plan_itinerary", ctx.input);
  },
});
`;

export function HubDeployEditor({
  manifestJson,
  onManifestChange,
  testStatus,
  testOutput,
  onRunTest,
  stepPanel,
  showStepPanel,
}: HubDeployEditorProps) {
  const [activeFile, setActiveFile] = useState<DeployFileId>("manifest");
  const [localJson, setLocalJson] = useState(manifestJson);

  useEffect(() => {
    setLocalJson(manifestJson);
  }, [manifestJson]);

  const displayContent = useMemo(() => {
    if (activeFile === "manifest") return localJson;
    if (activeFile === "entry") return PLACEHOLDER_ENTRY;
    if (activeFile === "package") {
      return JSON.stringify(
        { name: "@rimvio/capability-draft", version: "0.0.1", private: true },
        null,
        2,
      );
    }
    return `{
  "input": "travel.plan_itinerary.v1",
  "output": "travel.itinerary.v1"
}`;
  }, [activeFile, localJson]);

  const handleJsonBlur = () => {
    if (activeFile === "manifest" && localJson !== manifestJson) {
      onManifestChange(localJson);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#0c0e12]">
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[180px] shrink-0 border-r border-white/[0.06] bg-[#111318] p-2 md:block">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">
            Explorer
          </p>
          <ul className="space-y-0.5">
            {FILE_TREE.map((f) => {
              const Icon = f.icon;
              const active = activeFile === f.id;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setActiveFile(f.id)}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[11px]",
                      active
                        ? "bg-[#4593fc]/15 text-[#8ec0ff]"
                        : "text-[#b0b8c1] hover:bg-white/[0.04]",
                    )}
                  >
                    <Icon className="size-3.5 shrink-0 opacity-70" />
                    <span className="truncate font-mono">{f.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1 border-b border-white/[0.06] bg-[#111318] px-2 py-1.5">
            <span className="rounded-md bg-[#151820] px-2.5 py-1 font-mono text-[11px] text-[#8ec0ff]">
              {FILE_TREE.find((f) => f.id === activeFile)?.label}
            </span>
            {activeFile === "manifest" ? (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-[#6b7684]">
                <Shield className="size-3" />
                Sandbox
              </span>
            ) : null}
          </div>

          {showStepPanel && activeFile === "manifest" ? (
            <div className="max-h-[40%] shrink-0 overflow-y-auto border-b border-white/[0.06] bg-[#f8fafc] p-4 text-[#0f172a] rimvio-scroll-touch">
              {stepPanel}
            </div>
          ) : null}

          <textarea
            value={displayContent}
            onChange={(e) => {
              if (activeFile === "manifest") setLocalJson(e.target.value);
            }}
            onBlur={handleJsonBlur}
            readOnly={activeFile !== "manifest"}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none bg-[#0c0e12] p-4 font-mono text-[12px] leading-relaxed text-[#e2e8f0] focus:outline-none"
          />
        </div>
      </div>

      <div className="shrink-0 border-t border-white/[0.06] bg-[#111318]">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <ChevronRight className="size-3.5 text-[#6b7684]" />
            <span className="text-[11px] font-semibold text-[#b0b8c1]">실행 결과</span>
            {testStatus === "passed" ? (
              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                테스트 성공
              </span>
            ) : testStatus === "failed" ? (
              <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                실패
              </span>
            ) : testStatus === "running" ? (
              <span className="text-[10px] text-[#8ec0ff]">실행 중…</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onRunTest}
            disabled={testStatus === "running"}
            className="flex items-center gap-1.5 rounded-lg bg-[#4593fc] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#3a82e0] disabled:opacity-50"
          >
            <Play className="size-3.5" />
            샌드박스 테스트
          </button>
        </div>
        <pre className="max-h-28 overflow-auto border-t border-white/[0.06] bg-[#0c0e12] px-3 py-2 font-mono text-[10px] leading-relaxed text-[#6b7684] rimvio-scroll-touch">
          {testStatus === "running"
            ? "Sandbox Runtime 실행 중…"
            : testOutput || "테스트를 실행하면 결과가 여기에 표시됩니다."}
        </pre>
      </div>
    </div>
  );
}
