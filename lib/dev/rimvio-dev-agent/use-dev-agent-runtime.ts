"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { formatEventForConsole } from "@/lib/sandbox/events";
import type { SandboxEvent } from "@/lib/sandbox/types";
import {
  createSandboxSession,
  hotelsFromSession,
  isTerminalSession,
  mapSessionPhase,
  productsFromSession,
  retrySandboxExecution,
  startSandboxRun,
  stopSandboxExecution,
  subscribeSandboxStream,
  type SerializedSandboxSession,
} from "./sandbox-client";
import {
  CHAT_SUGGESTIONS,
  DEMO_HOTEL_SEARCH_CONSOLE,
  DEMO_HOTEL_SEARCH_METRICS,
  DEMO_HOTEL_SEARCH_NETWORK,
  DEV_AGENT_CAPABILITIES,
  DEV_AGENT_LOOPS,
  type DevAgentCapability,
  type DevAgentLoop,
} from "./fixtures";
import {
  planDevAgentTurn,
  shouldPlanWithOperator,
} from "./operator-client";

export type FlowStage = "request" | "intent" | "capability" | "runtime" | "result";
export type FlowStatus = "idle" | "queued" | "running" | "completed" | "approval" | "failed";

export type ConsoleLine = {
  id: string;
  time: string;
  text: string;
  tone: "default" | "success" | "warn" | "error";
};

export type NetworkLine = {
  id: string;
  method: string;
  path: string;
  status: number;
  ms: number;
};

export type EventLine = {
  id: string;
  name: string;
};

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "agent";
      text: string;
      checklist?: { label: string; done: boolean }[];
      summary?: { capabilities: number; approvals: number };
    };

export type CenterMode =
  | { kind: "sandbox" }
  | { kind: "capability"; capabilityId: string };

export type SandboxPhase =
  | "idle"
  | "typing-location"
  | "setting-dates"
  | "clicking-search"
  | "loading"
  | "results";

export type DevAgentRuntime = {
  centerMode: CenterMode;
  setCenterMode: (mode: CenterMode) => void;
  selectedCapabilityId: string | null;
  selectedLoopId: string | null;
  selectCapability: (id: string) => void;
  selectLoop: (id: string) => void;
  activeCapabilityId: string | null;
  activeLoop: DevAgentLoop | null;
  flowStage: FlowStage;
  flowStatus: FlowStatus;
  userRequest: string;
  intent: string;
  resultText: string;
  sandboxPhase: SandboxPhase;
  location: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  showResults: boolean;
  resultCount: number;
  agentCursor: { x: number; y: number; visible: boolean; label: string; targetSelector?: string | null };
  consoleLines: ConsoleLine[];
  networkLines: NetworkLine[];
  eventLines: EventLine[];
  chatMessages: ChatMessage[];
  command: string;
  setCommand: (value: string) => void;
  sendCommand: () => void;
  testCapability: (capabilityId: string) => void;
  runLoop: (loopId: string) => void;
  approvePending: () => void;
  rejectPending: () => void;
  approvalOpen: boolean;
  approvalLabel: string;
  metrics: { responseMs: number; apiCalls: number; successRate: number; tokens: number; actions: number };
  sandboxTab: "sandbox" | "logs" | "metrics";
  setSandboxTab: (tab: "sandbox" | "logs" | "metrics") => void;
  consoleTab: "console" | "network" | "events";
  setConsoleTab: (tab: "console" | "network" | "events") => void;
  userSearch: () => void;
  isRunning: boolean;
  sandboxSessionId: string | null;
  latestScreenshot: string | null;
  currentAction: string | null;
  productQuery: string;
  setProductQuery: (value: string) => void;
  stopExecution: () => void;
  retryExecution: () => void;
  runProductSearch: (query: string) => void;
};

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

let lineSeq = 0;
function nextId(prefix: string) {
  lineSeq += 1;
  return `${prefix}-${lineSeq}`;
}

function parseCommand(text: string): {
  capabilityId?: string;
  loopId?: string;
  location?: string;
  query?: string;
  nights?: number;
  stopAtApproval?: boolean;
} {
  const lower = text.toLowerCase();
  if (lower.includes("product.search") || lower.includes("macbook")) {
    const queryMatch = text.match(/["“](.+?)["”]/)?.[1];
    return { capabilityId: "product.search", query: queryMatch ?? "MacBook" };
  }
  if (lower.includes("booking loop") || (lower.includes("booking") && lower.includes("loop"))) {
    return { loopId: "booking" };
  }
  if (lower.includes("hotel-search") || (lower.includes("hotel") && lower.includes("loop"))) {
    return { loopId: "hotel-search" };
  }
  if (lower.includes("payment loop")) {
    return { loopId: "payment" };
  }
  if (lower.includes("payment") && (lower.includes("멈춰") || lower.includes("승인"))) {
    return { capabilityId: "payment.commit", stopAtApproval: true };
  }
  if (lower.includes("hotel.detail") || lower.includes("상세")) {
    return { capabilityId: "hotel.detail" };
  }
  if (lower.includes("hotel.search") || lower.includes("테스트")) {
    return { capabilityId: "hotel.search" };
  }
  if (lower.includes("호텔") || lower.includes("난바") || lower.includes("오사카")) {
    const nights = lower.match(/(\d)\s*박/)?.[1];
    const location = lower.includes("난바") ? "난바, 오사카" : "오사카, 일본";
    return { capabilityId: "hotel.search", location, nights: nights ? Number(nights) : 2 };
  }
  return { capabilityId: "hotel.search", location: "오사카, 일본", nights: 2 };
}

export function useDevAgentRuntime(): DevAgentRuntime {
  const [centerMode, setCenterMode] = useState<CenterMode>({ kind: "sandbox" });
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<string | null>("hotel.search");
  const [selectedLoopId, setSelectedLoopId] = useState<string | null>("hotel-search");
  const [activeCapabilityId, setActiveCapabilityId] = useState<string | null>("hotel.search");
  const [activeLoopId, setActiveLoopId] = useState<string | null>("hotel-search");
  const [flowStage, setFlowStage] = useState<FlowStage>("result");
  const [flowStatus, setFlowStatus] = useState<FlowStatus>("completed");
  const [userRequest, setUserRequest] = useState("오사카 호텔 검색해줘");
  const [intent, setIntent] = useState("hotel.search");
  const [resultText, setResultText] = useState("8 hotels found");
  const [sandboxPhase, setSandboxPhase] = useState<SandboxPhase>("results");
  const [location, setLocation] = useState("오사카, 일본");
  const [checkIn, setCheckIn] = useState("2024-06-01");
  const [checkOut, setCheckOut] = useState("2024-06-03");
  const [guests, setGuests] = useState("2명, 1개 객실");
  const [showResults, setShowResults] = useState(true);
  const [resultCount, setResultCount] = useState(8);
  const [agentCursor, setAgentCursor] = useState({
    x: 42,
    y: 38,
    visible: false,
    label: "Cloud Agent",
  });
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>(
    DEMO_HOTEL_SEARCH_CONSOLE.map((line, index) => ({
      id: `demo-c-${index}`,
      ...line,
    })),
  );
  const [networkLines, setNetworkLines] = useState<NetworkLine[]>(
    DEMO_HOTEL_SEARCH_NETWORK.map((line, index) => ({
      id: `demo-n-${index}`,
      ...line,
    })),
  );
  const [eventLines, setEventLines] = useState<EventLine[]>([
    { id: "demo-e-1", name: "EXECUTION_STARTED" },
    { id: "demo-e-2", name: "NAVIGATION_COMPLETED" },
    { id: "demo-e-3", name: "DATA_EXTRACTED" },
    { id: "demo-e-4", name: "EXECUTION_COMPLETED" },
  ]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "boot-user",
      role: "user",
      text: "GitHub 프로젝트를 Rimvio에 연결하고 Agent가 사용할 수 있게 준비해줘.",
    },
    {
      id: "boot-agent",
      role: "agent",
      text: "프로젝트 분석을 시작할게요.",
      checklist: [
        { label: "Repository connected", done: true },
        { label: "Routes & APIs analyzed", done: true },
        { label: "Schemas generated", done: true },
        { label: "Permissions inferred", done: true },
        { label: "Capabilities discovered", done: true },
        { label: "Tests executing", done: true },
      ],
      summary: { capabilities: 8, approvals: 2 },
    },
    {
      id: "boot-ready",
      role: "agent",
      text: "분석이 완료되었습니다. OsakaStay Sandbox가 준비됐어요. hotel.search를 실행하면 Playwright가 실제 브라우저로 검색합니다.",
    },
  ]);
  const [command, setCommand] = useState("");
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalLabel, setApprovalLabel] = useState("");
  const [metrics, setMetrics] = useState(DEMO_HOTEL_SEARCH_METRICS);
  const [sandboxTab, setSandboxTab] = useState<"sandbox" | "logs" | "metrics">("sandbox");
  const [consoleTab, setConsoleTab] = useState<"console" | "network" | "events">("console");
  const [sandboxSessionId, setSandboxSessionId] = useState<string | null>(null);
  const [latestScreenshot, setLatestScreenshot] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState("MacBook");

  const streamRef = useRef<(() => void) | null>(null);
  const seenEventsRef = useRef<Set<string>>(new Set());
  const lastSessionRef = useRef<SerializedSandboxSession | null>(null);

  const activeLoop = useMemo(
    () => DEV_AGENT_LOOPS.find((row) => row.id === activeLoopId) ?? null,
    [activeLoopId],
  );

  const stopStreaming = useCallback(() => {
    if (streamRef.current) {
      streamRef.current();
      streamRef.current = null;
    }
  }, []);

  const pushConsole = useCallback(
    (text: string, tone: ConsoleLine["tone"] = "default") => {
      setConsoleLines((prev) => [
        ...prev,
        { id: nextId("c"), time: nowTime(), text, tone },
      ]);
    },
    [],
  );

  const pushNetwork = useCallback((method: string, path: string, status: number, ms: number) => {
    setNetworkLines((prev) => [
      ...prev,
      { id: nextId("n"), method, path, status, ms },
    ]);
  }, []);

  const pushEvent = useCallback((name: string) => {
    setEventLines((prev) => [...prev, { id: nextId("e"), name }]);
  }, []);

  const applySession = useCallback(
    (session: SerializedSandboxSession, stopAtApproval?: boolean) => {
      lastSessionRef.current = session;
      setSandboxSessionId(session.sessionId);
      setFlowStage(session.flowStage as FlowStage);
      setUserRequest(session.userRequest);
      setIntent(session.intent || session.capability);
      setResultText(session.resultText);
      setLatestScreenshot(session.latestScreenshot);
      setCurrentAction(session.currentAction);
      setAgentCursor(session.agentCursor);
      setSandboxPhase(mapSessionPhase(session));

      const input = session.input as {
        location?: string;
        checkIn?: string;
        checkOut?: string;
        guests?: string;
        query?: string;
      };
      if (input.location) setLocation(input.location);
      if (input.checkIn) setCheckIn(input.checkIn);
      if (input.checkOut) setCheckOut(input.checkOut);
      if (input.guests) setGuests(String(input.guests));
      if (input.query) setProductQuery(input.query);

      if (session.status === "running") {
        setFlowStatus("running");
        setShowResults(false);
      }
      if (session.status !== "running") {
        const verifyKey = `${session.sessionId}-verification`;
        if (session.verification && !seenEventsRef.current.has(verifyKey)) {
          seenEventsRef.current.add(verifyKey);
          if (!session.verification.ok) {
            pushConsole(
              `Verification failed · ${session.verification.errors.join(", ")}`,
              "warn",
            );
          } else {
            pushConsole("Verification passed", "success");
          }
        }
      }

      if (session.status === "success") {
        const count =
          session.capability === "product.search"
            ? productsFromSession(session)
            : hotelsFromSession(session);
        setShowResults(true);
        setResultCount(count);
        setFlowStatus("completed");
        setSandboxPhase("results");
      }
      if (session.status === "failed") {
        setFlowStatus("failed");
        pushConsole(session.structuredError?.message ?? session.error ?? "Sandbox execution failed", "error");
      }
      if (session.status === "cancelled") {
        setFlowStatus("idle");
        pushConsole("Execution cancelled", "warn");
      }

      setMetrics({
        responseMs: Number((session.metrics.executionMs / 1000).toFixed(2)),
        apiCalls: session.events.filter((event) =>
          event.type === "page.goto" || event.type === "NAVIGATION_COMPLETED",
        ).length,
        successRate: session.metrics.successRate,
        tokens: 0,
        actions: session.metrics.actionCount,
      });

      for (const event of session.events) {
        if (seenEventsRef.current.has(event.id)) {
          continue;
        }
        seenEventsRef.current.add(event.id);
        const formatted = formatEventForConsole(event as SandboxEvent);
        pushConsole(formatted.text, formatted.tone);
        pushEvent(event.type.toUpperCase());

        if (event.type === "page.goto" || event.type === "NAVIGATION_COMPLETED") {
          const url = String(event.data?.url ?? event.target ?? event.metadata?.url ?? "/sandbox");
          pushNetwork("GET", url, 200, 180);
        }
        if (event.type === "click" || event.type === "CLICK") {
          pushNetwork("POST", "/api/sandbox/search", 200, 220);
        }
      }

      if (session.status === "success" && stopAtApproval) {
        setApprovalOpen(true);
        setApprovalLabel("payment.commit — ₩320,000 결제를 실행하려고 합니다.");
        setFlowStatus("approval");
        pushConsole("Approval required: payment.commit", "warn");
      }
    },
    [pushConsole, pushEvent, pushNetwork],
  );

  const streamSession = useCallback(
    (sessionId: string, stopAtApproval?: boolean) => {
      stopStreaming();
      streamRef.current = subscribeSandboxStream(
        sessionId,
        (payload) => {
          applySession(payload.session, stopAtApproval);
          if (isTerminalSession(payload.session)) {
            stopStreaming();
          }
        },
        () => {
          stopStreaming();
          setFlowStatus("failed");
          pushConsole("Sandbox stream disconnected", "error");
        },
      );
    },
    [applySession, pushConsole, stopStreaming],
  );

  const runSandboxCapability = useCallback(
    async (input: {
      request: string;
      capabilityId: string;
      sandboxInput?: Record<string, unknown>;
      stopAtApproval?: boolean;
    }) => {
      stopStreaming();
      seenEventsRef.current.clear();

      const capabilityId = input.capabilityId;
      const sandboxInput = input.sandboxInput ?? {};

      setCenterMode({ kind: "sandbox" });
      setSandboxTab("sandbox");
      setShowResults(false);
      setResultCount(0);
      setFlowStatus("running");
      setFlowStage("request");
      setUserRequest(input.request);
      setIntent("");
      setResultText("");
      setSandboxPhase("idle");
      setLatestScreenshot(null);
      setCurrentAction(null);
      setConsoleLines([]);
      setNetworkLines([]);
      setEventLines([]);
      setActiveCapabilityId(capabilityId);
      setMetrics({ responseMs: 0, apiCalls: 0, successRate: 100, tokens: 0, actions: 0 });

      const locationInput = String(sandboxInput.location ?? "오사카, 일본");
      setLocation(locationInput);
      setCheckIn(String(sandboxInput.checkIn ?? "2024-06-01"));
      setCheckOut(String(sandboxInput.checkOut ?? "2024-06-03"));

      try {
        pushConsole("Creating sandbox session…");
        const session = await createSandboxSession({
          capability: capabilityId,
          userRequest: input.request,
          input: sandboxInput,
        });

        setSandboxSessionId(session.sessionId);
        applySession(session, input.stopAtApproval);
        streamSession(session.sessionId, input.stopAtApproval);

        pushConsole(`Session ${session.sessionId} · Chromium`);
        await startSandboxRun(session.sessionId);
      } catch {
        setFlowStatus("failed");
        pushConsole("Sandbox API unavailable — check server logs", "error");
      }
    },
    [applySession, pushConsole, stopStreaming, streamSession],
  );

  const runHotelSearch = useCallback(
    async (input: {
      request: string;
      targetLocation: string;
      nights?: number;
      stopAtApproval?: boolean;
      capabilityId?: string;
    }) => {
      const nights = input.nights ?? 2;
      const outDate = nights === 2 ? "2024-06-03" : "2024-06-04";
      const capabilityId = input.capabilityId ?? "hotel.search";

      await runSandboxCapability({
        request: input.request,
        capabilityId,
        stopAtApproval: input.stopAtApproval,
        sandboxInput: {
          location: input.targetLocation,
          checkIn: "2024-06-01",
          checkOut: outDate,
          guests: "2",
        },
      });
    },
    [runSandboxCapability],
  );

  const sendCommand = useCallback(() => {
    const text = command.trim();
    if (!text) {
      return;
    }
    setChatMessages((prev) => [...prev, { id: nextId("u"), role: "user", text }]);
    setCommand("");

    const parsed = parseCommand(text);

    const launchSandbox = (capabilityId: string, sandboxInput?: Record<string, unknown>) => {
      if (parsed.loopId) {
        setActiveLoopId(parsed.loopId);
        setSelectedLoopId(parsed.loopId);
      }
      void runSandboxCapability({
        request: text,
        capabilityId,
        stopAtApproval: parsed.stopAtApproval,
        sandboxInput:
          sandboxInput ??
          (capabilityId === "product.search"
            ? { query: parsed.query ?? productQuery, limit: 5 }
            : capabilityId === "hotel.detail"
              ? { hotelId: "grand-osaka" }
              : {
                  location: parsed.location ?? "오사카, 일본",
                  checkIn: "2024-06-01",
                  checkOut: parsed.nights === 1 ? "2024-06-02" : "2024-06-03",
                  guests: "2",
                }),
      });
    };

    if (shouldPlanWithOperator(text)) {
      void planDevAgentTurn(text).then((plan) => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: nextId("a"),
            role: "agent",
            text: plan.goalKo,
            checklist: plan.steps.map((step, index) => ({
              label: `${step.stage.toUpperCase()} · ${step.label}`,
              done: index === 0,
            })),
          },
        ]);
        launchSandbox(plan.capabilityId, plan.sandboxInput);
      });
      return;
    }

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: nextId("a"),
          role: "agent",
          text: parsed.loopId
            ? `${parsed.loopId} loop 실행을 준비할게요. Sandbox에서 hotel.search부터 테스트합니다.`
            : `Intent: ${parsed.capabilityId ?? "hotel.search"} · Sandbox 실행`,
        },
      ]);
    }, 200);

    launchSandbox(parsed.capabilityId ?? "product.search");
  }, [command, productQuery, runSandboxCapability]);

  const testCapability = useCallback(
    (capabilityId: string) => {
      setCenterMode({ kind: "sandbox" });
      if (capabilityId === "product.search") {
        void runSandboxCapability({
          request: `${capabilityId} 테스트 · ${productQuery}`,
          capabilityId,
          sandboxInput: { query: productQuery, limit: 5 },
        });
        return;
      }
      if (capabilityId === "hotel.detail") {
        void runSandboxCapability({
          request: `${capabilityId} 테스트`,
          capabilityId,
          sandboxInput: { hotelId: "grand-osaka" },
        });
        return;
      }
      void runHotelSearch({
        request: `${capabilityId} 테스트`,
        targetLocation: "난바, 오사카",
        nights: 2,
        stopAtApproval: capabilityId === "payment.commit",
        capabilityId: capabilityId === "payment.commit" ? "hotel.search" : capabilityId,
      });
    },
    [runHotelSearch, runSandboxCapability, productQuery],
  );

  const runProductSearch = useCallback(
    (query: string) => {
      void runSandboxCapability({
        request: `product.search · ${query}`,
        capabilityId: "product.search",
        sandboxInput: { query, limit: 5 },
      });
    },
    [runSandboxCapability],
  );

  const stopExecution = useCallback(() => {
    const sessionId = lastSessionRef.current?.sessionId ?? sandboxSessionId;
    if (!sessionId) {
      return;
    }
    void stopSandboxExecution(sessionId)
      .then((session) => {
        applySession(session);
        stopStreaming();
      })
      .catch(() => {
        pushConsole("Stop execution failed", "error");
      });
  }, [applySession, pushConsole, sandboxSessionId, stopStreaming]);

  const retryExecution = useCallback(() => {
    const sessionId = lastSessionRef.current?.sessionId ?? sandboxSessionId;
    if (!sessionId) {
      return;
    }
    void retrySandboxExecution(sessionId)
      .then((session) => {
        seenEventsRef.current.clear();
        setFlowStatus("running");
        applySession(session);
        streamSession(session.sessionId);
        pushConsole(`Retry started · ${session.sessionId}`);
      })
      .catch(() => {
        pushConsole("Retry execution failed", "error");
      });
  }, [applySession, pushConsole, sandboxSessionId, streamSession]);

  const selectCapability = useCallback((id: string) => {
    setSelectedCapabilityId(id);
    setSelectedLoopId(null);
    setCenterMode({ kind: "sandbox" });
  }, []);

  const selectLoop = useCallback((id: string) => {
    setSelectedLoopId(id);
    setSelectedCapabilityId(null);
    setCenterMode({ kind: "sandbox" });
    setActiveLoopId(id);
  }, []);

  const runLoop = useCallback(
    (loopId: string) => {
      selectLoop(loopId);
      void runHotelSearch({
        request: `${loopId} loop`,
        targetLocation: "난바, 오사카",
        nights: 2,
        capabilityId: "hotel.search",
      });
    },
    [runHotelSearch, selectLoop],
  );

  const userSearch = useCallback(() => {
    void runHotelSearch({
      request: "사용자가 검색 버튼을 눌렀어요",
      targetLocation: location || "오사카, 일본",
      nights: 2,
    });
  }, [location, runHotelSearch]);

  const approvePending = useCallback(() => {
    setApprovalOpen(false);
    pushConsole("Approval granted — continuing", "success");
    setFlowStatus("completed");
  }, [pushConsole]);

  const rejectPending = useCallback(() => {
    setApprovalOpen(false);
    pushConsole("Approval rejected", "warn");
    setFlowStatus("idle");
  }, [pushConsole]);

  return {
    centerMode,
    setCenterMode,
    selectedCapabilityId,
    selectedLoopId,
    selectCapability,
    selectLoop,
    activeCapabilityId,
    activeLoop,
    flowStage,
    flowStatus,
    userRequest,
    intent,
    resultText,
    sandboxPhase,
    location,
    checkIn,
    checkOut,
    guests,
    showResults,
    resultCount,
    agentCursor,
    consoleLines,
    networkLines,
    eventLines,
    chatMessages,
    command,
    setCommand,
    sendCommand,
    testCapability,
    runLoop,
    approvePending,
    rejectPending,
    approvalOpen,
    approvalLabel,
    metrics,
    sandboxTab,
    setSandboxTab,
    consoleTab,
    setConsoleTab,
    userSearch,
    isRunning: flowStatus === "running" || flowStatus === "approval",
    sandboxSessionId,
    latestScreenshot,
    currentAction,
    productQuery,
    setProductQuery,
    stopExecution,
    retryExecution,
    runProductSearch,
  };
}

export function getCapabilityById(id: string): DevAgentCapability | undefined {
  return DEV_AGENT_CAPABILITIES.find((row) => row.id === id);
}
