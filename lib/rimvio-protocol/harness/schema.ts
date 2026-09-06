/**
 * Rimvio Harness protocol — Action Specification SSOT (Phase 1).
 * Builder = WHAT · Labeller = HOW · Runtime executes these shapes.
 * @see docs/harness/BUILD_PLAN.md
 */

import { z } from "zod";

/** Semver-ish or simple x.y.z / x.y */
export const harnessVersionSchema = z
  .string()
  .min(1)
  .regex(/^\d+\.\d+(\.\d+)?([-.][a-zA-Z0-9.]+)?$/, "version must look like 1.0.0");

export const harnessStatusSchema = z.enum([
  "draft",
  "testing",
  "verified",
  "published",
  "deprecated",
]);

export const harnessTypeSchema = z.enum([
  "web_automation",
  "desktop",
  "api",
  "composite",
]);

export const harnessNodeTypeSchema = z.enum([
  "TRIGGER",
  "RESEARCH",
  "EXTRACT",
  "ACTION",
  "CONDITION",
  "REPORT",
  "VERIFY",
]);

export const harnessActionTypeSchema = z.enum([
  "OBSERVE",
  "NAVIGATE",
  "CLICK",
  "TYPE",
  "SCROLL",
  "READ",
  "EXTRACT",
  "CREATE",
  "UPDATE",
  "DELETE",
  "EXECUTE",
  "COMMUNICATE",
  "WAIT",
  "GET",
]);

export const harnessPermissionTypeSchema = z.enum([
  "READ",
  "WRITE",
  "MODIFY",
  "DELETE",
  "FINANCIAL",
  "PERSONAL_DATA",
  "COMMUNICATION",
  "ADMIN",
  "EXTERNAL_ACTION",
]);

export const harnessVerificationTypeSchema = z.enum([
  "ELEMENT_EXISTS",
  "TEXT_MATCH",
  "VALUE_MATCH",
  "URL_MATCH",
  "COUNT",
  "STATE",
  "CUSTOM",
]);

export const harnessVerificationSeveritySchema = z.enum([
  "info",
  "warn",
  "error",
  "blocker",
]);

export const harnessConstraintOperatorSchema = z.enum([
  "eq",
  "neq",
  "lt",
  "lte",
  "gt",
  "gte",
  "in",
  "contains",
  "exists",
]);

export const harnessRuntimeTypeSchema = z.enum([
  "BROWSER",
  "DESKTOP",
  "MOBILE",
  "SERVER",
  "CLOUD",
  "ENTERPRISE",
  "PHYSICAL_DEVICE",
]);

export const harnessJsonSchemaFieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "object", "array", "url", "image"]),
  required: z.boolean().optional().default(true),
  description: z.string().optional(),
});

export const harnessIoSchemaSchema = z.object({
  fields: z.array(harnessJsonSchemaFieldSchema).default([]),
});

export const harnessTargetSchema = z.object({
  selector: z.string().optional(),
  xpath: z.string().optional(),
  url: z.string().optional(),
  description: z.string().optional(),
});

export const harnessWaitForSchema = z.object({
  type: z.enum(["ELEMENT_EXISTS", "TIMEOUT", "URL_MATCH", "NETWORK_IDLE", "CUSTOM"]),
  selector: z.string().optional(),
  url: z.string().optional(),
  ms: z.number().int().nonnegative().optional(),
  custom: z.string().optional(),
});

export const harnessRetrySchema = z.object({
  maxAttempts: z.number().int().min(0).max(10).default(0),
  delayMs: z.number().int().nonnegative().default(500),
});

export const harnessVerificationSchema = z.object({
  id: z.string().min(1),
  type: harnessVerificationTypeSchema,
  target: harnessTargetSchema.optional(),
  condition: z.string().optional(),
  expected: z.unknown().optional(),
  severity: harnessVerificationSeveritySchema.default("error"),
});

export const harnessActionSchema = z.object({
  id: z.string().min(1),
  type: harnessActionTypeSchema,
  target: harnessTargetSchema.optional(),
  selector: z.string().optional(),
  input: z.string().optional(),
  variable: z.string().optional(),
  waitFor: harnessWaitForSchema.optional(),
  timeout: z.number().int().positive().optional(),
  retry: harnessRetrySchema.optional(),
  verification: z.array(harnessVerificationSchema).optional(),
  fields: z
    .array(
      z.object({
        name: z.string().min(1),
        selector: z.string().min(1),
        type: z.enum(["string", "number", "boolean", "url", "image"]),
      }),
    )
    .optional(),
});

export const harnessPermissionSchema = z.object({
  type: harnessPermissionTypeSchema,
  scope: z.string().min(1),
  resource: z.string().optional(),
  approvalRequired: z.boolean().default(false),
});

export const harnessConstraintSchema = z.object({
  field: z.string().min(1),
  operator: harnessConstraintOperatorSchema,
  value: z.unknown(),
  action: z.enum(["block", "require_approval", "warn"]).default("block"),
});

export const harnessRuntimeSchema = z.object({
  type: harnessRuntimeTypeSchema,
  environment: z.enum(["sandbox", "preview", "production"]).default("sandbox"),
  browser: z
    .object({
      headless: z.boolean().default(true),
      locale: z.string().optional(),
      viewport: z
        .object({
          width: z.number().int().positive(),
          height: z.number().int().positive(),
        })
        .optional(),
    })
    .optional(),
  permissions: z.array(z.string()).default([]),
  networkPolicy: z
    .object({
      allowHosts: z.array(z.string()).optional(),
      blockHosts: z.array(z.string()).optional(),
    })
    .optional(),
  secretsPolicy: z
    .object({
      allowSecretRefs: z.array(z.string()).optional(),
    })
    .optional(),
});

export const harnessNodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const harnessOnErrorSchema = z.object({
  strategy: z.enum(["fail", "skip", "retry", "goto_node"]).default("fail"),
  gotoNodeId: z.string().optional(),
});

export const harnessNodeSchema = z.object({
  id: z.string().min(1),
  type: harnessNodeTypeSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  position: harnessNodePositionSchema.optional(),
  input: z.record(z.unknown()).optional(),
  output: z.record(z.unknown()).optional(),
  actions: z.array(harnessActionSchema).default([]),
  permissions: z.array(harnessPermissionSchema).default([]),
  constraints: z.array(harnessConstraintSchema).default([]),
  verification: z.array(harnessVerificationSchema).default([]),
  retry: harnessRetrySchema.optional(),
  timeout: z.number().int().positive().optional(),
  onError: harnessOnErrorSchema.optional(),
  /** Optional edge: next node ids (simple linear/DAG hint for Phase 1) */
  next: z.array(z.string()).optional(),
});

export const harnessMetadataSchema = z.object({
  industry: z.string().optional(),
  complexity: z.enum(["low", "medium", "high"]).optional(),
  estimatedDurationMs: z.number().int().nonnegative().optional(),
  estimatedCostUsd: z.number().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
  targetHost: z.string().optional(),
  creatorId: z.string().optional(),
});

export const harnessSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).default(""),
  version: harnessVersionSchema,
  status: harnessStatusSchema.default("draft"),
  type: harnessTypeSchema.default("web_automation"),
  runtime: harnessRuntimeSchema,
  inputSchema: harnessIoSchemaSchema.default({ fields: [] }),
  outputSchema: harnessIoSchemaSchema.default({ fields: [] }),
  nodes: z.array(harnessNodeSchema).default([]),
  permissions: z.array(harnessPermissionSchema).default([]),
  constraints: z.array(harnessConstraintSchema).default([]),
  verification: z.array(harnessVerificationSchema).default([]),
  metadata: harnessMetadataSchema.optional(),
  createdAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  updatedAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
});

export type HarnessStatus = z.infer<typeof harnessStatusSchema>;
export type HarnessType = z.infer<typeof harnessTypeSchema>;
export type HarnessNodeType = z.infer<typeof harnessNodeTypeSchema>;
export type HarnessActionType = z.infer<typeof harnessActionTypeSchema>;
export type HarnessPermissionType = z.infer<typeof harnessPermissionTypeSchema>;
export type HarnessVerificationType = z.infer<typeof harnessVerificationTypeSchema>;
export type HarnessRuntimeType = z.infer<typeof harnessRuntimeTypeSchema>;
export type HarnessAction = z.infer<typeof harnessActionSchema>;
export type HarnessNode = z.infer<typeof harnessNodeSchema>;
export type HarnessPermission = z.infer<typeof harnessPermissionSchema>;
export type HarnessConstraint = z.infer<typeof harnessConstraintSchema>;
export type HarnessVerification = z.infer<typeof harnessVerificationSchema>;
export type HarnessRuntime = z.infer<typeof harnessRuntimeSchema>;
export type Harness = z.infer<typeof harnessSchema>;
export type HarnessIoSchema = z.infer<typeof harnessIoSchemaSchema>;
export type HarnessMetadata = z.infer<typeof harnessMetadataSchema>;
