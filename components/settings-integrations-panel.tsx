"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import { useIntegrations } from "@/hooks/use-integrations";
import {
  INTEGRATION_CATALOG,
  catalogEntryFor,
  type IntegrationProviderId,
} from "@/lib/integrations";
import type { IntegrationSecretPayload } from "@/lib/integrations/types";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";
import { Check, ExternalLink, KeyRound, Link2, Unplug } from "lucide-react";

function OAuthRow({
  provider,
  connected,
  oauthReady,
  onConnect,
  onDisconnect,
  copy,
}: {
  provider: IntegrationProviderId;
  connected: boolean;
  oauthReady: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  copy: ReturnType<typeof useCopy>;
}) {
  const entry = catalogEntryFor(provider);
  if (!entry) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-glango-surface-muted px-3.5 py-3 ring-1 ring-glango-neon-purple/12">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {entry.emoji} {entry.label}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{entry.hint}</p>
        </div>
        {connected ? (
          <span className="shrink-0 rounded-full bg-[#34C759]/12 px-2 py-0.5 text-[10px] font-semibold text-[#248A3D]">
            {copy.settings.integrationsConnected}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {connected ? (
          <button
            type="button"
            onClick={onDisconnect}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold",
              IOS.secondaryBtn,
            )}
          >
            <Unplug className="size-3.5" />
            {copy.settings.integrationsDisconnect}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onConnect}
              disabled={!oauthReady}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold",
                oauthReady ? IOS.primaryBtn : "cursor-not-allowed bg-[#E5E5EA] text-[#8E8E93]",
              )}
            >
              <Link2 className="size-3.5" />
              {copy.settings.integrationsOAuthConnect}
            </button>
            {!oauthReady ? (
              <span className="self-center text-[10px] text-muted-foreground">
                {copy.settings.integrationsOAuthFallback}
              </span>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function ApiKeyRow({
  provider,
  connected,
  maskedSecret,
  onSave,
  onDisconnect,
  copy,
}: {
  provider: IntegrationProviderId;
  connected: boolean;
  maskedSecret: string | null;
  onSave: (secret: IntegrationSecretPayload) => Promise<void>;
  onDisconnect: () => Promise<void>;
  copy: ReturnType<typeof useCopy>;
}) {
  const entry = catalogEntryFor(provider);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  if (!entry) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const secret: IntegrationSecretPayload = {};
      if (entry.apiKeyFields?.length) {
        for (const field of entry.apiKeyFields) {
          const value = values[field.key]?.trim();
          if (!value) {
            toast.error(copy.settings.integrationsKeyMissing);
            return;
          }
          secret[field.key] = value;
        }
      } else {
        const apiKey = values.api_key?.trim();
        if (!apiKey) {
          toast.error(copy.settings.integrationsKeyMissing);
          return;
        }
        secret.api_key = apiKey;
      }

      await onSave(secret);
      setOpen(false);
      setValues({});
      toast.success(copy.settings.integrationsSaved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.settings.integrationsSaveFail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-glango-surface-muted px-3.5 py-3 ring-1 ring-glango-neon-purple/12">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {entry.emoji} {entry.label}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{entry.hint}</p>
          {connected && maskedSecret ? (
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{maskedSecret}</p>
          ) : null}
        </div>
        {connected ? (
          <Check className="size-4 shrink-0 text-[#34C759]" aria-hidden />
        ) : (
          <KeyRound className="size-4 shrink-0 text-[#8E8E93]" aria-hidden />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold",
            IOS.secondaryBtn,
          )}
        >
          <KeyRound className="size-3.5" />
          {connected
            ? copy.settings.integrationsKeyReplace
            : copy.settings.integrationsKeyConnect}
        </button>
        {connected ? (
          <button
            type="button"
            onClick={() => void onDisconnect()}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-[#C93400]",
              "bg-[#FF9500]/10",
            )}
          >
            <Unplug className="size-3.5" />
            {copy.settings.integrationsDisconnect}
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-3 space-y-2 rounded-xl bg-glango-surface p-3 ring-1 ring-glango-neon-purple/15">
          {entry.apiKeyFields?.length ? (
            entry.apiKeyFields.map((field) => (
              <label key={field.key} className="block">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {field.label}
                </span>
                <input
                  type={field.secret ? "password" : "text"}
                  autoComplete="off"
                  placeholder={field.placeholder}
                  value={values[field.key] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-[#FAFAFA] px-3 py-2 text-[12px] outline-none focus:border-[#007AFF]"
                />
              </label>
            ))
          ) : (
            <label className="block">
              <span className="text-[10px] font-medium text-muted-foreground">API Key</span>
              <input
                type="password"
                autoComplete="off"
                placeholder={entry.apiKeyPlaceholder}
                value={values.api_key ?? ""}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, api_key: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-[#FAFAFA] px-3 py-2 text-[12px] outline-none focus:border-[#007AFF]"
              />
            </label>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className={cn("w-full py-2 text-[12px] font-semibold", IOS.primaryBtn)}
          >
            {saving ? copy.settings.integrationsSaving : copy.settings.integrationsKeySave}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function SettingsIntegrationsPanel({ className }: { className?: string }) {
  const copy = useCopy();
  const searchParams = useSearchParams();
  const {
    integrations,
    oauthConfigured,
    persisted,
    loading,
    user,
    saveApiKey,
    disconnect,
    startOAuth,
    isConnected,
    sync,
  } = useIntegrations();

  const oauthProviders = useMemo(
    () => INTEGRATION_CATALOG.filter((item) => item.authKinds.includes("oauth")),
    [],
  );

  const apiKeyProviders = useMemo(
    () =>
      INTEGRATION_CATALOG.filter(
        (item) =>
          item.authKinds.includes("api_key") &&
          !oauthProviders.some((oauth) => oauth.id === item.id),
      ),
    [oauthProviders],
  );

  const integrationByProvider = useMemo(() => {
    const map = new Map(integrations.map((item) => [item.provider, item]));
    return map;
  }, [integrations]);

  useEffect(() => {
    const status = searchParams.get("integration");
    const provider = searchParams.get("provider");
    if (status === "connected" && provider) {
      toast.success(copy.settings.integrationsOAuthSuccess(provider));
      void sync();
    } else if (status === "login_required") {
      toast.message(copy.settings.integrationsLoginRequired);
    } else if (status === "error") {
      toast.error(copy.settings.integrationsOAuthFail);
    }
  }, [searchParams, copy, sync]);

  const handleOAuthTokenSave = useCallback(
    async (provider: IntegrationProviderId, token: string) => {
      await saveApiKey({
        provider,
        secret: { access_token: token.trim() },
      });
    },
    [saveApiKey],
  );

  return (
    <section className={cn("overflow-hidden p-4", IOS.cardSm, className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{copy.settings.integrationsTitle}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {copy.settings.integrationsHint}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-glango-neon-purple/10 px-2.5 py-1 text-[10px] font-semibold text-glango-neon-cyan">
          {copy.settings.integrationsBadge}
        </span>
      </div>

      {!user ? (
        <p className="mt-3 rounded-xl bg-[#FFF9E6] px-3 py-2.5 text-[11px] leading-relaxed text-[#8A6D00]">
          {copy.settings.integrationsGuestNote}
        </p>
      ) : persisted ? (
        <p className="mt-3 rounded-xl bg-[#F0FFF4] px-3 py-2.5 text-[11px] leading-relaxed text-[#248A3D]">
          {copy.settings.integrationsCloudNote}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-[11px] text-muted-foreground">{copy.settings.integrationsLoading}</p>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {copy.settings.integrationsOAuthSection}
            </p>
            {oauthProviders.map((entry) => (
              <div key={entry.id} className="space-y-2">
                <OAuthRow
                  provider={entry.id}
                  connected={isConnected(entry.id)}
                  oauthReady={oauthConfigured[entry.id as keyof typeof oauthConfigured] ?? false}
                  onConnect={() => startOAuth(entry.id)}
                  onDisconnect={() => void disconnect(entry.id)}
                  copy={copy}
                />
                {!isConnected(entry.id) ? (
                  <ManualTokenInline
                    placeholder={entry.apiKeyPlaceholder ?? "Token"}
                    onSave={(token) => handleOAuthTokenSave(entry.id, token)}
                    copy={copy}
                  />
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {copy.settings.integrationsApiKeySection}
            </p>
            {apiKeyProviders.map((entry) => (
              <ApiKeyRow
                key={entry.id}
                provider={entry.id}
                connected={isConnected(entry.id)}
                maskedSecret={integrationByProvider.get(entry.id)?.maskedSecret ?? null}
                onSave={(secret) => saveApiKey({ provider: entry.id, secret })}
                onDisconnect={() => disconnect(entry.id)}
                copy={copy}
              />
            ))}
          </div>
        </>
      )}

      <p className="mt-4 flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
        <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden />
        {copy.settings.integrationsFootnote}
      </p>
    </section>
  );
}

function ManualTokenInline({
  placeholder,
  onSave,
  copy,
}: {
  placeholder: string;
  onSave: (token: string) => Promise<void>;
  copy: ReturnType<typeof useCopy>;
}) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex gap-2 pl-1">
      <input
        type="password"
        autoComplete="off"
        placeholder={placeholder}
        value={token}
        onChange={(event) => setToken(event.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-border bg-glango-surface px-2.5 py-1.5 text-[11px] outline-none focus:border-[#007AFF]"
      />
      <button
        type="button"
        disabled={saving || !token.trim()}
        onClick={() => {
          setSaving(true);
          void onSave(token)
            .then(() => {
              setToken("");
              toast.success(copy.settings.integrationsSaved);
            })
            .catch((error) =>
              toast.error(error instanceof Error ? error.message : copy.settings.integrationsSaveFail),
            )
            .finally(() => setSaving(false));
        }}
        className={cn(
          "shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold",
          IOS.secondaryBtn,
        )}
      >
        {copy.settings.integrationsTokenSave}
      </button>
    </div>
  );
}
