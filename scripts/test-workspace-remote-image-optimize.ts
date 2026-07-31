#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { canOptimizeWorkspaceRemoteImage } from "../lib/context-workspace/can-optimize-workspace-remote-image";

assert.equal(
  canOptimizeWorkspaceRemoteImage(
    "https://lh3.googleusercontent.com/places/abc",
  ),
  true,
);
assert.equal(
  canOptimizeWorkspaceRemoteImage("https://images.unsplash.com/photo-1"),
  true,
);
assert.equal(
  canOptimizeWorkspaceRemoteImage("https://evil.example/photo.jpg"),
  false,
);
assert.equal(canOptimizeWorkspaceRemoteImage("not-a-url"), false);

console.log("test-workspace-remote-image-optimize: ok");
