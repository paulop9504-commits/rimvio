/**
 * Context Command Bar ops — ADR-028.
 * Distinct from graph `move_context` (folder move of a node).
 */

export const CONTEXT_COMMAND_KINDS = [
  "migrate_anchor",
  "clone_context",
  "save_snapshot",
] as const;

export type ContextCommandKind = (typeof CONTEXT_COMMAND_KINDS)[number];

export type ClassifiedContextCommand = {
  readonly kind: ContextCommandKind;
  readonly destinationLabelKo: string | null;
  readonly rawUtterance: string;
};

export type ContextCommandResult =
  | {
      readonly ok: true;
      readonly kind: ContextCommandKind;
      readonly toastKo: string;
      readonly assistantReplyKo: string;
      /** Same event (migrate) or new event (clone). */
      readonly contextEventId: string;
      readonly destinationLabelKo: string | null;
      /** Globe pin / camera target after migrate·clone. */
      readonly anchorLat: number | null;
      readonly anchorLng: number | null;
      readonly anchorPlaceLabelKo: string | null;
      /** Caller should re-scout Reality under the new anchor. */
      readonly shouldRescout: boolean;
      readonly rescoutUtterance: string | null;
    }
  | {
      readonly ok: false;
      readonly reasonKo: string;
    };
