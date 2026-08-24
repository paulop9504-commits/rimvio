/** Official installer. Override with `RIMVIO_PC_SETUP_URL` (test) or keep this as prod latest. */
export const RIMVIO_PC_SETUP_FILENAME = "Rimvio-Setup.exe";

export const RIMVIO_PC_SETUP_LATEST_URL =
  "https://github.com/paulop9504-commits/rimvio/releases/latest/download/Rimvio-Setup.exe";

export function resolvePcSetupDownloadUrl(): string {
  return (
    process.env.RIMVIO_PC_SETUP_URL?.trim() ||
    process.env.NEXT_PUBLIC_RIMVIO_PC_SETUP_URL?.trim() ||
    RIMVIO_PC_SETUP_LATEST_URL
  );
}
