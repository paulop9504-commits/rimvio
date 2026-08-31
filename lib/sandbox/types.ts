export type SandboxLifecycleStatus =
  | "CREATED"
  | "QUEUED"
  | "STARTING"
  | "RUNNING"
  | "WAITING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

/** Legacy UI status — kept for Phase 1 compatibility */
export type SandboxSessionStatus =
  | "idle"
  | "running"
  | "success"
  | "failed"
  | "waiting"
  | "approval"
  | "cancelled";

export type SandboxFlowStage =
  | "request"
  | "intent"
  | "capability"
  | "runtime"
  | "result";

export type SandboxEventType =
  | "EXECUTION_STARTED"
  | "EXECUTION_COMPLETED"
  | "EXECUTION_FAILED"
  | "EXECUTION_CANCELLED"
  | "BROWSER_STARTED"
  | "NAVIGATION_STARTED"
  | "NAVIGATION_COMPLETED"
  | "ELEMENT_FOUND"
  | "CLICK"
  | "TYPE"
  | "WAIT"
  | "DATA_EXTRACTED"
  | "STEP_COMPLETED"
  | "SCREENSHOT"
  | "browser.launch"
  | "page.goto"
  | "element.find"
  | "input"
  | "click"
  | "extract"
  | "screenshot"
  | "result"
  | "error"
  | "flow.stage";

export type SandboxExecutionError = {
  code: string;
  message: string;
  step: string;
  recoverable: boolean;
};

export type SandboxEvent = {
  id: string;
  executionId: string;
  sessionId: string;
  timestamp: number;
  type: SandboxEventType;
  step: string | null;
  action: string | null;
  target: string | null;
  metadata: Record<string, unknown>;
  durationMs: number | null;
  status: "ok" | "error" | "pending";
  data: Record<string, unknown>;
};

export type SandboxMetrics = {
  executionMs: number;
  actionCount: number;
  successRate: number;
  stepCount: number;
};

export type AgentCursorHint = {
  x: number;
  y: number;
  visible: boolean;
  label: string;
  targetSelector?: string | null;
};

export type SandboxVerification = {
  ok: boolean;
  errors: string[];
};

export type SandboxSession = {
  sessionId: string;
  executionId: string;
  userId: string | null;
  projectId: string | null;
  capability: string;
  runtimeId: string;
  runtime: "browser";
  browser: "chromium";
  environment: "sandbox";
  lifecycleStatus: SandboxLifecycleStatus;
  status: SandboxSessionStatus;
  flowStage: SandboxFlowStage;
  userRequest: string;
  intent: string;
  resultText: string;
  currentStep: string | null;
  input: Record<string, unknown>;
  output: unknown | null;
  events: SandboxEvent[];
  latestScreenshot: string | null;
  screenshots: Array<{ step: string; dataUrl: string; timestamp: number }>;
  currentAction: string | null;
  agentCursor: AgentCursorHint;
  metrics: SandboxMetrics;
  verification: SandboxVerification | null;
  structuredError: SandboxExecutionError | null;
  error: string | null;
  retryOf: string | null;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type CreateSandboxSessionInput = {
  capability: string;
  userRequest?: string;
  input?: Record<string, unknown>;
  userId?: string | null;
  projectId?: string | null;
  runtimeId?: string;
  retryOf?: string | null;
};

export type ExecutionContext = {
  sessionId: string;
  executionId: string;
  baseUrl: string;
  isCancelled: () => boolean;
  emit: (type: SandboxEventType, data?: Record<string, unknown>) => void;
  emitStep: (input: {
    type: SandboxEventType;
    step: string;
    action: string;
    target?: string;
    metadata?: Record<string, unknown>;
    durationMs?: number;
    status?: "ok" | "error" | "pending";
  }) => void;
  setFlowStage: (stage: SandboxFlowStage) => void;
  setCurrentAction: (action: string | null, step?: string | null) => void;
  setAgentCursor: (cursor: Partial<AgentCursorHint>) => void;
  setScreenshot: (dataUrl: string, step?: string) => void;
  fail: (error: SandboxExecutionError) => never;
};

export type ExecutionResult = {
  ok: boolean;
  output?: unknown;
  error?: string;
  structuredError?: SandboxExecutionError | null;
};

export type ElementBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface BrowserRuntime {
  launch(): Promise<void>;
  navigate(url: string): Promise<void>;
  click(selector: string): Promise<void>;
  type(selector: string, text: string): Promise<void>;
  select(selector: string, value: string): Promise<void>;
  scroll(selector: string): Promise<void>;
  waitForSelector(selector: string): Promise<void>;
  wait(ms: number): Promise<void>;
  extractText(selector: string): Promise<string>;
  extractStructured<T>(selector: string, script: string): Promise<T>;
  count(selector: string): Promise<number>;
  getElementBox(selector: string): Promise<ElementBox | null>;
  dismissBlockingOverlays(): Promise<void>;
  screenshot(): Promise<Buffer>;
  close(): Promise<void>;
}

export interface CapabilityRuntime {
  execute(
    capability: string,
    input: Record<string, unknown>,
    context: ExecutionContext,
    browser: BrowserRuntime,
  ): Promise<ExecutionResult>;
}

export type ProductSearchInput = {
  query: string;
  limit?: number;
};

export type ProductSearchOutput = {
  products: Array<{
    name: string;
    price: string;
    url: string;
  }>;
};
