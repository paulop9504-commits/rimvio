"use client";

import { useState } from "react";
import type { Harness } from "@/lib/rimvio-protocol/harness/schema";
import { validateHarness } from "@/lib/harness/validate";
import type { UserHarnessLibraryStatus, UserHarnessVisibility } from "@/lib/harness/personal-registry";

type Props = {
  harness: Harness;
  status?: UserHarnessLibraryStatus;
  visibility?: UserHarnessVisibility;
  label?: string;
  onSaved?: (message: string) => void;
  onError?: (message: string) => void;
  className?: string;
};

export function SaveHarnessToAccountButton({
  harness,
  status = "draft",
  visibility = "private",
  label = "내 계정에 저장",
  onSaved,
  onError,
  className,
}: Props) {
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const checked = validateHarness(harness);
    if (!checked.ok) {
      const msg = checked.issues.map((i) => i.message).join(" · ");
      onError?.(msg);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/hub/harness/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          harness: checked.harness,
          enabled: true,
          status,
          visibility,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        authRequired?: boolean;
      };
      if (res.status === 401 || json.authRequired) {
        onError?.("로그인이 필요합니다. 개인 계정으로 저장·격리됩니다.");
        return;
      }
      if (!json.ok) {
        onError?.(json.error ?? "저장 실패");
        return;
      }
      onSaved?.("개인 계정에 격리 저장했습니다. 라이브러리에서 on/off 할 수 있습니다.");
    } catch {
      onError?.("저장 요청이 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void save()}
      className={
        className ??
        "rounded-full border border-[#6366F1] bg-[#EEF2FF] px-3 py-1.5 text-[11px] font-semibold text-[#3730A3] disabled:opacity-50"
      }
    >
      {busy ? "저장 중…" : label}
    </button>
  );
}
