"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { GlangoLogo } from "@/components/glango-logo";
import { ContainerCleanupPanel } from "@/components/container-cleanup-panel";
import { ActionBuilderPanel } from "@/components/action-builder-panel";
import { FeedSyncPanel } from "@/components/feed-sync-panel";
import { InboxLinkInput } from "@/components/inbox-link-input";
import { SettingsProfilePanel } from "@/components/settings-profile-panel";
import { SettingsAvatarOddsPanel } from "@/components/settings-avatar-odds-panel";
import { SettingsTastePanel } from "@/components/settings-taste-panel";
import { SettingsScheduleMediumPanel } from "@/components/settings-schedule-medium-panel";
import { SettingsTrustLevelPanel } from "@/components/settings-trust-level-panel";
import { GlangoAvatarDrawPanel } from "@/components/glango-avatar-draw-panel";
import { WelcomeAvatarBootstrap } from "@/components/welcome-avatar-bootstrap";
import { useCopy } from "@/hooks/use-copy";
import { GLANGO } from "@/lib/brand/glango";
import { IOS } from "@/lib/ui/ios-surface";
import { isAndroid, isIOS, isStandalonePwa } from "@/lib/platform/device";
import { cn } from "@/lib/utils";

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          "bg-[#007AFF] text-xs font-bold text-white"
        )}
      >
        {n}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-semibold">{title}</p>
        <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {children}
        </div>
      </div>
    </li>
  );
}

function IosSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("p-4", IOS.cardSm)}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function WelcomeGuide() {
  const copy = useCopy();
  const searchParams = useSearchParams();
  const showPaste = searchParams.get("paste") === "1";
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (isIOS()) {
      setPlatform("ios");
    } else if (isAndroid()) {
      setPlatform("android");
    } else {
      setPlatform("other");
    }

    setStandalone(isStandalonePwa());

    if (searchParams.get("draw") === "1") {
      window.requestAnimationFrame(() => {
        document.getElementById("glango-draw")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col gap-[var(--space-phi)] pb-[var(--space-phi2)]">
      <WelcomeAvatarBootstrap />
      <section className={cn("px-[var(--space-phi)] py-[var(--space-phi2)]", IOS.card)}>
        <GlangoLogo size="lg" framed className="mb-3" showWordmark showKo />
        <h2 className="text-lg font-semibold tracking-tight">
          {copy.welcome.headline}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {copy.welcome.body}
          <strong className="font-medium text-foreground">
            {copy.welcome.bodyStrong}
          </strong>
          {copy.welcome.bodyEnd}
        </p>
        {standalone ? (
          <p className="mt-3 text-xs font-medium text-[#007AFF]">
            ✓ {copy.welcome.pwaOk}
          </p>
        ) : null}
      </section>

      {showPaste ? (
        <section className={cn("p-4", IOS.cardSm)}>
          <h2 className="text-sm font-semibold">{copy.inbox.paste}</h2>
          <div className="mt-3">
            <InboxLinkInput />
          </div>
        </section>
      ) : null}

      {platform === "android" ? (
        <IosSection title={copy.welcome.androidSection}>
          <ol className="mt-3 space-y-4">
            <Step n={1} title={copy.welcome.androidStep1Title}>
              {copy.welcome.androidStep1Body}
            </Step>
            <Step n={2} title={copy.welcome.androidStep2Title}>
              {copy.welcome.androidStep2Body(GLANGO.name)}
            </Step>
            <Step n={3} title={copy.welcome.androidStep3Title}>
              {copy.welcome.androidStep3Body}
            </Step>
          </ol>
        </IosSection>
      ) : null}

      {platform === "ios" ? (
        <IosSection title={copy.welcome.iosSection}>
          <ol className="mt-3 space-y-4">
            <Step n={1} title={copy.welcome.iosStep1Title}>
              {copy.welcome.iosStep1Body}
            </Step>
            <Step n={2} title={copy.welcome.iosStep2Title}>
              {copy.welcome.iosStep2Body}
            </Step>
            <Step n={3} title={copy.inbox.title}>
              <Link href="/welcome?paste=1" className="font-medium text-[#007AFF]">
                {copy.inbox.paste}
              </Link>
              {copy.welcome.iosStep3Body}
            </Step>
          </ol>
        </IosSection>
      ) : null}

      {platform === "other" ? (
        <IosSection title={copy.welcome.desktopSection}>
          <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
            <Link href="/welcome?paste=1" className="text-[#007AFF]">
              {copy.inbox.paste}
            </Link>
            {copy.welcome.desktopEnd}
          </div>
        </IosSection>
      ) : null}

      <GlangoAvatarDrawPanel />

      <SettingsProfilePanel />

      <SettingsAvatarOddsPanel />

      <SettingsTastePanel />

      <SettingsScheduleMediumPanel />

      <SettingsTrustLevelPanel />

      <ActionBuilderPanel className="mx-4" />

      <ContainerCleanupPanel />

      <div className={cn("p-4", IOS.cardSm)}>
        <AuthPanel nextPath="/welcome" />
      </div>

      <div className={cn("p-4", IOS.cardSm)}>
        <FeedSyncPanel />
      </div>

      <section className={cn("p-4", IOS.cardSm)}>
        <h2 className="text-sm font-semibold">{copy.welcome.privacyTitle}</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {copy.welcome.privacyBody} {copy.welcome.privacyLoginNote}
        </p>
        <Link
          href="/privacy"
          className="mt-3 inline-block text-xs font-medium text-[#007AFF]"
        >
          {copy.welcome.privacyLink} →
        </Link>
      </section>

      <div className="flex gap-2">
        <Link href="/" className={cn("flex-1 text-center", IOS.primaryBtn)}>
          {copy.welcome.openFeed}
        </Link>
        <Link
          href="/welcome?paste=1"
          className={cn(
            "flex-1 py-3 text-center text-[15px] font-semibold",
            IOS.secondaryBtn
          )}
        >
          {copy.welcome.addLink}
        </Link>
      </div>
    </div>
  );
}
