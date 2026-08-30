/**
 * Capability metadata — wraps Hub tool catalog + dependency graph.
 * Never invents tools that are not in the gateway.
 */

import { HUB_TOOL_CATALOG, getHubToolCatalogEntry } from "@/lib/hub/dev/hub-tool-catalog";
import { expandCapabilityDependencies } from "@/lib/rimvio-index/graph/dependency-graph";
import type { CapabilityMeta } from "@/lib/agent-os/decision-engine/types";

const DOMAIN_CAPABILITIES: readonly CapabilityMeta[] = [
  {
    id: "workspace.inspect",
    name: "Inspect",
    description: "Read current application state",
    toolId: "workspace.inspect",
    inputs: [],
    outputs: ["state"],
    preconditions: [],
    postconditions: ["current_state_known"],
    dependencies: [],
    conflicts: [],
    riskLevel: "low",
    reversible: true,
    verificationStrategy: "inspect",
    supportedDomains: ["inspect", "platform"],
    estimatedCost: 1,
    estimatedLatency: 1,
  },
  {
    id: "test.run",
    name: "Run tests",
    description: "Execute sandbox tests",
    toolId: "test.run",
    inputs: [],
    outputs: ["test_result"],
    preconditions: [],
    postconditions: ["tests_available"],
    dependencies: [],
    conflicts: [],
    riskLevel: "low",
    reversible: true,
    verificationStrategy: "sandbox_test",
    supportedDomains: ["verify", "platform"],
    estimatedCost: 2,
    estimatedLatency: 3,
  },
  {
    id: "connection.connect",
    name: "Connect provider",
    description: "OAuth / provider connection",
    toolId: "connection.connect",
    inputs: ["provider"],
    outputs: ["connection"],
    preconditions: [],
    postconditions: ["connection_ready"],
    dependencies: [],
    conflicts: [],
    riskLevel: "medium",
    reversible: true,
    verificationStrategy: "inspect",
    supportedDomains: ["platform_connection"],
    estimatedCost: 2,
    estimatedLatency: 4,
  },
  {
    id: "resource.apply",
    name: "Apply resource",
    description: "Experience / infrastructure apply",
    toolId: "resource.apply",
    inputs: ["utterance"],
    outputs: ["resource"],
    preconditions: [],
    postconditions: ["database_exists", "requested_capability_exists"],
    dependencies: [],
    conflicts: [],
    riskLevel: "medium",
    reversible: false,
    verificationStrategy: "inspect",
    supportedDomains: ["platform", "delivery_marketplace", "commerce", "commerce_order"],
    estimatedCost: 3,
    estimatedLatency: 4,
  },
  {
    id: "capability.create",
    name: "Create capability",
    description: "Add a missing capability",
    toolId: "capability.create",
    inputs: ["name"],
    outputs: ["capability"],
    preconditions: [],
    postconditions: ["requested_capability_exists"],
    dependencies: [],
    conflicts: [],
    riskLevel: "medium",
    reversible: true,
    verificationStrategy: "inspect",
    supportedDomains: ["platform", "delivery_marketplace", "commerce", "commerce_order"],
    estimatedCost: 3,
    estimatedLatency: 3,
  },
  {
    id: "order.create",
    name: "Order create",
    description: "Customer can create an order",
    toolId: "capability.create",
    inputs: ["user", "menu"],
    outputs: ["order"],
    preconditions: ["restaurant_exists", "menu_exists"],
    postconditions: ["order_creation_exists", "order_persistence_exists"],
    dependencies: ["restaurant.list", "menu.list"],
    conflicts: [],
    riskLevel: "medium",
    reversible: true,
    verificationStrategy: "sandbox_test",
    supportedDomains: ["delivery_marketplace", "commerce", "commerce_order"],
    estimatedCost: 4,
    estimatedLatency: 4,
  },
  {
    id: "cart.create",
    name: "Cart",
    description: "Shopping cart",
    toolId: "capability.create",
    inputs: ["menu"],
    outputs: ["cart"],
    preconditions: ["menu_exists"],
    postconditions: ["cart_exists"],
    dependencies: ["menu.list"],
    conflicts: [],
    riskLevel: "low",
    reversible: true,
    verificationStrategy: "inspect",
    supportedDomains: ["delivery_marketplace", "commerce", "commerce_order"],
    estimatedCost: 2,
    estimatedLatency: 2,
  },
  {
    id: "checkout.create",
    name: "Checkout",
    description: "Checkout flow",
    toolId: "capability.create",
    inputs: ["cart"],
    outputs: ["checkout"],
    preconditions: ["cart_exists"],
    postconditions: ["checkout_exists"],
    dependencies: ["order.create"],
    conflicts: [],
    riskLevel: "medium",
    reversible: true,
    verificationStrategy: "sandbox_test",
    supportedDomains: ["delivery_marketplace", "commerce", "commerce_order"],
    estimatedCost: 3,
    estimatedLatency: 3,
  },
  {
    id: "publish.request",
    name: "Publish",
    description: "Production publish",
    toolId: "publish.request",
    inputs: [],
    outputs: ["publish_gate"],
    preconditions: [],
    postconditions: [],
    dependencies: [],
    conflicts: [],
    riskLevel: "high",
    reversible: false,
    verificationStrategy: "none",
    supportedDomains: ["platform"],
    estimatedCost: 5,
    estimatedLatency: 5,
  },
  {
    id: "capability.delete",
    name: "Delete capability",
    description: "Destructive capability delete",
    toolId: "capability.delete",
    inputs: ["name"],
    outputs: [],
    preconditions: [],
    postconditions: [],
    dependencies: [],
    conflicts: [],
    riskLevel: "high",
    reversible: false,
    verificationStrategy: "inspect",
    supportedDomains: ["platform"],
    estimatedCost: 4,
    estimatedLatency: 2,
  },
];

export function listDecisionCapabilities(): readonly CapabilityMeta[] {
  return DOMAIN_CAPABILITIES;
}

export function getDecisionCapability(id: string): CapabilityMeta | null {
  return DOMAIN_CAPABILITIES.find((c) => c.id === id) ?? null;
}

export function toolRisk(toolId: string): "low" | "medium" | "high" {
  return getHubToolCatalogEntry(toolId)?.risk ?? "low";
}

export function toolRequiresApproval(toolId: string): boolean {
  if (toolId === "publish.request" || toolId === "capability.delete" || toolId === "code.deleteFile") {
    return true;
  }
  return getHubToolCatalogEntry(toolId)?.requiresApproval ?? false;
}

export function knownGatewayTool(toolId: string): boolean {
  return HUB_TOOL_CATALOG.some((e) => e.id === toolId);
}

export function dependenciesOf(capabilityId: string): readonly string[] {
  const meta = getDecisionCapability(capabilityId);
  const seeded = meta?.dependencies ?? [];
  return expandCapabilityDependencies(seeded.length ? seeded : [capabilityId]);
}
