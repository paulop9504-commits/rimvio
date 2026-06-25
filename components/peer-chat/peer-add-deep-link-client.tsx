"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FriendAddContactFlow } from "@/components/peer-chat/friend-add-contact-flow";
import type { FriendAddResult } from "@/components/peer-chat/friend-add-contact-flow";
import { parseFriendAddQrPayload } from "@/lib/peer-chat/friend-add-qr-url";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function PeerAddDeepLinkClient() {
  const copy = useCopy();
  const fa = copy.peers.friendAdd;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, configured } = useAuth();
  const [contact, setContact] = useState("");

  useEffect(() => {
    const uid = searchParams.get("uid")?.trim();
    const rimvio = searchParams.get("rimvio")?.trim() || searchParams.get("id")?.trim();
    const raw = uid || rimvio || "";
    const parsed = parseFriendAddQrPayload(raw);
    if (parsed) {
      setContact(parsed);
    }
  }, [searchParams]);

  const onAdded = useCallback(
    async (result: FriendAddResult) => {
      toast.success(`${result.displayName}를 친구로 추가했어요`);
      router.replace(`/peers/${encodeURIComponent(result.threadId)}`);
    },
    [router],
  );

  if (!configured || !isSupabaseConfigured()) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        {fa.loginRequired}
      </p>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">{fa.loginRequired}</p>
        <button
          type="button"
          onClick={() => router.push("/welcome")}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {fa.loginCta}
        </button>
      </div>
    );
  }

  if (!contact) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        {fa.qrInvalid}
      </p>
    );
  }

  return (
    <div className="px-4 py-6">
      <FriendAddContactFlow
        contact={contact}
        previewHint={fa.previewTap}
        confirmLabel={fa.previewConfirm}
        loginRequiredMessage={fa.loginRequired}
        loginCtaLabel={fa.loginCta}
        onAdded={onAdded}
      />
    </div>
  );
}
