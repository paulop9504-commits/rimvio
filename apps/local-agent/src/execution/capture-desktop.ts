import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CAPTURE_PS = `
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$src = New-Object System.Drawing.Bitmap $b.Width, $b.Height
$g = [System.Drawing.Graphics]::FromImage($src)
$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
$g.Dispose()
$w = 720
$h = [Math]::Max(1, [int]($src.Height * (720.0 / [Math]::Max(1, $src.Width))))
$dst = New-Object System.Drawing.Bitmap $w, $h
$g2 = [System.Drawing.Graphics]::FromImage($dst)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::Bilinear
$g2.DrawImage($src, 0, 0, $w, $h)
$g2.Dispose()
$src.Dispose()
$ms = New-Object System.IO.MemoryStream
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [long]36)
$dst.Save($ms, $enc, $ep)
$dst.Dispose()
[Convert]::ToBase64String($ms.ToArray())
`.trim();

export const PC_SCREENSHOT_B64_MAX = 220_000;

/** Primary display JPEG for live phone preview. Empty if capture is unavailable. */
export async function captureDesktopJpegBase64(): Promise<string | undefined> {
  if (process.platform !== "win32") {
    return undefined;
  }
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-STA", "-Command", CAPTURE_PS],
      { timeout: 12_000, windowsHide: true, maxBuffer: 1_500_000 },
    );
    const b64 = stdout.replace(/\s+/g, "");
    if (b64.length < 80) {
      return undefined;
    }
    return b64.slice(0, PC_SCREENSHOT_B64_MAX);
  } catch {
    return undefined;
  }
}
