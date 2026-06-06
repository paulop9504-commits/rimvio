const EXIF_DATE_RE = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

function parseExifDateTime(value: string): string | null {
  const match = EXIF_DATE_RE.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  const ms = Date.parse(
    `${year}-${month}-${day}T${hour}:${minute}:${second}`,
  );
  if (Number.isNaN(ms)) {
    return null;
  }
  return new Date(ms).toISOString();
}

function readAsciiFrom(bytes: Uint8Array, offset: number, length: number): string {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    const code = bytes[offset + index];
    if (code === 0) {
      break;
    }
    value += String.fromCharCode(code);
  }
  return value;
}

/** Lightweight JPEG EXIF DateTimeOriginal reader — no dependency, best-effort. */
export async function readJpegExifDateTimeIso(file: File): Promise<string | null> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return null;
  }

  try {
    const head = file.slice(0, Math.min(file.size, 256 * 1024));
    const buffer = await head.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      return null;
    }

    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = bytes[offset + 1];
      if (marker === 0xe1) {
        const segmentLength = (bytes[offset + 2]! << 8) + bytes[offset + 3]!;
        const segmentStart = offset + 4;
        const exifHeader = readAsciiFrom(bytes, segmentStart, 6);
        if (exifHeader === "Exif\0\0") {
          const ascii = new TextDecoder("latin1").decode(
            bytes.slice(segmentStart, segmentStart + segmentLength - 2),
          );
          const original =
            ascii.match(/DateTimeOriginal\x00([0-9: ]{19})/)?.[1] ??
            ascii.match(/DateTime\x00([0-9: ]{19})/)?.[1] ??
            null;
          if (original) {
            return parseExifDateTime(original);
          }
        }
      }

      if (marker === 0xda) {
        break;
      }

      const segmentLength = (bytes[offset + 2]! << 8) + bytes[offset + 3]!;
      if (segmentLength < 2) {
        break;
      }
      offset += 2 + segmentLength;
    }
  } catch {
    return null;
  }

  return null;
}
