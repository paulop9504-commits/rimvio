#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

const dock = readFileSync(join(root, "components/globe/globe-capture-dock.tsx"), "utf8");
assert.ok(!dock.includes("GlobeExecutionFeed"), "map dock must not mount inline execution feed");
assert.ok(dock.includes("GlobeContextIngestBar"), "prompt bar stays on map");

const chat = readFileSync(join(root, "components/globe/chat/globe-chat-screen.tsx"), "utf8");
assert.ok(chat.includes("GlobeChatScreen"), "fullscreen chat screen exists");
assert.ok(chat.includes("FlowStatusBar"), "flow status bar in chat");
assert.ok(chat.includes('data-globe-chat-screen'), "chat screen marker");
assert.ok(
  chat.includes("mb-[var(--rimvio-bottom-nav-offset)]"),
  "chat composer sits above floating bottom nav",
);
assert.ok(chat.includes("pointer-events-none"), "chat root lets bottom nav receive taps");
assert.ok(chat.includes('kind === "program_install"'), "install offers render in chat bubbles");
assert.ok(chat.includes("PcProgramInstallList"), "install buttons live in chat");

const home = readFileSync(join(root, "components/globe/globe-home-client.tsx"), "utf8");
assert.ok(home.includes("GlobeChatScreen"), "home mounts chat screen");
assert.ok(home.includes("openGlobeChat"), "prompt focus opens chat");

const dispatch = readFileSync(join(root, "lib/context-run/dispatch-context-run.ts"), "utf8");
assert.ok(dispatch.includes("syncPortalComposeTurnToChat"), "compose turns sync to chat thread");

const nudge = readFileSync(
  join(root, "lib/portal/compose-draft/generate-compose-nudge.ts"),
  "utf8",
);
assert.ok(nudge.includes("generateComposeNudgeMessage"), "slot nudge generator exists");

const factory = readFileSync(join(root, "lib/resource/resource-factory.ts"), "utf8");
assert.ok(factory.includes("createResourceFromConversation"), "resource factory SSOT");

console.log("test-globe-chat-architecture: ok");
