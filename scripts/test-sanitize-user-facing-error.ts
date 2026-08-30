import {
  classifyUserFacingError,
  resolveComposerErrorKo,
} from "@/lib/errors/sanitize-user-facing-error";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  classifyUserFacingError(new Error("The quota has been exceeded.")) === "quota",
  "quota message",
);
assert(
  resolveComposerErrorKo("The quota has been exceeded.").includes("한도"),
  "quota ko",
);
assert(
  resolveComposerErrorKo("some random english failure").includes("붙이지"),
  "unknown english falls back",
);

console.log("test-sanitize-user-facing-error: ok");
