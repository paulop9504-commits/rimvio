"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const COMMANDS = [
  { id: "ai", label: "Ask AI", hint: "Open AI Build" },
  { id: "cap", label: "Open Capabilities", hint: "Capability list" },
  { id: "loop", label: "Open Loop Builder", hint: "Visual · AI · Code → one Loop" },
  { id: "config", label: "View Configuration", hint: "Manifest · Permissions" },
  { id: "test", label: "Run Tests", hint: "Agent simulation" },
  { id: "deploy", label: "Deploy", hint: "Sandbox → Production" },
  { id: "publish", label: "Publish to Hub", hint: "Registry" },
  { id: "logs", label: "Open Logs", hint: "Execution trace" },
  { id: "runtime", label: "Open Runtime", hint: "Health" },
] as const;

type HubDevCommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
};

export function HubDevCommandPalette({ open, onClose, onSelect }: HubDevCommandPaletteProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-[15vh] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#e5e7eb] bg-white shadow-2xl">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Create Capability · Ask AI · Deploy · Publish…"
          className="w-full border-b border-[#f3f4f6] bg-transparent px-4 py-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none"
        />
        <ul className="max-h-64 overflow-y-auto p-2">
          {filtered.map((cmd) => (
            <li key={cmd.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(cmd.id);
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12px]",
                  "text-[#374151] hover:bg-violet-50 hover:text-violet-700",
                )}
              >
                <span>{cmd.label}</span>
                <span className="text-[10px] text-[#9ca3af]">{cmd.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
