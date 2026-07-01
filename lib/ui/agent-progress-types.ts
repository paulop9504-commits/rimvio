export type AgentTaskStatus = "pending" | "in_progress" | "done";

export type AgentTask = {
  id: string;
  label: string;
  status: AgentTaskStatus;
};

export type AgentProgressVariant = "dark" | "light";

export type AgentProgressLayout = "vertical" | "horizontal";
