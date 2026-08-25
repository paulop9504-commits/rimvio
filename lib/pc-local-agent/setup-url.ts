/** Bump with `apps/pc-desktop/package.json` when shipping a new installer. */
export const RIMVIO_PC_SETUP_VERSION = "0.1.8";
export const RIMVIO_PC_SETUP_FILENAME = "Rimvio-Setup.exe";
export const RIMVIO_PC_SETUP_DOWNLOAD_FILENAME = `Rimvio-Setup-${RIMVIO_PC_SETUP_VERSION}.exe`;

export const RIMVIO_PC_SETUP_LATEST_URL =
  "https://github.com/paulop9504-commits/rimvio/releases/latest/download/Rimvio-Setup.exe";

export function rimvioPcSetupTaggedUrl(version = RIMVIO_PC_SETUP_VERSION): string {
  return `https://github.com/paulop9504-commits/rimvio/releases/download/rimvio-pc-${version}/Rimvio-Setup.exe`;
}

export function resolvePcSetupDownloadUrl(): string {
  return (
    process.env.RIMVIO_PC_SETUP_URL?.trim() ||
    process.env.NEXT_PUBLIC_RIMVIO_PC_SETUP_URL?.trim() ||
    rimvioPcSetupTaggedUrl()
  );
}
