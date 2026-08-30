"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import {
  LOOP_PALETTE,
  LOOP_BLOCK_TEMPLATE_CATEGORIES,
  LOOP_BLOCK_TEMPLATES,
  CUSTOM_BLOCK_CODE_STUB,
  applyTemplateToNode,
  createLoopNode,
  createNodeFromTemplate,
  generateLoopFromUtterance,
  lintLoopDefinition,
  loopDefinitionToCode,
  nodeToBlockCode,
  packageLoopAsCapability,
  parseBlockCodeSnippet,
  parseLoopCode,
  readLoopDefinition,
  subscribeLoopDefinitionUpdates,
  testLoopDefinition,
  validateCustomBlockCode,
  wrapCapabilityAsLoop,
  writeLoopDefinition,
  type LoopBlockTemplateCategory,
  type LoopBuilderMode,
  type LoopDefinition,
  type LoopEdge,
  type LoopNode,
  type LoopNodeKind,
  type LoopTestResult,
} from "@/lib/agent-os/loop-builder";
import { subscribeHubWorkspaceCommand } from "@/lib/hub/dev/hub-workspace-commands";

type HubLoopBuilderProps = {
  readonly draft: PlatformDraft;
  readonly platformId?: string;
  readonly initialLoop?: LoopDefinition | null;
  readonly onAskOperator?: (text: string) => void;
};

export function HubLoopBuilder(props: HubLoopBuilderProps) {
  const platformId = props.platformId ?? props.draft.id ?? "loop";
  const [mode, setMode] = useState<LoopBuilderMode>("simple");
  const [prompt, setPrompt] = useState("");
  const [loop, setLoop] = useState<LoopDefinition | null>(props.initialLoop ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<LoopTestResult | null>(null);
  const [justGenerated, setJustGenerated] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<LoopBlockTemplateCategory>("core");

  useEffect(() => {
    const stored = readLoopDefinition(platformId);
    if (stored) {
      setLoop(stored);
      setCode(loopDefinitionToCode(stored));
    }
    const unsubStore = subscribeLoopDefinitionUpdates(platformId, (next) => {
      setLoop(next);
      setCode(loopDefinitionToCode(next));
      setMode("visual");
      setJustGenerated(true);
    });
    const unsubCmd = subscribeHubWorkspaceCommand((command) => {
      if (command.kind === "loop_updated" && command.platformId === platformId) {
        setLoop(command.loop);
        setCode(loopDefinitionToCode(command.loop));
        setMode("visual");
        setJustGenerated(true);
      }
      if (command.kind === "loop_test_result" && command.platformId === platformId) {
        setTest(command.test);
      }
    });
    return () => {
      unsubStore();
      unsubCmd();
    };
  }, [platformId]);

  const lint = useMemo(() => (loop ? lintLoopDefinition(loop) : null), [loop]);
  const selected = loop?.nodes.find((n) => n.id === selectedId) ?? null;
  const pkg = loop
    ? packageLoopAsCapability({
        name: loop.name,
        loop,
        capabilities: props.draft.actions.map((a) => a.name),
        tested: Boolean(test?.passed),
      })
    : null;

  const persist = (next: LoopDefinition) => {
    setLoop(next);
    writeLoopDefinition(platformId, next);
    setCode(loopDefinitionToCode(next));
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    const generated = generateLoopFromUtterance(prompt.trim());
    persist(generated);
    setSelectedId(generated.entryId);
    setJustGenerated(true);
    setMode("visual");
  };

  const appendNode = (node: LoopNode) => {
    if (!loop) {
      persist({
        id: `loop-${platformId}`,
        name: "Untitled Loop",
        version: "1.0.0",
        description: "",
        source: "visual",
        nodes: [node],
        edges: [],
        entryId: node.id,
      });
      setSelectedId(node.id);
      return;
    }
    const last = loop.nodes[loop.nodes.length - 1];
    const edges: LoopEdge[] = last
      ? [...loop.edges, { from: last.id, to: node.id, kind: "next" }]
      : [...loop.edges];
    persist({ ...loop, source: "visual", nodes: [...loop.nodes, node], edges });
    setSelectedId(node.id);
  };

  const handleAdd = (kind: LoopNodeKind, config: LoopNode["config"] = {}) => {
    const id = `n_${kind.toLowerCase()}_${Date.now()}`;
    appendNode(createLoopNode(kind, id, undefined, config));
  };

  const handleAddTemplate = (templateId: string) => {
    const template = LOOP_BLOCK_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    appendNode(createNodeFromTemplate(template, `n_${template.kind.toLowerCase()}_${Date.now()}`));
    setMode("visual");
  };

  const handleAddCustom = () => {
    handleAdd("CUSTOM", { customCode: CUSTOM_BLOCK_CODE_STUB });
  };

  const handleInsertCapability = (name: string) => {
    persist(wrapCapabilityAsLoop({ capabilityId: name }));
    setMode("visual");
  };

  const handlePatchNode = (patch: Partial<LoopNode["config"]> & { label?: string; kind?: LoopNodeKind }) => {
    if (!loop || !selected) return;
    const { kind, label, ...configPatch } = patch;
    persist({
      ...loop,
      nodes: loop.nodes.map((n) =>
        n.id === selected.id
          ? {
              ...n,
              kind: kind ?? n.kind,
              label: label ?? n.label,
              config: { ...n.config, ...configPatch },
            }
          : n,
      ),
    });
  };

  const handleApplyTemplateToSelected = (templateId: string) => {
    if (!loop || !selected) return;
    persist({
      ...loop,
      nodes: loop.nodes.map((n) => (n.id === selected.id ? applyTemplateToNode(n, templateId) : n)),
    });
  };

  const handlePatchNodeCode = (codeText: string) => {
    if (!selected) return;
    handlePatchNode({ ...parseBlockCodeSnippet(codeText, selected), customCode: codeText });
  };

  const handleApplyCode = () => {
    persist(parseLoopCode(code || (loop ? loopDefinitionToCode(loop) : 'loop("Untitled")')));
    setMode("pro");
  };

  const handleTest = async () => {
    if (!loop) return;
    setTesting(true);
    const result = await testLoopDefinition({ loop });
    setTest(result);
    setTesting(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f5f7]">
      <header className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <Repeat className="size-3.5 text-violet-600" />
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#9ca3af]">Agent Capability</p>
            <p className="text-[12px] font-semibold text-[#111827]">{loop?.name ?? "Loop Builder"}</p>
          </div>
        </div>
        <div className="flex rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-0.5">
          {(["simple", "visual", "pro"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                "rounded-md px-2 py-1 text-[9px] font-semibold",
                mode === id ? "bg-white text-violet-700 shadow-sm" : "text-[#6b7280]",
              )}
            >
              {id === "simple" ? "Simple" : id === "visual" ? "Visual" : "Pro"}
            </button>
          ))}
        </div>
      </header>

      {mode === "simple" || !loop ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <p className="text-[12px] font-semibold text-[#111827]">Describe your loop</p>
          <p className="mt-1 max-w-sm text-center text-[10px] text-[#6b7280]">
            블록을 직접 연결하지 않아도 됩니다. 목표만 말하면 실행 가능한 Loop로 컴파일합니다.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="사용자가 주문하면 재고를 확인하고, 있으면 승인한 뒤 결제하고, 실패하면 최대 2번 재시도해."
            className="mt-3 w-full max-w-lg rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[11px] text-[#111827] shadow-sm outline-none focus:border-violet-300"
          />
          <button
            type="button"
            onClick={handleGenerate}
            className="mt-3 rounded-lg bg-violet-600 px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700"
          >
            Loop 만들기
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {true ? (
            <aside className="w-[168px] shrink-0 overflow-y-auto border-r border-[#e5e7eb] bg-white p-2">
              <button
                type="button"
                onClick={handleAddCustom}
                className="mb-2 w-full rounded-lg border border-dashed border-violet-200 bg-violet-50 px-2 py-1.5 text-[9px] font-semibold text-violet-700 hover:bg-violet-100"
              >
                + Custom Code Block
              </button>

              <p className="px-1 text-[9px] font-bold uppercase text-[#9ca3af]">Templates</p>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {LOOP_BLOCK_TEMPLATE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setTemplateCategory(cat.id)}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[8px] font-semibold",
                      templateCategory === cat.id
                        ? "bg-violet-100 text-violet-700"
                        : "bg-[#f3f4f6] text-[#6b7280]",
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="mt-1 max-h-36 space-y-0.5 overflow-y-auto">
                {LOOP_BLOCK_TEMPLATES.filter((t) => t.category === templateCategory).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={item.hintKo}
                    onClick={() => handleAddTemplate(item.id)}
                    className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[9px] text-[#374151] hover:bg-violet-50"
                  >
                    <Plus className="size-2.5 shrink-0 text-[#9ca3af]" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>

              <p className="mt-3 px-1 text-[9px] font-bold uppercase text-[#9ca3af]">Blocks</p>
              {(["core", "capability", "data", "custom"] as const).map((group) => (
                <div key={group} className="mt-2">
                  <p className="px-1 text-[8px] font-semibold uppercase text-[#c4c9d1]">{group}</p>
                  <div className="mt-0.5 space-y-0.5">
                    {LOOP_PALETTE.filter((p) => p.group === group).map((item) => (
                      <button
                        key={item.kind}
                        type="button"
                        onClick={() => handleAdd(item.kind)}
                        className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[9px] text-[#374151] hover:bg-violet-50"
                      >
                        <Plus className="size-2.5 text-[#9ca3af]" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {props.draft.actions.length > 0 ? (
                <div className="mt-3">
                  <p className="px-1 text-[8px] font-semibold uppercase text-[#c4c9d1]">Capabilities</p>
                  {props.draft.actions.slice(0, 8).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => handleInsertCapability(a.name)}
                      className="mt-0.5 w-full truncate rounded-md px-1.5 py-1 text-left text-[9px] text-violet-700 hover:bg-violet-50"
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </aside>
          ) : null}

          <div className="min-w-0 flex-1 overflow-y-auto p-3">
            {justGenerated ? (
              <div className="mb-2 flex items-center justify-between rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-1.5">
                <p className="text-[10px] text-violet-800">이 Loop를 만들었습니다. 테스트해볼까요?</p>
                <button
                  type="button"
                  onClick={() => {
                    setJustGenerated(false);
                    void handleTest();
                  }}
                  className="rounded-md bg-violet-600 px-2 py-0.5 text-[9px] font-semibold text-white"
                >
                  Run Test
                </button>
              </div>
            ) : null}
            {mode === "pro" ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <Canvas loop={loop} selectedId={selectedId} onSelect={setSelectedId} />
                <div className="rounded-xl border border-[#e5e7eb] bg-[#0c0e12] p-2.5">
                  <p className="text-[9px] font-semibold text-[#8ec0ff]">Code</p>
                  <textarea
                    value={code || loopDefinitionToCode(loop)}
                    onChange={(e) => setCode(e.target.value)}
                    rows={16}
                    className="mt-2 w-full bg-transparent font-mono text-[10px] leading-relaxed text-[#e5e7eb] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCode}
                    className="mt-2 rounded-md bg-violet-600 px-2.5 py-1 text-[9px] font-semibold text-white"
                  >
                    Visual로 반영
                  </button>
                </div>
              </div>
            ) : (
              <Canvas loop={loop} selectedId={selectedId} onSelect={setSelectedId} />
            )}
          </div>

          <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-[#e5e7eb] bg-white p-2.5">
            {selected ? (
              <Inspector
                node={selected}
                draftCapabilities={props.draft.actions.map((a) => a.name)}
                onChange={handlePatchNode}
                onChangeCode={handlePatchNodeCode}
                onApplyTemplate={handleApplyTemplateToSelected}
              />
            ) : (
              <p className="text-[10px] text-[#9ca3af]">블록을 클릭하면 설정·코드를 바로 수정할 수 있습니다.</p>
            )}
            {lint ? (
              <div className="mt-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-2">
                <p className="text-[9px] font-semibold text-[#374151]">AI CHECK</p>
                <ul className="mt-1 space-y-0.5">
                  {lint.checks.map((check) => (
                    <li
                      key={check.label}
                      className={cn("flex items-center gap-1 text-[9px]", check.ok ? "text-emerald-700" : "text-amber-700")}
                    >
                      {check.ok ? <Check className="size-3" /> : "⚠"} {check.label}
                    </li>
                  ))}
                  {lint.issues.map((issue) => (
                    <li
                      key={issue.code + (issue.nodeId ?? "")}
                      className={cn("text-[9px]", issue.severity === "error" ? "text-amber-700" : "text-[#6b7280]")}
                    >
                      ⚠ {issue.messageKo}
                    </li>
                  ))}
                  {!lint.publishBlocked ? (
                    <li className="flex items-center gap-1 text-[9px] font-semibold text-emerald-700">
                      <Check className="size-3" /> Ready to Test
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      )}

      {loop ? (
        <footer className="flex items-center justify-between border-t border-[#e5e7eb] bg-white px-3 py-2">
          <div className="text-[9px] text-[#6b7280]">
            Capability: {pkg?.name} · Status: {test?.passed ? "● Tested" : "● Draft"}
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => void handleTest()}
              className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1 text-[10px] font-semibold text-[#374151]"
            >
              {testing ? <Loader2 className="size-3 animate-spin" /> : "Test Loop"}
            </button>
            <button
              type="button"
              disabled={Boolean(lint?.publishBlocked)}
              onClick={() => props.onAskOperator?.(`${loop.name} Loop를 Publish 준비해줘`)}
              className="rounded-lg bg-violet-600 px-3 py-1 text-[10px] font-semibold text-white disabled:opacity-40"
            >
              Publish
            </button>
          </div>
        </footer>
      ) : null}

      {test ? (
        <div className="border-t border-[#e5e7eb] bg-[#0c0e12] px-3 py-2">
          <p className="text-[9px] font-semibold text-[#8ec0ff]">
            TEST RUN {test.runId} · {test.passed ? "PASS" : "FAIL"}
          </p>
          <ul className="mt-1 max-h-24 space-y-0.5 overflow-y-auto font-mono text-[9px] text-[#cbd5e1]">
            {test.traces.map((t) => (
              <li key={t.nodeId + t.atIso}>
                {t.atIso.slice(11, 19)} {t.label} {t.status === "pass" ? "✓" : t.status === "fail" ? "✗" : "○"} {t.detail}
              </li>
            ))}
          </ul>
          {test.reasonKo ? <p className="mt-1 text-[9px] text-amber-300">{test.reasonKo}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function Canvas({
  loop,
  selectedId,
  onSelect,
}: {
  loop: LoopDefinition;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const outgoing = (id: string) => loop.edges.filter((e) => e.from === id);
  const labelFor = (id: string) => loop.nodes.find((n) => n.id === id)?.label ?? id;
  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-sm">
      <p className="text-[9px] font-semibold text-[#6b7280]">LOOP CANVAS</p>
      <ol className="mt-2 space-y-1">
        {loop.nodes.map((node) => {
          const next = outgoing(node.id);
          const branches = next.filter((e) => e.kind !== "next");
          return (
            <li key={node.id}>
              <button
                type="button"
                onClick={() => onSelect(node.id)}
                className={cn(
                  "w-full rounded-lg border px-2.5 py-1.5 text-left text-[10px] font-medium",
                  selectedId === node.id
                    ? "border-violet-300 bg-violet-50 text-violet-800"
                    : "border-[#e5e7eb] bg-[#f9fafb] text-[#374151]",
                )}
              >
                {node.label}
                <span className="ml-2 text-[8px] font-normal text-[#9ca3af]">{node.kind}</span>
                {node.config.customCode ? (
                  <span className="ml-1 rounded bg-indigo-50 px-1 py-px text-[7px] font-semibold text-indigo-600">
                    code
                  </span>
                ) : null}
                {node.config.templateId ? (
                  <span className="ml-1 rounded bg-emerald-50 px-1 py-px text-[7px] font-semibold text-emerald-600">
                    preset
                  </span>
                ) : null}
              </button>
              {branches.length > 0 ? (
                <div className="mt-0.5 grid grid-cols-2 gap-1 text-center text-[8px] text-[#9ca3af]">
                  {branches.map((e) => (
                    <p key={e.kind + e.to}>
                      {e.kind.toUpperCase()} → {labelFor(e.to)}
                    </p>
                  ))}
                </div>
              ) : next.length > 0 ? (
                <p className="py-0.5 text-center text-[9px] text-[#d1d5db]">↓</p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Inspector({
  node,
  draftCapabilities,
  onChange,
  onChangeCode,
  onApplyTemplate,
}: {
  node: LoopNode;
  draftCapabilities: readonly string[];
  onChange: (patch: Partial<LoopNode["config"]> & { label?: string; kind?: LoopNodeKind }) => void;
  onChangeCode: (code: string) => void;
  onApplyTemplate: (templateId: string) => void;
}) {
  const [tab, setTab] = useState<"settings" | "code">("settings");
  const codeText = node.config.customCode ?? nodeToBlockCode(node);
  const codeValid = validateCustomBlockCode(codeText);

  const verifyChecks = [
    "order_exists",
    "status_ok",
    "persisted",
    "customer_visible",
    "payment_exists",
    "amount_matches",
  ];

  return (
    <div>
      <p className="text-[10px] font-semibold text-[#111827]">{node.label}</p>
      <p className="text-[8px] text-[#9ca3af]">{node.kind}</p>

      <div className="mt-2 flex rounded-md border border-[#e5e7eb] p-0.5">
        {(["settings", "code"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded px-2 py-0.5 text-[9px] font-semibold",
              tab === id ? "bg-violet-50 text-violet-700" : "text-[#6b7280]",
            )}
          >
            {id === "settings" ? "설정" : "Code"}
          </button>
        ))}
      </div>

      {tab === "settings" ? (
        <div className="mt-2 space-y-2">
          <label className="block text-[9px] text-[#6b7280]">
            Preset template
            <select
              value={node.config.templateId ?? ""}
              onChange={(e) => {
                if (e.target.value) onApplyTemplate(e.target.value);
                else onChange({ templateId: undefined });
              }}
              className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
            >
              <option value="">— 선택 —</option>
              {LOOP_BLOCK_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[9px] text-[#6b7280]">
            Label
            <input
              value={node.label}
              onChange={(e) => onChange({ label: e.target.value })}
              className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
            />
          </label>
          <label className="block text-[9px] text-[#6b7280]">
            Target
            <input
              value={node.config.target ?? ""}
              onChange={(e) => onChange({ target: e.target.value })}
              className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
            />
          </label>
          {(node.kind === "CAPABILITY" || node.kind === "ACT" || node.kind === "TOOL" || node.kind === "CUSTOM") ? (
            <>
              <label className="block text-[9px] text-[#6b7280]">
                Capability
                <select
                  value={node.config.capabilityId ?? ""}
                  onChange={(e) => onChange({ capabilityId: e.target.value || undefined })}
                  className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
                >
                  <option value="">—</option>
                  {draftCapabilities.map((c) => (
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
                  onChange={(e) => onChange({ toolId: e.target.value || undefined })}
                  placeholder="capability.create · test.run …"
                  className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 font-mono text-[9px]"
                />
              </label>
            </>
          ) : null}
          {node.kind === "CONDITION" ? (
            <label className="block text-[9px] text-[#6b7280]">
              Predicate
              <input
                value={node.config.predicate ?? ""}
                onChange={(e) => onChange({ predicate: e.target.value })}
                placeholder="inventory_available"
                className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 font-mono text-[9px]"
              />
            </label>
          ) : null}
          {node.kind === "VERIFY" ? (
            <>
              <p className="text-[9px] font-semibold text-[#6b7280]">Verify checks</p>
              <div className="mt-1 space-y-1">
                {verifyChecks.map((check) => {
                  const checked = node.config.checks?.includes(check) ?? false;
                  return (
                    <label key={check} className="flex items-center gap-1.5 text-[9px] text-[#374151]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const prev = node.config.checks ?? [];
                          onChange({
                            checks: checked ? prev.filter((c) => c !== check) : [...prev, check],
                          });
                        }}
                      />
                      {check}
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-[9px] font-semibold text-[#6b7280]">On Success</p>
              <select
                value={node.config.onSuccess ?? "continue"}
                onChange={(e) => onChange({ onSuccess: e.target.value as LoopNode["config"]["onSuccess"] })}
                className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
              >
                <option value="continue">Continue</option>
                <option value="complete">Complete</option>
                <option value="verify">Verify again</option>
              </select>
              <p className="mt-2 text-[9px] font-semibold text-[#6b7280]">On Failure</p>
              <select
                value={node.config.onFailure ?? "replan"}
                onChange={(e) => onChange({ onFailure: e.target.value as LoopNode["config"]["onFailure"] })}
                className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
              >
                <option value="replan">Replan</option>
                <option value="retry">Retry</option>
                <option value="ask_user">Ask User</option>
                <option value="fail">Fail</option>
              </select>
            </>
          ) : null}
          {(node.kind === "RETRY" || node.kind === "VERIFY") ? (
            <label className="block text-[9px] text-[#6b7280]">
              Max Attempts
              <input
                type="number"
                min={1}
                max={5}
                value={node.config.maxAttempts ?? 2}
                onChange={(e) => onChange({ maxAttempts: Number(e.target.value) })}
                className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
              />
            </label>
          ) : null}
          <label className="block text-[9px] text-[#6b7280]">
            Description
            <input
              value={node.config.description ?? ""}
              onChange={(e) => onChange({ description: e.target.value })}
              className="mt-0.5 w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-[10px]"
            />
          </label>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-[9px] text-[#6b7280]">블록 코드 — Loop DSL (컴파일 후 Runtime 실행)</p>
          <textarea
            value={codeText}
            onChange={(e) => onChangeCode(e.target.value)}
            rows={14}
            spellCheck={false}
            className="mt-1 w-full rounded-lg border border-[#e5e7eb] bg-[#0c0e12] px-2 py-1.5 font-mono text-[9px] leading-relaxed text-[#e5e7eb] outline-none focus:border-violet-400"
          />
          {!codeValid.ok ? (
            <p className="mt-1 text-[9px] text-amber-600">{codeValid.messageKo}</p>
          ) : (
            <p className="mt-1 text-[9px] text-emerald-600">코드 형식 OK</p>
          )}
          <button
            type="button"
            onClick={() => setTab("settings")}
            className="mt-2 text-[9px] font-semibold text-violet-600"
          >
            설정 탭으로 돌아가기
          </button>
        </div>
      )}
    </div>
  );
}
