/**
 * Capability #31 — Task Decomposition.
 * Platform Goal → ordered task graph for planner.
 */

import type { HubAgentPlanStep } from "@/lib/hub/dev/hub-agent-loop";
import type { HubWorkspaceToolId } from "@/lib/hub/dev/hub-workspace-tools";
import type { DiscoveredPlatformContext } from "@/lib/hub/dev/platform-agent/context-discovery";
import type { PlatformGoal } from "@/lib/hub/dev/platform-agent/platform-goal";

export type PlatformTask = {
  readonly id: string;
  readonly labelKo: string;
  readonly category: "understand" | "create" | "modify" | "integrate" | "verify" | "publish";
  readonly toolId: HubWorkspaceToolId;
  readonly args?: Record<string, unknown>;
  readonly dependsOn: readonly string[];
};

export type PlatformTaskGraph = {
  readonly goalKo: string;
  readonly tasks: readonly PlatformTask[];
  readonly steps: readonly HubAgentPlanStep[];
};

function task(
  id: string,
  labelKo: string,
  category: PlatformTask["category"],
  toolId: HubWorkspaceToolId,
  dependsOn: string[] = [],
  args?: Record<string, unknown>,
): PlatformTask {
  return { id, labelKo, category, toolId, args, dependsOn };
}

/** Decompose goal + discovery into dependency-aware task graph. */
export function decomposePlatformGoal(input: {
  readonly goal: PlatformGoal;
  readonly discovery: DiscoveredPlatformContext;
  readonly stripeConnected: boolean;
}): PlatformTaskGraph {
  const tasks: PlatformTask[] = [];
  const { goal, discovery } = input;

  tasks.push(task("t_observe", "Platform 상태 확인", "understand", "workspace.inspect"));

  if (goal.scope.kind === "code_direct") {
    const readId = "t_code_read";
    tasks.push(
      task(readId, "소스 읽기", "modify", "code.readFile", ["t_observe"], {
        path: goal.scope.targetPath,
        capability: goal.scope.targetCapability,
      }),
    );
    tasks.push(
      task("t_code_edit", "코드 수정", "modify", "code.modifyFile", [readId], {
        path: goal.scope.targetPath,
        capability: goal.scope.targetCapability,
        symbol: goal.scope.targetSymbol,
      }),
    );
    tasks.push(task("t_test", "테스트", "verify", "test.run", ["t_code_edit"]));
  } else {
    for (const cap of discovery.missingCapabilities) {
      const createId = `t_create_${cap.replace(/\./g, "_")}`;
      tasks.push(
        task(createId, `${cap} 생성`, "create", "capability.create", ["t_observe"], {
          capability: cap,
          name: cap,
        }),
      );
      tasks.push(
        task(`t_schema_${cap.replace(/\./g, "_")}`, `${cap} schema`, "create", "schema.update", [
          createId,
        ], { capability: cap }),
      );
    }

    if (goal.flows.length > 0) {
      tasks.push(
        task("t_workflow", "Workflow 정의", "create", "workflow.create", [
          ...discovery.missingCapabilities.map((c) => `t_schema_${c.replace(/\./g, "_")}`),
        ], { description: goal.flows[0] }),
      );
    }

    if (!input.stripeConnected && goal.requestedCapabilities.some((c) => c.startsWith("payment."))) {
      tasks.push(task("t_stripe", "Stripe 연결", "integrate", "connection.connect", ["t_observe"], {
        provider: "stripe",
      }));
    }

    const testDeps = discovery.missingCapabilities.map((c) => `t_schema_${c.replace(/\./g, "_")}`);
    tasks.push(task("t_test", "Sandbox 테스트", "verify", "test.run", testDeps));

    if (goal.domain === "hotel_booking" && discovery.missingCapabilities.length >= 2) {
      tasks.push(task("t_preview", "Preview 검증", "verify", "preview.run", ["t_test"]));
    }

    if (goal.intent === "publish") {
      tasks.push(task("t_publish", "Publish 요청", "publish", "publish.request", ["t_test"]));
    }
  }

  const steps: HubAgentPlanStep[] = tasks.map((t) => ({
    id: t.id,
    label: t.labelKo,
    toolId: t.toolId,
    args: t.args,
  }));

  return {
    goalKo: goal.summaryKo,
    tasks,
    steps,
  };
}
