"use client";

import { useCallback, useMemo, useState } from "react";
import { HubCodeEditor } from "@/components/hub/wizard/hub-code-editor";
import { HubDevDiffPanel } from "@/components/hub/dev/hub-dev-diff-panel";
import type { CapabilityAction } from "@/lib/hub/capability/types";
import { buildCapabilityManifestSnippet } from "@/lib/hub/dev/capability-inspector";
import {
  applyCapabilitySnippetPatch,
  previewCapabilityPatch,
} from "@/lib/hub/dev/capability-patch";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

type HubDevCapabilityManifestEditorProps = {
  action: CapabilityAction;
  draft: PlatformDraft;
  onApply: (next: PlatformDraft) => void;
};

export function HubDevCapabilityManifestEditor({
  action,
  draft,
  onApply,
}: HubDevCapabilityManifestEditorProps) {
  const baseline = useMemo(
    () => buildCapabilityManifestSnippet(action, draft),
    [action, draft],
  );

  const [edited, setEdited] = useState(baseline);
  const [showDiff, setShowDiff] = useState(false);
  const [permissionApproved, setPermissionApproved] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const preview = useMemo(
    () => previewCapabilityPatch(baseline, edited, draft),
    [baseline, edited, draft],
  );

  const dirty = edited !== baseline;

  const handleReview = useCallback(() => {
    setShowDiff(true);
    setApplyError(null);
  }, []);

  const handleApply = useCallback(() => {
    if (!preview.valid || !preview.snippet) {
      setApplyError(preview.error ?? "Invalid patch");
      return;
    }
    if (preview.expandsPermissions && !permissionApproved) {
      setApplyError("New permissions require explicit approval.");
      return;
    }

    const result = applyCapabilitySnippetPatch(draft, action.id, preview.snippet, {
      allowPermissionExpand: permissionApproved,
    });

    if (result.error) {
      setApplyError(result.error);
      return;
    }

    onApply(result.draft);
    setShowDiff(false);
    setPermissionApproved(false);
    setApplyError(null);
  }, [action.id, draft, onApply, permissionApproved, preview]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <p className="text-[12px] text-[#64748b]">
        Capability manifest 스니펫을 편집한 뒤 <strong>Review Changes</strong> →{" "}
        <strong>Apply</strong>로 Platform draft에 반영합니다.
      </p>

      <HubCodeEditor value={edited} onChange={setEdited} rows={18} />

      {dirty ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleReview}
            className="rounded-lg border border-[#6366F1]/40 bg-[#6366F1]/10 px-4 py-2 text-[12px] font-semibold text-[#6366F1]"
          >
            Review Changes
          </button>
          <button
            type="button"
            onClick={() => {
              setEdited(baseline);
              setShowDiff(false);
            }}
            className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-[12px] text-[#64748B]"
          >
            Reset
          </button>
        </div>
      ) : null}

      {showDiff && preview.valid ? (
        <div className="space-y-3">
          <HubDevDiffPanel diff={preview.diff} />
          {preview.expandsPermissions ? (
            <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
              <input
                type="checkbox"
                checked={permissionApproved}
                onChange={(e) => setPermissionApproved(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Permission 확대 승인:{" "}
                <span className="font-mono">{preview.newPermissionIds.join(", ")}</span>
              </span>
            </label>
          ) : null}
          <button
            type="button"
            onClick={handleApply}
            className={cn(
              "rounded-lg px-4 py-2 text-[12px] font-bold text-white",
              preview.expandsPermissions && !permissionApproved
                ? "cursor-not-allowed bg-[#94a3b8]"
                : "bg-[#6366F1] hover:bg-[#4F46E5]",
            )}
            disabled={preview.expandsPermissions && !permissionApproved}
          >
            Apply to Platform
          </button>
        </div>
      ) : null}

      {applyError ? (
        <p className="text-[12px] text-red-600">{applyError}</p>
      ) : null}

      {!preview.valid && showDiff ? (
        <p className="text-[12px] text-red-600">{preview.error}</p>
      ) : null}
    </div>
  );
}
