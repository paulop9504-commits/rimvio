"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  DEV_AGENT_CAPABILITIES,
  DEV_AGENT_LOOPS,
  type DevAgentCapability,
  type DevAgentLoop,
} from "./fixtures";

export type FlowStage = "request" | "intent" | "capability" | "runtime" | "result";
export type FlowStatus = "idle" | "queued" | "running" | "completed" | "approval";

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
  agentCursor: { x: number; y: number; visible: boolean; label: string };
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
  metrics: { responseMs: number; apiCalls: number; successRate: number; tokens: number };
  sandboxTab: "sandbox" | "logs" | "metrics";
  setSandboxTab: (tab: "sandbox" | "logs" | "metrics") => void;
  consoleTab: "console" | "network" | "events";
  setConsoleTab: (tab: "console" | "network" | "events") => void;
  userSearch: () => void;
  isRunning: boolean;
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
  nights?: number;
  stopAtApproval?: boolean;
} {
  const lower = text.toLowerCase();
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
  const [selectedLoopId, setSelectedLoopId] = useState<string | null>(null);
  const [activeCapabilityId, setActiveCapabilityId] = useState<string | null>(null);
  const [activeLoopId, setActiveLoopId] = useState<string | null>(null);
  const [flowStage, setFlowStage] = useState<FlowStage>("request");
  const [flowStatus, setFlowStatus] = useState<FlowStatus>("idle");
  const [userRequest, setUserRequest] = useState("");
  const [intent, setIntent] = useState("");
  const [resultText, setResultText] = useState("");
  const [sandboxPhase, setSandboxPhase] = useState<SandboxPhase>("idle");
  const [location, setLocation] = useState("오사카, 일본");
  const [checkIn, setCheckIn] = useState("2024-06-01");
  const [checkOut, setCheckOut] = useState("2024-06-03");
  const [guests, setGuests] = useState("2명, 1개 객실");
  const [showResults, setShowResults] = useState(false);
  const [resultCount, setResultCount] = useState(0);
  const [agentCursor, setAgentCursor] = useState({
    x: 42,
    y: 38,
    visible: false,
    label: "Cloud Agent",
  });
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [networkLines, setNetworkLines] = useState<NetworkLine[]>([]);
  const [eventLines, setEventLines] = useState<EventLine[]>([]);
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
      text: "분석이 완료되었습니다. OsakaStay Sandbox가 준비됐어요. 명령을 내면 Capability를 실행해요.",
    },
  ]);
  const [command, setCommand] = useState("");
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalLabel, setApprovalLabel] = useState("");
  const [metrics, setMetrics] = useState({
    responseMs: 0,
    apiCalls: 0,
    successRate: 100,
    tokens: 0,
  });
  const [sandboxTab, setSandboxTab] = useState<"sandbox" | "logs" | "metrics">("sandbox");
  const [consoleTab, setConsoleTab] = useState<"console" | "network" | "events">("console");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const activeLoop = useMemo(
    () => DEV_AGENT_LOOPS.find((row) => row.id === activeLoopId) ?? null,
    [activeLoopId],
  );

  const clearTimers = useCallback(() => {
    for (const t of timers.current) {
      clearTimeout(t);
    }
    timers.current = [];
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

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  }, []);

  const runHotelSearch = useCallback(
    (input: {
      request: string;
      targetLocation: string;
      nights?: number;
      stopAtApproval?: boolean;
    }) => {
      clearTimers();
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
      setAgentCursor({ x: 28, y: 34, visible: true, label: "Cloud Agent" });
      setActiveCapabilityId("hotel.search");
      setMetrics({ responseMs: 0, apiCalls: 0, successRate: 100, tokens: 0 });

      const nights = input.nights ?? 2;
      const outDate = nights === 2 ? "2024-06-03" : "2024-06-04";

      pushConsole("Agent started");
      pushEvent("AGENT_STARTED");

      schedule(() => {
        setFlowStage("intent");
        setIntent("hotel.search");
        pushConsole("Intent recognized: hotel.search", "success");
        pushEvent("INTENT_RECOGNIZED");
      }, 400);

      schedule(() => {
        setFlowStage("capability");
        pushConsole("Capability selected: hotel.search");
      }, 800);

      schedule(() => {
        setFlowStage("runtime");
        pushConsole("Runtime: Cloud Agent");
      }, 1100);

      schedule(() => {
        setSandboxPhase("typing-location");
        setLocation("");
        pushEvent("INPUT_FOCUS");
      }, 1400);

      schedule(() => {
        setLocation(input.targetLocation);
        pushEvent("INPUT_CHANGED");
        setSandboxPhase("setting-dates");
        setAgentCursor({ x: 52, y: 42, visible: true, label: "Cloud Agent" });
      }, 2000);

      schedule(() => {
        setCheckIn("2024-06-01");
        setCheckOut(outDate);
        setGuests("2명, 1개 객실");
        pushEvent("DATES_SET");
      }, 2600);

      schedule(() => {
        setSandboxPhase("clicking-search");
        setAgentCursor({ x: 78, y: 48, visible: true, label: "Cloud Agent" });
        pushEvent("SEARCH_SUBMITTED");
      }, 3200);

      schedule(() => {
        setSandboxPhase("loading");
        pushConsole("API Call: GET /hotels?location=osaka");
        pushNetwork("GET", "/hotels?location=osaka", 200, 342);
        pushEvent("API_REQUEST");
      }, 3800);

      schedule(() => {
        pushConsole("Response: 200 OK (8 hotels)", "success");
        pushNetwork("GET", "/hotels/hotel_001", 200, 187);
        pushEvent("API_RESPONSE");
        setSandboxPhase("results");
        setShowResults(true);
        setResultCount(8);
        setFlowStage("result");
        setResultText("8 hotels found");
        setFlowStatus("completed");
        setAgentCursor({ x: 64, y: 58, visible: false, label: "Cloud Agent" });
        pushConsole("Rendering results...");
        pushEvent("RESULT_RENDERED");
        pushConsole("Frontend updated", "success");
        pushConsole("Execution completed in 1.23s", "success");
        setMetrics({ responseMs: 1.23, apiCalls: 3, successRate: 100, tokens: 2847 });
      }, 4600);

      if (input.stopAtApproval) {
        schedule(() => {
          setApprovalOpen(true);
          setApprovalLabel("payment.commit — ₩320,000 결제를 실행하려고 합니다.");
          setFlowStatus("approval");
          pushConsole("Approval required: payment.commit", "warn");
        }, 5000);
      }
    },
    [clearTimers, pushConsole, pushEvent, pushNetwork, schedule],
  );

  const sendCommand = useCallback(() => {
    const text = command.trim();
    if (!text) {
      return;
    }
    setChatMessages((prev) => [...prev, { id: nextId("u"), role: "user", text }]);
    setCommand("");

    const parsed = parseCommand(text);
    schedule(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: nextId("a"),
          role: "agent",
          text: parsed.loopId
            ? `${parsed.loopId} loop 실행을 준비할게요.`
            : `Intent: ${parsed.capabilityId ?? "hotel.search"}`,
        },
      ]);
    }, 200);

    if (parsed.loopId) {
      setActiveLoopId(parsed.loopId);
      setSelectedLoopId(parsed.loopId);
      runHotelSearch({
        request: text,
        targetLocation: parsed.location ?? "난바, 오사카",
        nights: parsed.nights,
        stopAtApproval: parsed.stopAtApproval,
      });
      return;
    }

    runHotelSearch({
      request: text,
      targetLocation: parsed.location ?? "오사카, 일본",
      nights: parsed.nights,
      stopAtApproval: parsed.stopAtApproval,
    });
  }, [command, runHotelSearch, schedule]);

  const testCapability = useCallback(
    (capabilityId: string) => {
      const cap = DEV_AGENT_CAPABILITIES.find((row) => row.id === capabilityId);
      if (!cap) {
        return;
      }
      setCenterMode({ kind: "sandbox" });
      runHotelSearch({
        request: `${capabilityId} 테스트`,
        targetLocation: "난바, 오사카",
        nights: 2,
        stopAtApproval: capabilityId === "payment.commit",
      });
    },
    [runHotelSearch],
  );

  const selectCapability = useCallback((id: string) => {
    setSelectedCapabilityId(id);
    setSelectedLoopId(null);
    setCenterMode({ kind: "capability", capabilityId: id });
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
      runHotelSearch({
        request: `${loopId} loop`,
        targetLocation: "난바, 오사카",
        nights: 2,
      });
    },
    [runHotelSearch, selectLoop],
  );

  const userSearch = useCallback(() => {
    runHotelSearch({
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
  };
}

export function getCapabilityById(id: string): DevAgentCapability | undefined {
  return DEV_AGENT_CAPABILITIES.find((row) => row.id === id);
}
