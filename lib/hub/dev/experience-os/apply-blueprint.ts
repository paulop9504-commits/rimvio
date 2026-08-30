/**
 * Experience Blueprint → existing PlatformDraft. Does not invent a second draft model.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import type { ExperienceBlueprint } from "@/lib/hub/dev/experience-os/experience-blueprint";

function categoryFor(templateId: ExperienceBlueprint["templateId"]): PlatformDraft["category"] {
  if (templateId === "travel" || templateId === "booking") return "travel";
  if (templateId === "saas" || templateId === "dashboard") return "productivity";
  if (templateId === "community") return "communication";
  return "e-commerce";
}

export function applyExperienceBlueprintToDraft(
  blueprint: ExperienceBlueprint,
  base?: PlatformDraft,
): PlatformDraft {
  const draft = base ?? createDefaultPlatformDraft();
  const slug = blueprint.title.replace(/\s+/g, "").toLowerCase();
  return {
    ...draft,
    id: `experience.${blueprint.templateId}.${slug}`,
    name: blueprint.title,
    description: `${blueprint.titleKo} — pages ${blueprint.pages.join(", ")}`,
    category: categoryFor(blueprint.templateId),
    tags: [blueprint.templateId, ...blueprint.data.slice(0, 3)],
    dataCollectionsJson: JSON.stringify(
      blueprint.data.map((name) => ({
        name,
        schema: `${name}.v1`,
        pii: name === "users" || name === "payments" || name === "orders",
      })),
    ),
    uiRoutesJson: JSON.stringify(
      blueprint.pages.map((page) => ({
        path: page === "Home" ? "/" : `/${page.toLowerCase().replace(/\s+/g, "-")}`,
        surface: "page",
        component: page.replace(/\s+/g, ""),
      })),
    ),
    workflowDescription: blueprint.capabilities.join(" → "),
    actions: blueprint.capabilities.map((name, i) => ({
      id: `exp-${blueprint.templateId}-${i + 1}`,
      name,
      description: name.replace(/\./g, " "),
      inputSchema: '{"type":"object"}',
      outputSchema: `${name}.response.v1`,
      approvalRequired: /payment|commit|confirm|purchase/.test(name),
    })),
    permissions: [
      ...draft.permissions,
      {
        id: `${blueprint.templateId}.operate`,
        label: `${blueprint.templateId}.operate`,
        scope: "Write",
        whyNeeded: `${blueprint.titleKo} 운영`,
        risk: "medium" as const,
        enabled: true,
      },
    ],
  };
}
