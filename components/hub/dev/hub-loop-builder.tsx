"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, LayoutGrid, Loader2, Repeat, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import {
  applyTemplateToNode,
  autoLayoutLoop,
  createLoopNode,
  createNodeFromTemplate,
  duplicateLoopNode,
  ensureLoopLayout,
  generateLoopFromUtterance,
  getLoopBlockTemplate,
  lintLoopDefinition,
  loopDefinitionToCode,
  packageLoopAsCapability,
  parseBlockCodeSnippet,
  parseLoopCode,
  patchLoopFromUtterance,
  readLoopDefinition,
  subscribeLoopDefinitionUpdates,
  testLoopDefinition,
  wrapCapabilityAsLoop,
  writeLoopDefinition,
  type LoopBuilderMode,
  type LoopDefinition,
  type LoopGraphPatch,
  type LoopNode,
  type LoopNodeKind,
  type LoopTestResult,
} from "@/lib/agent-os/loop-builder";
import type { LoopFlowNodeData } from "@/lib/agent-os/loop-builder/graph-sync";
import { defaultPositionForIndex } from "@/lib/agent-os/loop-builder/graph-layout";
import { subscribeHubWorkspaceCommand } from "@/lib/hub/dev/hub-workspace-commands";
import { LoopFlowCanvas } from "@/components/hub/dev/loop-builder/loop-flow-canvas";
import { LoopBlockLibrary } from "@/components/hub/dev/loop-builder/loop-block-library";
import { LoopInspector } from "@/components/hub/dev/loop-builder/loop-inspector";
import { LoopTestPanel } from "@/components/hub/dev/loop-builder/loop-test-panel";
import { LoopAiPanel } from "@/components/hub/dev/loop-builder/loop-ai-panel";

type HubLoopBuilderProps = {
  readonly draft: PlatformDraft;
  readonly platformId?: string;
  readonly initialLoop?: LoopDefinition | null;
  readonly onAskOperator?: (text: string) => void;
};

const MAX_HISTORY = 40;

export function HubLoopBuilder(props: HubLoopBuilderProps) {
  const platformId = props.platformId ?? props.draft.id ?? "loop";
  const [mode, setMode] = useState<LoopBuilderMode>("visual");
  const [prompt, setPrompt] = useState("");
  const [loop, setLoop] = useState<LoopDefinition | null>(() =>
    props.initialLoop ? ensureLoopLayout(props.initialLoop) : null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<LoopTestResult | null>(null);
  const [justGenerated, setJustGenerated] = useState(false);
  const [pendingPatch, setPendingPatch] = useState<LoopGraphPatch | null>(null);
  const [highlightNodeIds, setHighlightNodeIds] = useState<readonly string[]>([]);
  const [highlightEdgeKeys, setHighlightEdgeKeys] = useState<readonly string[]>([]);
  const [runningNodeId, setRunningNodeId] = useState<string | null>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);

  const historyRef = useRef<LoopDefinition[]>([]);
  const historyIndexRef = useRef(-1);

  useEffect(() => {
    const stored = readLoopDefinition(platformId);
    if (stored) {
      const laid = ensureLoopLayout(stored);
      setLoop(laid);
      setCode(loopDefinitionToCode(laid));
    }
    const unsubStore = subscribeLoopDefinitionUpdates(platformId, (next) => {
      const laid = ensureLoopLayout(next);
      setLoop(laid);
      setCode(loopDefinitionToCode(laid));
      setMode("visual");
      setJustGenerated(true);
    });
    const unsubCmd = subscribeHubWorkspaceCommand((command) => {
      if (command.kind === "loop_updated" && command.platformId === platformId) {
        const laid = ensureLoopLayout(command.loop);
        setLoop(laid);
        setCode(loopDefinitionToCode(laid));
        setMode("visual");
        setJustGenerated(true);
      }
      if (command.kind === "loop_test_result" && command.platformId === platformId) {
        setTest(command.test);
        setShowTestPanel(true);
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

  const pushHistory = useCallback((snapshot: LoopDefinition) => {
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
    trimmed.push(snapshot);
    if (trimmed.length > MAX_HISTORY) trimmed.shift();
    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
  }, []);

  const persist = useCallback(
    (next: LoopDefinition, recordHistory = true) => {
      if (recordHistory && loop) pushHistory(loop);
      setLoop(next);
      writeLoopDefinition(platformId, next);
      setCode(loopDefinitionToCode(next));
    },
    [loop, platformId, pushHistory],
  );

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const prev = historyRef.current[historyIndexRef.current];
    if (!prev) return;
    setLoop(prev);
    writeLoopDefinition(platformId, prev);
    setCode(loopDefinitionToCode(prev));
  }, [platformId]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const next = historyRef.current[historyIndexRef.current];
    if (!next) return;
    setLoop(next);
    writeLoopDefinition(platformId, next);
    setCode(loopDefinitionToCode(next));
  }, [platformId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && selectedId && loop) {
        e.preventDefault();
        persist(duplicateLoopNode(loop, selectedId));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, selectedId, loop, persist]);

  const testStatusByNodeId = useMemo((): Readonly<Record<string, LoopFlowNodeData["testStatus"]>> => {
    if (!test) return {};
    const map: Record<string, LoopFlowNodeData["testStatus"]> = {};
    for (const step of test.steps) {
      map[step.nodeId] = step.ok ? "pass" : "fail";
    }
    if (runningNodeId) map[runningNodeId] = "running";
    return map;
  }, [test, runningNodeId]);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    const generated = generateLoopFromUtterance(prompt.trim());
    persist(generated);
    setSelectedId(generated.entryId);
    setJustGenerated(true);
    setMode("visual");
    setPendingPatch(null);
  };

  const handleAiEdit = () => {
    if (!loop || !prompt.trim()) return;
    const patch = patchLoopFromUtterance(loop, prompt.trim());
    if (patch) setPendingPatch(patch);
  };

  const handleApplyPatch = () => {
    if (!pendingPatch) return;
    persist(pendingPatch.loop);
    setHighlightNodeIds(pendingPatch.highlightNodeIds);
    setHighlightEdgeKeys(pendingPatch.highlightEdgeKeys);
    setPendingPatch(null);
    setMode("visual");
    window.setTimeout(() => {
      setHighlightNodeIds([]);
      setHighlightEdgeKeys([]);
    }, 4000);
  };

  const addNodeToLoop = (node: LoopNode) => {
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
    const index = loop.nodes.length;
    const positioned = {
      ...node,
      layout: node.layout ?? defaultPositionForIndex(index),
    };
    persist({ ...loop, source: "visual", nodes: [...loop.nodes, positioned], edges: [...loop.edges] });
    setSelectedId(node.id);
  };

  const handleAddKind = (kind: LoopNodeKind, config: LoopNode["config"] = {}) => {
    addNodeToLoop(createLoopNode(kind, `n_${kind.toLowerCase()}_${Date.now()}`, undefined, config));
    setMode("visual");
  };

  const handleAddTemplate = (templateId: string) => {
    const template = getLoopBlockTemplate(templateId);
    if (!template) return;
    addNodeToLoop(createNodeFromTemplate(template, `n_tpl_${Date.now()}`));
    setMode("visual");
  };

  const handleInsertCapability = (name: string) => {
    persist(wrapCapabilityAsLoop({ capabilityId: name }));
    setMode("visual");
  };

  const handleAutoLayout = () => {
    if (!loop) return;
    persist(autoLayoutLoop(loop));
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
    persist(ensureLoopLayout(parseLoopCode(code || (loop ? loopDefinitionToCode(loop) : 'loop("Untitled")'))));
    setMode("visual");
  };

  const handleTest = async () => {
    if (!loop) return;
    setTesting(true);
    setShowTestPanel(true);
    setRunningNodeId(null);
    setTest(null);

    const steps = loop.nodes.filter((n) => n.kind !== "COMPLETE" && n.kind !== "FAIL");
    for (const step of steps) {
      setRunningNodeId(step.id);
      await new Promise((r) => setTimeout(r, 120));
    }

    const result = await testLoopDefinition({ loop });
    setTest(result);
    setRunningNodeId(null);
    setTesting(false);
  };

  const draftCapabilities = props.draft.actions.map((a) => a.name);

  if (mode === "simple" && !loop) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-[#f4f5f7]">
        <LoopTopBar
          loopName="Loop Builder"
          mode={mode}
          onModeChange={setMode}
          onAutoLayout={() => {}}
          onTest={() => {}}
          onSave={() => {}}
          onPublish={() => {}}
          testing={false}
          publishBlocked
        />
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <Repeat className="mb-3 size-8 text-violet-500" />
          <p className="text-[13px] font-semibold text-[#111827]">Describe your loop</p>
          <p className="mt-1 max-w-md text-center text-[11px] text-[#6b7280]">
            자연어로 목표를 설명하면 실행 가능한 Flowchart Graph로 컴파일합니다.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="재고를 확인하고 재고가 있으면 결제를 진행해. 결제 실패하면 3번까지 다시 시도하고, 계속 실패하면 사용자에게 알려줘."
            className="mt-4 w-full max-w-lg rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[11px] text-[#111827] shadow-sm outline-none focus:border-violet-300"
          />
          <button
            type="button"
            onClick={handleGenerate}
            className="mt-3 rounded-lg bg-violet-600 px-5 py-2 text-[11px] font-semibold text-white hover:bg-violet-700"
          >
            Generate Graph
          </button>
        </div>
      </div>
    );
  }

  if (!loop) return null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f5f7]">
      <LoopTopBar
        loopName={loop.name}
        mode={mode}
        onModeChange={setMode}
        onAutoLayout={handleAutoLayout}
        onTest={() => void handleTest()}
        onSave={() => persist(loop, false)}
        onPublish={() => props.onAskOperator?.(`${loop.name} Loop를 Publish 준비해줘`)}
        testing={testing}
        publishBlocked={Boolean(lint?.publishBlocked)}
      />

      {mode !== "pro" ? (
        <LoopAiPanel
          prompt={prompt}
          onPromptChange={setPrompt}
          onGenerate={handleGenerate}
          onAiEdit={handleAiEdit}
          pendingPatch={pendingPatch}
          onApplyPatch={handleApplyPatch}
          onDismissPatch={() => setPendingPatch(null)}
        />
      ) : null}

      {justGenerated ? (
        <div className="flex items-center justify-between border-b border-violet-100 bg-violet-50 px-3 py-1.5">
          <p className="text-[10px] text-violet-800">Graph가 생성되었습니다. 연결과 분기를 확인한 뒤 테스트하세요.</p>
          <button
            type="button"
            onClick={() => {
              setJustGenerated(false);
              void handleTest();
            }}
            className="rounded-md bg-violet-600 px-2.5 py-0.5 text-[9px] font-semibold text-white"
          >
            Run Test
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {mode === "visual" ? (
          <>
            <LoopBlockLibrary
              onAddKind={handleAddKind}
              onAddTemplate={handleAddTemplate}
              draftCapabilities={draftCapabilities}
              onInsertCapability={handleInsertCapability}
            />
            <div className="relative min-w-0 flex-1">
              <LoopFlowCanvas
                loop={loop}
                selectedNodeId={selectedId}
                onSelectNode={setSelectedId}
                onChangeLoop={persist}
                highlightNodeIds={highlightNodeIds}
                highlightEdgeKeys={highlightEdgeKeys}
                testStatusByNodeId={testStatusByNodeId}
                runningNodeId={runningNodeId}
              />
            </div>
            <aside className="flex w-[288px] shrink-0 flex-col border-l border-[#e5e7eb] bg-white p-2.5">
              {selected ? (
                <LoopInspector
                  node={selected}
                  draftCapabilities={draftCapabilities}
                  onChange={handlePatchNode}
                  onChangeCode={handlePatchNodeCode}
                  onApplyTemplate={handleApplyTemplateToSelected}
                />
              ) : (
                <p className="text-[10px] text-[#9ca3af]">노드를 선택하면 Inspector에서 설정합니다.</p>
              )}
              {lint ? (
                <div className="mt-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-2">
                  <p className="text-[9px] font-semibold text-[#374151]">AI CHECK</p>
                  <ul className="mt-1 space-y-0.5">
                    {lint.checks.map((check) => (
                      <li
                        key={check.label}
                        className={cn(
                          "flex items-center gap-1 text-[9px]",
                          check.ok ? "text-emerald-700" : "text-amber-700",
                        )}
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
                  </ul>
                </div>
              ) : null}
            </aside>
          </>
        ) : mode === "pro" ? (
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-0">
            <div className="min-h-0 border-r border-[#e5e7eb]">
              <LoopFlowCanvas
                loop={loop}
                selectedNodeId={selectedId}
                onSelectNode={setSelectedId}
                onChangeLoop={persist}
              />
            </div>
            <div className="flex flex-col bg-[#0c0e12] p-3">
              <p className="text-[9px] font-semibold text-[#8ec0ff]">Pro · Loop DSL</p>
              <textarea
                value={code || loopDefinitionToCode(loop)}
                onChange={(e) => setCode(e.target.value)}
                className="mt-2 min-h-0 flex-1 resize-none bg-transparent font-mono text-[10px] leading-relaxed text-[#e5e7eb] outline-none"
              />
              <button
                type="button"
                onClick={handleApplyCode}
                className="mt-2 self-start rounded-md bg-violet-600 px-3 py-1 text-[9px] font-semibold text-white"
              >
                Apply to Visual
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="w-full max-w-lg rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[11px] shadow-sm outline-none"
            />
            <button
              type="button"
              onClick={handleGenerate}
              className="mt-3 rounded-lg bg-violet-600 px-4 py-1.5 text-[11px] font-semibold text-white"
            >
              Regenerate Graph
            </button>
          </div>
        )}
      </div>

      {showTestPanel ? (
        <LoopTestPanel
          loop={loop}
          test={test}
          testing={testing}
          onRunAgain={() => void handleTest()}
          onSelectNode={setSelectedId}
          selectedTraceNodeId={selectedId}
        />
      ) : (
        <footer className="flex items-center justify-between border-t border-[#e5e7eb] bg-white px-3 py-1.5">
          <p className="text-[9px] text-[#6b7280]">
            {pkg?.name} · {test?.passed ? "Tested" : "Draft"} · Ctrl+Z undo · Ctrl+D duplicate
          </p>
        </footer>
      )}
    </div>
  );
}

function LoopTopBar({
  loopName,
  mode,
  onModeChange,
  onAutoLayout,
  onTest,
  onSave,
  onPublish,
  testing,
  publishBlocked,
}: {
  loopName: string;
  mode: LoopBuilderMode;
  onModeChange: (m: LoopBuilderMode) => void;
  onAutoLayout: () => void;
  onTest: () => void;
  onSave: () => void;
  onPublish: () => void;
  testing: boolean;
  publishBlocked: boolean;
}) {
  return (
    <header className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        <button type="button" className="rounded-md p-1 text-[#9ca3af] hover:bg-[#f3f4f6]">
          <ArrowLeft className="size-3.5" />
        </button>
        <Repeat className="size-3.5 text-violet-600" />
        <div>
          <p className="text-[11px] font-semibold text-[#111827]">{loopName}</p>
          <p className="text-[8px] font-medium uppercase tracking-wide text-[#9ca3af]">Draft</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onAutoLayout}
          className="flex items-center gap-1 rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1 text-[9px] font-semibold text-[#374151] hover:bg-[#f9fafb]"
        >
          <LayoutGrid className="size-3" /> Auto Layout
        </button>
        <button
          type="button"
          onClick={onTest}
          className="rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1 text-[9px] font-semibold text-[#374151]"
        >
          {testing ? <Loader2 className="size-3 animate-spin" /> : "Run Test"}
        </button>
        <button
          type="button"
          onClick={onSave}
          className="flex items-center gap-1 rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1 text-[9px] font-semibold text-[#374151]"
        >
          <Save className="size-3" /> Save
        </button>
        <button
          type="button"
          disabled={publishBlocked}
          onClick={onPublish}
          className="rounded-lg bg-violet-600 px-2.5 py-1 text-[9px] font-semibold text-white disabled:opacity-40"
        >
          Publish
        </button>
        <div className="ml-1 flex rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-0.5">
          {(["simple", "visual", "pro"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onModeChange(id)}
              className={cn(
                "rounded-md px-2 py-1 text-[9px] font-semibold capitalize",
                mode === id ? "bg-white text-violet-700 shadow-sm" : "text-[#6b7280]",
              )}
            >
              {id}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
