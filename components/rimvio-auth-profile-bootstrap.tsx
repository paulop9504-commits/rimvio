"use client";

import { useEffect, useRef } from "react";
import { useInboundGlobePinMirror } from "@/hooks/use-inbound-globe-pin-mirror";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchMyAccountProfile,
  syncMyProfileFromAuth,
} from "@/lib/peer-chat/peer-chat-client";
import {
  primeMyProfileAvatarCache,
  warmMyProfileAvatarCacheFromProfile,
} from "@/lib/peer-chat/peer-profile-avatar-cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** 로그인 직후 프로필·아바타 바이트까지 캐시 (Peers 방문 전). */
export function RimvioAuthProfileBootstrap() {
  const { user, configured } = useAuth();
  useInboundGlobePinMirror();
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!configured || !user?.id || !isSupabaseConfigured()) {
      return;
    }
    if (syncedFor.current === user.id) {
      return;
    }
    syncedFor.current = user.id;

    void syncMyProfileFromAuth()
      .catch(() => {})
      .then(() => fetchMyAccountProfile())
      .then((profile) => warmMyProfileAvatarCacheFromProfile(profile))
      .catch(() => {});
  }, [configured, user?.id]);

  return null;
}
