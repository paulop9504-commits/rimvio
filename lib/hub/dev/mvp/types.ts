export type MvpCapabilityStatus = "draft" | "verified" | "published";

export type MvpCapability = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly inputSchema: { name: string; type: string }[];
  readonly outputSchema: { name: string; type: string }[];
  readonly status: MvpCapabilityStatus;
  readonly version: string;
  readonly creator: string;
  readonly runtime: string;
  readonly createdAt: string;
};

export type MvpLoop = {
  readonly id: string;
  readonly name: string;
  readonly capabilityIds: readonly string[];
};

export type WorkflowStage =
  | "idle"
  | "understand"
  | "plan"
  | "build"
  | "run"
  | "verify"
  | "ready";

export type ActivityLine = {
  readonly id: string;
  readonly text: string;
  readonly done: boolean;
};

export type SandboxProduct = {
  readonly id: string;
  readonly name: string;
  readonly priceKrw: number;
};

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "agent";
      text: string;
      workflow?: { stage: WorkflowStage; label: string; done: boolean }[];
      readyCapabilityId?: string;
      discovery?: { name: string; score: number }[];
    };
