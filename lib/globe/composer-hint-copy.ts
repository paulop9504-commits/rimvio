import { copy } from "@/lib/copy/human-ko";

/** Keep composer hints short — no abstract product words. */
export function softenComposerSuccessLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) {
    return copy.globe.composerHint.saved;
  }
  if (
    trimmed.length > 24 ||
    /맥락|맞춤|흔적|맥락|프로젝션|파이프라인|레이어/.test(trimmed)
  ) {
    return copy.globe.composerHint.saved;
  }
  return trimmed;
}

export function softenComposerStatusLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed
    .replace(/맥락을 만들게요/g, "기록할게요")
    .replace(/맥락/g, "기록")
    .replace(/맞춤/g, "찾기")
    .replace(/흔적/g, "기록")
    .replace(/밖 지구/g, "밖")
    .replace(/내 지구/g, "여기")
    .replace(/말씀해 주세요/g, "말해 주세요")
    .replace(/말씀해 주시거나/g, "말하거나");
}
