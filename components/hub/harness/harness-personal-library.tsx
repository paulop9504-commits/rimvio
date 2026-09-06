"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useAuth } from "@/hooks/use-auth";
import type { UserHarnessRecord } from "@/lib/harness/personal-registry";
import { cn } from "@/lib/utils";

type LibraryResponse = {
  ok: boolean;
  items?: UserHarnessRecord[];
  error?: string;
  authRequired?: boolean;
};

async function fetchLibrary(): Promise<LibraryResponse> {
  const res = await fetch("/api/hub/harness/library", { method: "GET" });
  return (await res.json()) as LibraryResponse;
}

export function HarnessPersonalLibrary() {
  const { signInWithGoogle, configured } = useAuth();
  const [items, setItems] = useState<UserHarnessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const json = await fetchLibrary();
      if (json.authRequired || (!json.ok && json.error === "login_required")) {
        setAuthRequired(true);
        setItems([]);
        setBanner("로그인하면 개인 계정에 격리 저장된 Harness를 관리할 수 있습니다.");
        return;
      }
      if (!json.ok) {
        setBanner(json.error ?? "목록을 불러오지 못했습니다.");
        setItems([]);
        return;
      }
      setAuthRequired(false);
      setItems(json.items ?? []);
      setBanner(null);
    } catch {
      setBanner("네트워크 오류로 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const patchItem = async (harnessId: string, body: Record<string, unknown>) => {
    setBusyId(harnessId);
    try {
      const res = await fetch(`/api/hub/harness/library/${encodeURIComponent(harnessId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok: boolean; item?: UserHarnessRecord; error?: string };
      if (!json.ok || !json.item) {
        setBanner(json.error ?? "업데이트 실패");
        return;
      }
      setItems((prev) => prev.map((row) => (row.harnessId === harnessId ? json.item! : row)));
      setBanner(null);
    } catch {
      setBanner("업데이트 요청이 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const removeItem = async (harnessId: string) => {
    if (!window.confirm("이 Harness를 계정에서 삭제할까요? (로컬 draft는 남습니다)")) {
      return;
    }
    setBusyId(harnessId);
    try {
      const res = await fetch(`/api/hub/harness/library/${encodeURIComponent(harnessId)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setBanner(json.error ?? "삭제 실패");
        return;
      }
      setItems((prev) => prev.filter((row) => row.harnessId !== harnessId));
    } catch {
      setBanner("삭제 요청이 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const openInBuilder = (record: UserHarnessRecord) => {
    try {
      window.localStorage.setItem(
        "rimvio.hub.harness.builder.v1",
        JSON.stringify({ harness: record.harness, step: 3 }),
      );
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-3">
      {banner ? (
        <div className="rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] px-3 py-2 text-[12px] text-[#3730A3]">
          {banner}
          {authRequired && configured ? (
            <div className="mt-2">
              <GoogleSignInButton
                onClick={() => void signInWithGoogle("/hub/harness/library")}
                label="Google로 로그인"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="text-[13px] text-[#64748B]">계정 라이브러리 불러오는 중…</p>
      ) : items.length === 0 && !authRequired ? (
        <p className="text-[13px] text-[#64748B]">
          아직 계정에 저장된 Harness가 없습니다. Builder/Labeller에서 「내 계정에 저장」을 누르세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const busy = busyId === item.harnessId;
            return (
              <li
                key={item.id}
                className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[14px] font-semibold text-[#0F172A]">
                        {item.harness.name}
                      </h3>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          item.enabled
                            ? "bg-[#DCFCE7] text-[#166534]"
                            : "bg-[#F1F5F9] text-[#64748B]",
                        )}
                      >
                        {item.enabled ? "ON" : "OFF"}
                      </span>
                      <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-semibold text-[#475569]">
                        {item.status} · {item.visibility}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12px] text-[#64748B]">
                      {item.harness.description || item.harnessId}
                    </p>
                    <p className="mt-1 text-[10px] text-[#94A3B8]">
                      {item.harness.runtime.type} · v{item.harness.version} ·{" "}
                      {new Date(item.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void patchItem(item.harnessId, { enabled: !item.enabled })}
                      className="rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                    >
                      {item.enabled ? "끄기" : "켜기"}
                    </button>
                    <button
                      type="button"
                      disabled={busy || item.status === "published"}
                      onClick={() =>
                        void patchItem(item.harnessId, {
                          status: "published",
                          visibility: item.visibility,
                        })
                      }
                      className="rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                    >
                      게시
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void patchItem(item.harnessId, {
                          visibility: item.visibility === "private" ? "public" : "private",
                        })
                      }
                      className="rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                    >
                      {item.visibility === "private" ? "공개로" : "비공개로"}
                    </button>
                    <Link
                      href="/hub/harness/builder"
                      onClick={() => openInBuilder(item)}
                      className="rounded-full bg-[#0F172A] px-3 py-1.5 text-[11px] font-semibold text-white"
                    >
                      Builder
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeItem(item.harnessId)}
                      className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-[#EF4444] disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => void reload()}
        className="text-[11px] font-semibold text-[#6366F1]"
      >
        새로고침
      </button>
    </div>
  );
}
