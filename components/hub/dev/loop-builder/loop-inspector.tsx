"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LOOP_BLOCK_TEMPLATES,
  nodeToBlockCode,
  parseBlockCodeSnippet,
  validateCustomBlockCode,
  type LoopNode,
  type LoopNodeKind,
  type RetryStrategy,
} from "@/lib/agent-os/loop-builder";

type LoopInspectorProps = {
  readonly node: LoopNode;
  readonly draftCapabilities: readonly string[];
  readonly onChange: (patch: Partial<LoopNode["config"]> & { label?: string; kind?: LoopNodeKind }) => void;
  readonly onChangeCode: (code: string) => void;
  readonly onApplyTemplate: (templateId: string) => void;
};

const VERIFY_CHECKS = [
  "order_exists",
  "status_ok",
  "persisted",
  "customer_visible",
  "payment_exists",
  "amount_matches",
];

const RETRY_STRATEGIES: readonly { id: RetryStrategy; label: string }[] = [
  { id: "immediate", label: "Immediate" },
  { id: "fixed_delay", label: "Fixed delay" },
  { id: "exponential_backoff", label: "Exponential backoff" },
  { id: "replan", label: "Replan" },
];

export function LoopInspector(props: LoopInspectorProps) {
  const { node } = props;
  const [tab, setTab] = useState<"settings" | "advanced" | "code">("settings");
  const codeText = node.config.customCode ?? nodeToBlockCode(node);
  const codeValid = validateCustomBlockCode(codeText);
  const inputEntries = Object.entries(node.config.inputMap ?? {});

  return (
    <div className="flex h-full flex-col">
      <div>
        <p className="text-[11px] font-semibold text-[#111827]">{node.label}</p>
        <p className="text-[9px] text-[#9ca3af]">{node.kind}</p>
      </div>

      <div className="mt-2 flex rounded-md border border-[#e5e7eb] p-0.5">
        {(["settings", "advanced", "code"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded px-1.5 py-0.5 text-[8px] font-semibold capitalize",
              tab === id ? "bg-violet-50 text-violet-700" : "text-[#6b7280]",
            )}
          >
            {id}
          </button>
        ))}
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        {tab === "settings" ? (
          <div className="space-y-2.5">
            <label className="block text-[9px] text-[#6b7280]">
              Label
              <input
                value={node.label}
                onChange={(e) => props.onChange({ label: e.target.value })}
                className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
              />
            </label>

            {(node.kind === "CAPABILITY" || node.kind === "ACT" || node.kind === "TOOL" || node.kind === "CUSTOM") ? (
              <>
                <label className="block text-[9px] text-[#6b7280]">
                  Capability
                  <select
                    value={node.config.capabilityId ?? ""}
                    onChange={(e) => props.onChange({ capabilityId: e.target.value || undefined })}
                    className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
                  >
                    <option value="">—</option>
                    {props.draftCapabilities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[9px] text-[#6b7280]">
                  Tool Gateway ID
                  <input
                    value={node.config.toolId ?? ""}
                    onChange={(e) => props.onChange({ toolId: e.target.value || undefined })}
                    placeholder="capability.create"
                    className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 font-mono text-[9px]"
                  />
                </label>
              </>
            ) : null}

            {node.kind === "CONDITION" || node.kind === "DECIDE" ? (
              <label className="block text-[9px] text-[#6b7280]">
                Predicate
                <input
                  value={node.config.predicate ?? ""}
                  onChange={(e) => props.onChange({ predicate: e.target.value })}
                  placeholder="inventory_available"
                  className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 font-mono text-[9px]"
                />
              </label>
            ) : null}

            {inputEntries.length > 0 || node.kind === "CAPABILITY" ? (
              <div>
                <p className="text-[9px] font-semibold text-[#6b7280]">Input mapping</p>
                {inputEntries.map(([key, val]) => (
                  <div key={key} className="mt-1 grid grid-cols-2 gap-1">
                    <input
                      value={key}
                      readOnly
                      className="rounded border border-[#e5e7eb] px-1.5 py-0.5 font-mono text-[8px]"
                    />
                    <input
                      value={val}
                      onChange={(e) =>
                        props.onChange({
                          inputMap: { ...node.config.inputMap, [key]: e.target.value },
                        })
                      }
                      className="rounded border border-[#e5e7eb] px-1.5 py-0.5 font-mono text-[8px]"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    props.onChange({
                      inputMap: { ...(node.config.inputMap ?? {}), field: "{{ context.value }}" },
                    })
                  }
                  className="mt-1 text-[8px] font-semibold text-violet-600"
                >
                  + Add mapping
                </button>
              </div>
            ) : null}

            {node.config.outputVars?.length ? (
              <div>
                <p className="text-[9px] font-semibold text-[#6b7280]">Output</p>
                <p className="mt-0.5 font-mono text-[8px] text-[#374151]">{node.config.outputVars.join(", ")}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "advanced" ? (
          <div className="space-y-2.5">
            <label className="block text-[9px] text-[#6b7280]">
              Preset template
              <select
                value={node.config.templateId ?? ""}
                onChange={(e) => {
                  if (e.target.value) props.onApplyTemplate(e.target.value);
                  else props.onChange({ templateId: undefined });
                }}
                className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
              >
                <option value="">—</option>
                {LOOP_BLOCK_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            {node.kind === "VERIFY" ? (
              <>
                <p className="text-[9px] font-semibold text-[#6b7280]">Verify checks</p>
                <div className="space-y-1">
                  {VERIFY_CHECKS.map((check) => {
                    const checked = node.config.checks?.includes(check) ?? false;
                    return (
                      <label key={check} className="flex items-center gap-1.5 text-[9px] text-[#374151]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const prev = node.config.checks ?? [];
                            props.onChange({
                              checks: checked ? prev.filter((c) => c !== check) : [...prev, check],
                            });
                          }}
                        />
                        {check}
                      </label>
                    );
                  })}
                </div>
                <label className="block text-[9px] text-[#6b7280]">
                  On failure
                  <select
                    value={node.config.onFailure ?? "replan"}
                    onChange={(e) =>
                      props.onChange({ onFailure: e.target.value as LoopNode["config"]["onFailure"] })
                    }
                    className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
                  >
                    <option value="retry">Retry</option>
                    <option value="replan">Replan</option>
                    <option value="ask_user">Ask User</option>
                    <option value="fail">Fail</option>
                  </select>
                </label>
              </>
            ) : null}

            {(node.kind === "RETRY" || node.kind === "REPLAN") ? (
              <>
                <label className="block text-[9px] text-[#6b7280]">
                  Retry strategy
                  <select
                    value={node.config.retryStrategy ?? "immediate"}
                    onChange={(e) => props.onChange({ retryStrategy: e.target.value as RetryStrategy })}
                    className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
                  >
                    {RETRY_STRATEGIES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[9px] text-[#6b7280]">
                  Max retries
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={node.config.maxAttempts ?? 3}
                    onChange={(e) => props.onChange({ maxAttempts: Number(e.target.value) })}
                    className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
                  />
                </label>
                <label className="block text-[9px] text-[#6b7280]">
                  Delay (ms)
                  <input
                    type="number"
                    min={0}
                    value={node.config.delayMs ?? 0}
                    onChange={(e) => props.onChange({ delayMs: Number(e.target.value) })}
                    className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
                  />
                </label>
                <label className="block text-[9px] text-[#6b7280]">
                  Timeout (ms)
                  <input
                    type="number"
                    min={0}
                    value={node.config.timeoutMs ?? 30_000}
                    onChange={(e) => props.onChange({ timeoutMs: Number(e.target.value) })}
                    className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
                  />
                </label>
              </>
            ) : null}

            <label className="block text-[9px] text-[#6b7280]">
              Description
              <input
                value={node.config.description ?? ""}
                onChange={(e) => props.onChange({ description: e.target.value })}
                className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
              />
            </label>
          </div>
        ) : null}

        {tab === "code" ? (
          <div>
            <textarea
              value={codeText}
              onChange={(e) => props.onChangeCode(e.target.value)}
              rows={16}
              spellCheck={false}
              className="w-full rounded-lg border border-[#e5e7eb] bg-[#0c0e12] px-2 py-1.5 font-mono text-[9px] leading-relaxed text-[#e5e7eb] outline-none focus:border-violet-400"
            />
            {!codeValid.ok ? (
              <p className="mt-1 text-[9px] text-amber-600">{codeValid.messageKo}</p>
            ) : (
              <p className="mt-1 flex items-center gap-1 text-[9px] text-emerald-600">
                <Check className="size-3" /> 코드 형식 OK
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
