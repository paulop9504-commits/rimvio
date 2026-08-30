/**
 * Browser-safe verify types — no Node child_process / fs.
 */

export type VerifyKind = "unit" | "integration" | "e2e" | "lint" | "typecheck" | "build";

export type VerifyCommandResult = {
  readonly kind: VerifyKind;
  readonly ok: boolean;
  readonly command: string;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly skipped?: boolean;
  readonly skipReason?: string;
};

export function parseVerifyFailures(result: VerifyCommandResult): readonly string[] {
  const blob = `${result.stdout}\n${result.stderr}`;
  return blob
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /error TS|error |FAIL |AssertionError|✖|×/.test(l))
    .slice(0, 20);
}
