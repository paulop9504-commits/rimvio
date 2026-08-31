"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { HubCodeEditor } from "@/components/hub/wizard/hub-code-editor";
import { WizardStepHeader } from "@/components/hub/wizard/wizard-step-header";
import { DEFAULT_TEST_INPUT } from "@/lib/hub/capability/defaults";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CHECKS = [
  { id: "manifest", label: "Manifest", key: "manifest" as const },
  { id: "permissions", label: "Permissions", key: "permissions" as const },
  { id: "code", label: "Code Scan", key: "manifest" as const },
  { id: "sandbox", label: "Sandbox Test", key: "test" as const },
];

const TIMELINE = [
  "search_product",
  "add_to_cart",
  "verify_cart",
  "purchase",
];

export function TestStep({ wizard }: { wizard: HubCapabilityWizard }) {
  const { stepValidation, testStatus, testOutput, runSandboxTest } = wizard;
  const [testInput, setTestInput] = useState(DEFAULT_TEST_INPUT);
  const [consoleTab, setConsoleTab] = useState<"console" | "logs">("console");

  const timeline = useMemo(() => {
    if (testStatus === "idle") {
      return TIMELINE.map((label) => ({ label, status: "pending" as const }));
    }
    if (testStatus === "running") {
      return TIMELINE.map((label, i) => ({
        label,
        status: i < 1 ? ("success" as const) : i === 1 ? ("running" as const) : ("pending" as const),
      }));
    }
    if (testStatus === "failed") {
      return TIMELINE.map((label, i) => ({
        label,
        status: i < 2 ? ("success" as const) : ("failed" as const),
      }));
    }
    return TIMELINE.map((label) => ({ label, status: "success" as const }));
  }, [testStatus]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <WizardStepHeader
        step={5}
        title="Test & Validate"
        description="Run your capability in the Rimvio sandbox before publish."
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {CHECKS.map((c) => {
          const passed = stepValidation[c.key];
          return (
            <div
              key={c.id}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-[12px] font-semibold",
                passed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-[#E2E8F0] bg-white text-[#64748B]",
              )}
            >
              {c.label}{" "}
              {passed ? (
                <span className="float-right font-normal">
                  {c.id === "manifest" || c.id === "permissions" ? "Valid" : "Passed"}
                </span>
              ) : testStatus === "failed" && c.id === "sandbox" ? (
                <span className="float-right font-normal text-red-600">Failed</span>
              ) : (
                <span className="float-right font-normal">—</span>
              )}
            </div>
          );
        })}
      </div>

      {testStatus === "failed" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800">
          Sandbox validation failed — undeclared permission access detected.
        </div>
      ) : null}

      <div className="flex gap-1 border-b border-[#E2E8F0]">
        {(
          [
            ["console", "Test Console"],
            ["logs", "Logs"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setConsoleTab(id)}
            className={cn(
              "border-b-2 px-4 py-2 text-[13px] font-semibold",
              consoleTab === id
                ? "border-[#6366F1] text-[#6366F1]"
                : "border-transparent text-[#64748B]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {consoleTab === "console" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-[12px] font-semibold text-[#334155]">Test Scenario</p>
            <select className="h-9 w-full rounded-lg border border-[#E2E8F0] px-2 text-[13px]">
              <option>Search and add product to cart</option>
            </select>
            <p className="text-[12px] font-semibold text-[#334155]">Input (JSON)</p>
            <HubCodeEditor value={testInput} onChange={setTestInput} rows={8} />
            <Button
              type="button"
              onClick={() => void runSandboxTest()}
              disabled={testStatus === "running"}
              className="bg-[#6366F1] hover:bg-[#4F46E5]"
            >
              {testStatus === "running" ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Running…
                </>
              ) : (
                "Run Test"
              )}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
              <p className="mb-3 text-[12px] font-semibold text-[#334155]">Test Result</p>
              <ol className="space-y-2 text-[12px]">
                {timeline.map((step, i) => (
                  <li key={step.label} className="flex items-center gap-2">
                    <span className="text-[#94A3B8]">{i + 1}.</span>
                    <span className="flex-1 text-[#334155]">{step.label}</span>
                    {step.status === "success" ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : step.status === "running" ? (
                      <Loader2 className="size-3.5 animate-spin text-[#6366F1]" />
                    ) : step.status === "failed" ? (
                      <X className="size-3.5 text-red-600" />
                    ) : (
                      <span className="size-3.5 rounded-full border border-[#CBD5E1]" />
                    )}
                  </li>
                ))}
              </ol>
            </div>
            {testOutput ? (
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                <p className="mb-2 text-[12px] font-semibold text-[#334155]">Output</p>
                <HubCodeEditor value={testOutput} onChange={() => {}} readOnly rows={10} />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E2E8F0] bg-[#0F172A] p-4 font-mono text-[11px] text-slate-300">
          <p>[sandbox] Runtime initialized</p>
          <p>[sandbox] Permission boundary validated</p>
          <p>[sandbox] Executing search_product…</p>
          {testStatus === "passed" ? (
            <p className="text-emerald-400">[sandbox] Test completed successfully</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
