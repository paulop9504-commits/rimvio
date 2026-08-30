"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import type { DevExecutionLogEntry } from "@/lib/hub/dev/execution-log";
import type { DevWorkspacePane } from "@/lib/hub/dev/dev-workspace-nav";

export function HubDevHelpSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <Sheet title="Dev Hub Help" onClose={onClose}>
      <ul className="space-y-2 text-[12px] text-[#374151]">
        <li>
          <span className="font-semibold">⌘K</span> — Command palette (Capabilities, Tests, Deploy)
        </li>
        <li>왼쪽 Build/Validate/Ship — 해당 Workspace를 현재 화면에서 엽니다.</li>
        <li>Quick Actions — Analyze / Fix / Tests / Preview / Publish는 Agent + 실행 루프에 연결됩니다.</li>
        <li>오른쪽 Operator — Chat은 실행, Changes는 diff, Terminal/Activity는 실행 기록입니다.</li>
      </ul>
      <Link
        href="/hub/standards"
        className="mt-4 inline-block text-[12px] font-semibold text-violet-700 hover:underline"
      >
        Rimvio Standards →
      </Link>
    </Sheet>
  );
}

export function HubDevNotificationSheet({
  open,
  onClose,
  snapshot,
  logs,
  onOpenPane,
}: {
  open: boolean;
  onClose: () => void;
  snapshot: DevProjectSnapshot;
  logs: readonly DevExecutionLogEntry[];
  onOpenPane: (pane: DevWorkspacePane) => void;
}) {
  if (!open) return null;
  return (
    <Sheet title="Notifications" onClose={onClose}>
      <p className="text-[10px] font-semibold uppercase text-[#9ca3af]">Activity</p>
      <ul className="mt-2 space-y-1.5">
        {snapshot.activities.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => {
                onOpenPane(item.status === "warning" ? "issues" : "status");
                onClose();
              }}
              className="w-full rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-left text-[11px] text-[#374151]"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[10px] font-semibold uppercase text-[#9ca3af]">Executions</p>
      <ul className="mt-2 space-y-1.5">
        {logs.slice(-8).reverse().map((log) => (
          <li key={log.id}>
            <button
              type="button"
              onClick={() => {
                onOpenPane(log.ok ? "tests" : "issues");
                onClose();
              }}
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-left text-[11px]"
            >
              <span className={log.ok ? "text-emerald-700" : "text-red-700"}>
                {log.ok ? "ok" : "fail"}
              </span>{" "}
              <span className="text-[#374151]">{log.detail}</span>
            </button>
          </li>
        ))}
        {logs.length === 0 ? (
          <li className="text-[11px] text-[#9ca3af]">아직 실행 기록이 없습니다.</li>
        ) : null}
      </ul>
    </Sheet>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-3">
          <p className="text-[13px] font-semibold text-[#111827]">{title}</p>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#9ca3af] hover:bg-[#f3f4f6]">
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}
