/**
 * Harness execution state — types only in Phase 1 (no Playwright wire yet).
 */

import { z } from "zod";

export const harnessExecutionStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "SKIPPED",
  "RETRYING",
]);

export type HarnessExecutionStatus = z.infer<typeof harnessExecutionStatusSchema>;

export const harnessActionExecutionLogSchema = z.object({
  executionId: z.string().min(1),
  harnessId: z.string().min(1),
  nodeId: z.string().optional(),
  actionId: z.string().min(1),
  timestamp: z.string().min(1),
  status: harnessExecutionStatusSchema,
  input: z.unknown().optional(),
  target: z.unknown().optional(),
  observation: z.unknown().optional(),
  verification: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      retriable: z.boolean().optional(),
    })
    .optional(),
  durationMs: z.number().nonnegative().optional(),
});

export type HarnessActionExecutionLog = z.infer<typeof harnessActionExecutionLogSchema>;

export const harnessExecutionStateSchema = z.object({
  executionId: z.string().min(1),
  harnessId: z.string().min(1),
  harnessVersion: z.string().min(1),
  status: harnessExecutionStatusSchema,
  currentNodeId: z.string().optional(),
  currentActionId: z.string().optional(),
  startedAt: z.string().min(1),
  updatedAt: z.string().min(1),
  finishedAt: z.string().optional(),
  logs: z.array(harnessActionExecutionLogSchema).default([]),
  approvalPending: z.boolean().default(false),
});

export type HarnessExecutionState = z.infer<typeof harnessExecutionStateSchema>;

export function createHarnessExecutionState(input: {
  executionId: string;
  harnessId: string;
  harnessVersion: string;
  now?: string;
}): HarnessExecutionState {
  const now = input.now ?? new Date().toISOString();
  return harnessExecutionStateSchema.parse({
    executionId: input.executionId,
    harnessId: input.harnessId,
    harnessVersion: input.harnessVersion,
    status: "PENDING",
    startedAt: now,
    updatedAt: now,
    logs: [],
    approvalPending: false,
  });
}
