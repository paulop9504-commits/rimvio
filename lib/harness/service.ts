import type { Harness, HarnessNode } from "@/lib/rimvio-protocol/harness/schema";
import { validateHarness, type HarnessValidationResult } from "@/lib/harness/validate";
import {
  createInMemoryHarnessRepository,
  type HarnessRepository,
} from "@/lib/harness/repository";

export type HarnessService = {
  create(draft: Harness): Promise<HarnessValidationResult & { harness?: Harness }>;
  update(harness: Harness): Promise<HarnessValidationResult & { harness?: Harness }>;
  get(id: string): Promise<Harness | null>;
  list(): Promise<readonly Harness[]>;
  remove(id: string): Promise<boolean>;
};

export function createHarnessService(repo: HarnessRepository = createInMemoryHarnessRepository()): HarnessService {
  return {
    async create(draft) {
      const result = validateHarness(draft);
      if (!result.ok) return result;
      if (await repo.get(result.harness.id)) {
        return {
          ok: false,
          issues: [
            {
              path: "id",
              message: `harness already exists: ${result.harness.id}`,
              code: "duplicate_id",
            },
          ],
        };
      }
      const saved = await repo.save(result.harness);
      return { ok: true, harness: saved };
    },
    async update(harness) {
      const result = validateHarness(harness);
      if (!result.ok) return result;
      if (!(await repo.get(result.harness.id))) {
        return {
          ok: false,
          issues: [
            {
              path: "id",
              message: `harness not found: ${result.harness.id}`,
              code: "not_found",
            },
          ],
        };
      }
      const saved = await repo.save(result.harness);
      return { ok: true, harness: saved };
    },
    async get(id) {
      return repo.get(id);
    },
    async list() {
      return repo.list();
    },
    async remove(id) {
      return repo.delete(id);
    },
  };
}

export function createEmptyHarnessDraft(input: {
  id: string;
  name: string;
  now?: string;
}): Harness {
  const now = input.now ?? new Date().toISOString();
  return {
    id: input.id,
    name: input.name,
    description: "",
    version: "0.1.0",
    status: "draft",
    type: "web_automation",
    runtime: {
      type: "BROWSER",
      environment: "sandbox",
      permissions: [],
    },
    inputSchema: { fields: [] },
    outputSchema: { fields: [] },
    nodes: [],
    permissions: [],
    constraints: [],
    verification: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function appendNode(harness: Harness, node: HarnessNode): Harness {
  return {
    ...harness,
    nodes: [...harness.nodes, node],
    updatedAt: new Date().toISOString(),
  };
}
