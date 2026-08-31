"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { planCapabilityDiscovery } from "@/lib/platform-sdk/discover-capabilities";
import {
  publishMvpCapability,
  readMvpCapabilities,
  saveMvpCapability,
} from "@/lib/hub/dev/mvp/local-capabilities";
import type {
  ActivityLine,
  ChatMessage,
  MvpCapability,
  MvpLoop,
  SandboxProduct,
  WorkflowStage,
} from "@/lib/hub/dev/mvp/types";
import { readMvpLoops } from "@/lib/hub/dev/mvp/local-capabilities";

export type CenterView = "sandbox" | "capability" | "loop" | "ready";

export type HubMvpRuntime = {
  capabilities: MvpCapability[];
  loops: MvpLoop[];
  selectedCapabilityId: string | null;
  selectedLoopId: string | null;
  centerView: CenterView;
  workflowStage: WorkflowStage;
  isRunning: boolean;
  activityLines: ActivityLine[];
  sandboxQuery: string;
  sandboxProducts: SandboxProduct[];
  sandboxPhase: "idle" | "opening" | "searching" | "reading" | "comparing" | "done";
  agentCursor: { x: number; y: number; visible: boolean };
  chatMessages: ChatMessage[];
  command: string;
  setCommand: (v: string) => void;
  sendCommand: () => void;
  selectCapability: (id: string) => void;
  selectLoop: (id: string) => void;
  testCapability: (id: string) => void;
  publishCapability: (id: string) => void;
  runLoop: (id: string) => void;
  startCreateCapability: () => void;
  readyCapability: MvpCapability | null;
  discoverForUtterance: (utterance: string) => void;
};

const WORKFLOW_LABELS: Record<WorkflowStage, string> = {
  idle: "대기",
  understand: "이해",
  plan: "계획",
  build: "구축",
  run: "실행",
  verify: "검증",
  ready: "준비",
};

const DEMO_PRODUCTS: SandboxProduct[] = [
  { id: "p1", name: "삼다수 생수 2L 12병", priceKrw: 12_900 },
  { id: "p2", name: "백산수 생수 2L 12병", priceKrw: 14_500 },
  { id: "p3", name: "아이시스 8.0 생수 2L 12병", priceKrw: 11_800 },
  { id: "p4", name: "제주 삼다수 2L 12병", priceKrw: 13_200 },
];

let seq = 0;
function nextId(prefix: string) {
  seq += 1;
  return `${prefix}-${seq}`;
}

function slugify(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("비교") || lower.includes("compare")) return "product.search_compare";
  if (lower.includes("검색") || lower.includes("search") || lower.includes("쿠팡"))
    return "product.search";
  return `custom.${Date.now().toString(36)}`;
}

function capabilityNameFrom(text: string): string {
  if (text.includes("비교")) return "Product Search & Compare";
  if (text.includes("가격")) return "Price Extraction";
  if (text.includes("리뷰")) return "Review Extraction";
  return "Product Search";
}

function parseIntent(text: string): {
  create: boolean;
  testId?: string;
  loopId?: string;
  publishId?: string;
  discover?: boolean;
  query?: string;
} {
  const lower = text.toLowerCase();
  if (lower.includes("발견") || lower.includes("찾아") && lower.includes("능력"))
    return { create: false, discover: true };
  if (lower.includes("publish") || lower.includes("게시") || lower.includes("배포"))
    return { create: false, publishId: "product.search_compare" };
  if (lower.includes("loop") || lower.includes("루프"))
    return { create: false, loopId: "product-compare-loop" };
  if (lower.includes("테스트"))
    return { create: false, testId: lower.includes("compare") ? "product.compare" : "product.search" };
  if (
    lower.includes("만들") ||
    lower.includes("만들어") ||
    lower.includes("create") ||
    lower.includes("능력")
  ) {
    const query = text.match(/["「](.+?)["」]/)?.[1] ?? "생수";
    return { create: true, query };
  }
  const query = text.match(/["「](.+?)["」]/)?.[1] ?? (lower.includes("생수") ? "생수" : "상품");
  return { create: false, query };
}

export function useHubMvpRuntime(): HubMvpRuntime {
  const [capabilities, setCapabilities] = useState<MvpCapability[]>(() => readMvpCapabilities());
  const [loops] = useState<MvpLoop[]>(() => readMvpLoops());
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<string | null>(null);
  const [selectedLoopId, setSelectedLoopId] = useState<string | null>(null);
  const [centerView, setCenterView] = useState<CenterView>("sandbox");
  const [workflowStage, setWorkflowStage] = useState<WorkflowStage>("idle");
  const [isRunning, setIsRunning] = useState(false);
  const [activityLines, setActivityLines] = useState<ActivityLine[]>([]);
  const [sandboxQuery, setSandboxQuery] = useState("");
  const [sandboxProducts, setSandboxProducts] = useState<SandboxProduct[]>([]);
  const [sandboxPhase, setSandboxPhase] = useState<HubMvpRuntime["sandboxPhase"]>("idle");
  const [agentCursor, setAgentCursor] = useState({ x: 40, y: 35, visible: false });
  const [readyCapability, setReadyCapability] = useState<MvpCapability | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "boot",
      role: "agent",
      text: "Rimvio에게 새 능력을 가르쳐 보세요. 무엇을 할 수 있게 만들까요?",
    },
  ]);
  const [command, setCommand] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  }, []);

  const pushActivity = useCallback((text: string, done = false) => {
    setActivityLines((prev) => [...prev, { id: nextId("a"), text, done }]);
  }, []);

  const markLastActivityDone = useCallback(() => {
    setActivityLines((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1]!;
      return [...prev.slice(0, -1), { ...last, done: true }];
    });
  }, []);

  const runSandbox = useCallback(
    (query: string, onComplete?: () => void) => {
      clearTimers();
      setCenterView("sandbox");
      setSandboxProducts([]);
      setSandboxQuery("");
      setSandboxPhase("opening");
      setAgentCursor({ x: 30, y: 28, visible: true });
      setActivityLines([]);
      pushActivity("웹사이트를 열었습니다", true);

      schedule(() => {
        setSandboxPhase("searching");
        pushActivity("검색창을 찾았습니다", true);
        setAgentCursor({ x: 48, y: 22, visible: true });
      }, 600);

      schedule(() => {
        setSandboxQuery(query);
        pushActivity(`"${query}" 입력`, true);
        setSandboxPhase("reading");
      }, 1200);

      schedule(() => {
        setSandboxPhase("comparing");
        pushActivity("상품 결과를 읽는 중…");
        setAgentCursor({ x: 55, y: 55, visible: true });
      }, 2000);

      schedule(() => {
        setSandboxProducts(DEMO_PRODUCTS);
        markLastActivityDone();
        pushActivity("가격을 비교하는 중…");
        setSandboxPhase("done");
      }, 2800);

      schedule(() => {
        markLastActivityDone();
        pushActivity("실행 완료", true);
        setAgentCursor({ x: 55, y: 55, visible: false });
        onComplete?.();
      }, 3400);
    },
    [clearTimers, markLastActivityDone, pushActivity, schedule],
  );

  const runWorkflow = useCallback(
    (request: string, onReady: (cap: MvpCapability) => void) => {
      clearTimers();
      setIsRunning(true);
      setReadyCapability(null);
      setCenterView("sandbox");
      setWorkflowStage("understand");

      const capId = slugify(request);
      const capName = capabilityNameFrom(request);

      schedule(() => {
        setWorkflowStage("plan");
        setChatMessages((prev) => [
          ...prev,
          {
            id: nextId("a"),
            role: "agent",
            text: "능력을 만들겠습니다.",
            workflow: (["understand", "plan", "build", "run", "verify", "ready"] as WorkflowStage[]).map(
              (stage) => ({
                stage,
                label: WORKFLOW_LABELS[stage],
                done: stage === "understand",
              }),
            ),
          },
        ]);
      }, 400);

      schedule(() => {
        setWorkflowStage("build");
        setChatMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role !== "agent" || !last.workflow) return prev;
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              workflow: last.workflow.map((row) => ({
                ...row,
                done: ["understand", "plan", "build"].includes(row.stage),
              })),
            },
          ];
        });
      }, 900);

      schedule(() => {
        setWorkflowStage("run");
        const query = request.includes("생수") ? "생수" : "상품";
        runSandbox(query, () => {
          setWorkflowStage("verify");
          setChatMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role !== "agent" || !last.workflow) return prev;
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                workflow: last.workflow.map((row) => ({
                  ...row,
                  done: row.stage !== "ready",
                })),
              },
            ];
          });
        });
      }, 1400);

      schedule(() => {
        const cap: MvpCapability = {
          id: capId,
          name: capName,
          description: request.slice(0, 120),
          inputSchema: [{ name: "query", type: "string" }],
          outputSchema: [{ name: "products", type: "array" }],
          status: "verified",
          version: "1.0.0",
          creator: "you",
          runtime: "browser",
          createdAt: new Date().toISOString(),
        };
        const saved = saveMvpCapability(cap);
        setCapabilities(saved);
        setReadyCapability(cap);
        setSelectedCapabilityId(cap.id);
        setWorkflowStage("ready");
        setCenterView("ready");
        setIsRunning(false);
        setChatMessages((prev) => {
          const last = prev[prev.length - 1];
          const workflow =
            last?.role === "agent" && last.workflow
              ? last.workflow.map((row) => ({ ...row, done: true }))
              : undefined;
          return [
            ...prev.slice(0, -1),
            ...(last?.role === "agent"
              ? [{ ...last, workflow, readyCapabilityId: cap.id, text: "Capability가 준비되었습니다." }]
              : []),
          ];
        });
        onReady(cap);
      }, 5200);
    },
    [clearTimers, runSandbox, schedule],
  );

  const testCapability = useCallback(
    (id: string) => {
      setSelectedCapabilityId(id);
      setCenterView("sandbox");
      setIsRunning(true);
      runSandbox("생수", () => setIsRunning(false));
    },
    [runSandbox],
  );

  const sendCommand = useCallback(() => {
    const text = command.trim();
    if (!text) return;
    setChatMessages((prev) => [...prev, { id: nextId("u"), role: "user", text }]);
    setCommand("");

    const intent = parseIntent(text);

    if (intent.discover) {
      const hits = [
        planCapabilityDiscovery({ utterance: "상품 가격 비교", skipReuseGate: true }),
        planCapabilityDiscovery({ utterance: "상품 검색", skipReuseGate: true }),
      ].filter(Boolean) as NonNullable<ReturnType<typeof planCapabilityDiscovery>>[];
      setChatMessages((prev) => [
        ...prev,
        {
          id: nextId("a"),
          role: "agent",
          text: hits.length ? "사용 가능한 Capability를 찾았습니다." : "아직 등록된 Capability가 없어요.",
          discovery: hits.map((h) => ({
            name: h.capabilityId,
            score: Math.round(h.score * 100),
          })),
        },
      ]);
      return;
    }

    if (intent.publishId) {
      const cap = capabilities.find((c) => c.id === intent.publishId) ?? readyCapability;
      if (cap) publishMvpCapability(cap);
      setCapabilities(readMvpCapabilities());
      setChatMessages((prev) => [
        ...prev,
        { id: nextId("a"), role: "agent", text: "Rimvio에 게시되었습니다. Main Agent가 이제 사용할 수 있어요." },
      ]);
      return;
    }

    if (intent.loopId) {
      setSelectedLoopId(intent.loopId);
      setCenterView("loop");
      runSandbox(intent.query ?? "생수");
      return;
    }

    if (intent.testId) {
      testCapability(intent.testId);
      return;
    }

    if (intent.create) {
      runWorkflow(text, () => undefined);
      return;
    }

    runSandbox(intent.query ?? "생수");
  }, [command, capabilities, readyCapability, runSandbox, runWorkflow, testCapability]);

  const selectCapability = useCallback((id: string) => {
    setSelectedCapabilityId(id);
    setSelectedLoopId(null);
    setCenterView("capability");
  }, []);

  const selectLoop = useCallback((id: string) => {
    setSelectedLoopId(id);
    setSelectedCapabilityId(null);
    setCenterView("loop");
  }, []);

  const publishCapability = useCallback((id: string) => {
    const cap = capabilities.find((c) => c.id === id) ?? readyCapability;
    if (!cap) return;
    const published = publishMvpCapability(cap);
    setCapabilities(readMvpCapabilities());
    setReadyCapability(published);
    setChatMessages((prev) => [
      ...prev,
      { id: nextId("a"), role: "agent", text: `${published.name}이(가) Rimvio에 게시되었습니다.` },
    ]);
  }, [capabilities, readyCapability]);

  const runLoop = useCallback(
    (id: string) => {
      selectLoop(id);
      setIsRunning(true);
      runSandbox("생수", () => setIsRunning(false));
    },
    [runSandbox, selectLoop],
  );

  const startCreateCapability = useCallback(() => {
    setCommand("쿠팡에서 상품을 검색하고 가격을 비교하는 능력을 만들어줘.");
  }, []);

  const discoverForUtterance = useCallback((utterance: string) => {
    const hit = planCapabilityDiscovery({ utterance, skipReuseGate: true });
    setChatMessages((prev) => [
      ...prev,
      {
        id: nextId("a"),
        role: "agent",
        text: hit ? `${hit.capabilityId} Capability를 찾았습니다.` : "맞는 Capability가 없습니다.",
        discovery: hit ? [{ name: hit.capabilityId, score: Math.round(hit.score * 100) }] : [],
      },
    ]);
  }, []);

  return useMemo(
    () => ({
      capabilities,
      loops,
      selectedCapabilityId,
      selectedLoopId,
      centerView,
      workflowStage,
      isRunning,
      activityLines,
      sandboxQuery,
      sandboxProducts,
      sandboxPhase,
      agentCursor,
      chatMessages,
      command,
      setCommand,
      sendCommand,
      selectCapability,
      selectLoop,
      testCapability,
      publishCapability,
      runLoop,
      startCreateCapability,
      readyCapability,
      discoverForUtterance,
    }),
    [
      capabilities,
      loops,
      selectedCapabilityId,
      selectedLoopId,
      centerView,
      workflowStage,
      isRunning,
      activityLines,
      sandboxQuery,
      sandboxProducts,
      sandboxPhase,
      agentCursor,
      chatMessages,
      command,
      sendCommand,
      selectCapability,
      selectLoop,
      testCapability,
      publishCapability,
      runLoop,
      startCreateCapability,
      readyCapability,
      discoverForUtterance,
    ],
  );
}

export function getMvpCapabilityById(
  runtime: HubMvpRuntime,
  id: string,
): MvpCapability | undefined {
  return runtime.capabilities.find((row) => row.id === id);
}
