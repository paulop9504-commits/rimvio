import type { AgentTask, ExecutionEngine, ExecutionResult } from "./types.js";
import { log } from "../logger.js";

export class MockExecutionEngine implements ExecutionEngine {
  async execute(task: AgentTask): Promise<ExecutionResult> {
    const url = task.payload.url ?? "https://example.com";
    log("BROWSER", `Mock navigate to ${url}`);
    await new Promise((r) => setTimeout(r, 500));
    return { success: true, url };
  }
}
