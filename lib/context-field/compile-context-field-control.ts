/**
 * Compile utterance → Context Field Control Plane (parse + project).
 * Single entry for tools / scout / graph that need multi-surface control.
 */

import { parseContextFields } from "@/lib/context-field/parse-context-fields";
import {
  projectFieldControlPlane,
  type ContextFieldControlPlane,
} from "@/lib/context-field/project-field-control-plane";

/** NL → FieldPack → ControlPlane (graph · search · recommend · booking). */
export function compileContextFieldControl(
  utterance: string,
): ContextFieldControlPlane {
  return projectFieldControlPlane(parseContextFields(utterance));
}
