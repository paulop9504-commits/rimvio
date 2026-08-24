import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type StoredPcCredentials = {
  deviceId: string;
  deviceToken: string;
  deviceName?: string;
};

function credentialPath(): string {
  return join(homedir(), ".rimvio", "pc-agent.json");
}

export function readPcCredentials(): StoredPcCredentials | null {
  const path = credentialPath();
  if (!existsSync(path)) {
    return null;
  }
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<StoredPcCredentials>;
    if (!raw.deviceId?.trim() || !raw.deviceToken?.trim()) {
      return null;
    }
    return {
      deviceId: raw.deviceId.trim(),
      deviceToken: raw.deviceToken.trim(),
      deviceName: raw.deviceName?.trim(),
    };
  } catch {
    return null;
  }
}

export function writePcCredentials(creds: StoredPcCredentials): void {
  const path = credentialPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(creds, null, 2)}\n`, "utf8");
}
