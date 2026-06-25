/** People tab — Kakao-style chat list density */
export const PEERS_CHAT_LIST = {
  shell: "flex min-h-0 flex-1 flex-col bg-white",
  topBar:
    "shrink-0 border-b border-[#e5e8eb] bg-white pt-[max(0.35rem,env(safe-area-inset-top))]",
  topBarRow: "flex items-center gap-2 px-4 py-1.5",
  profileBtn:
    "flex min-w-0 flex-1 items-center gap-2.5 rounded-xl py-1 text-left active:bg-[#f2f4f6]",
  profileName: "truncate text-[20px] font-bold leading-tight text-[#191f28]",
  searchBar:
    "h-9 w-full rounded-lg bg-[#f2f4f6] px-3 text-[14px] text-[#191f28] outline-none placeholder:text-[#8b95a1]",
  row: "flex min-h-[68px] items-center gap-3 px-4 py-2.5 active:bg-[#f2f4f6]",
  rowSlot: "px-2.5 py-0.5",
  rowUnread:
    "rounded-2xl bg-[#f8faff] shadow-sm ring-2 ring-[#3182f6]/14 active:bg-[#eef4ff]",
  name: "truncate text-[16px] font-semibold leading-tight text-[#191f28]",
  nameUnread: "font-bold",
  preview: "truncate text-[13px] leading-snug text-[#6b7684]",
  previewUnread:
    "truncate text-[13px] font-semibold leading-snug text-[#191f28]",
  contextPreview: "truncate text-[13px] leading-snug text-[#3182f6]",
  contextPreviewUnread:
    "truncate text-[13px] font-semibold leading-snug text-[#1b64da]",
  time: "shrink-0 text-[11px] tabular-nums text-[#8b95a1]",
  timeUnread: "font-medium text-[#3182f6]",
  unreadDot: "size-2 shrink-0 rounded-full bg-[#3182f6]",
  unreadBadge:
    "flex min-w-[20px] items-center justify-center rounded-full bg-[#3182f6] px-1.5 py-0.5 text-[11px] font-bold leading-none text-white",
  /** @deprecated Use unreadDot (1) or unreadBadge (2+). */
  unread:
    "flex min-w-[20px] items-center justify-center rounded-full bg-[#3182f6] px-1.5 py-0.5 text-[11px] font-bold leading-none text-white",
  iconBtn:
    "flex size-10 shrink-0 items-center justify-center rounded-full text-[#191f28] active:bg-[#f2f4f6]",
  profileStrip:
    "flex w-full items-center gap-3 border-b border-[#e5e8eb] bg-white px-4 py-3 text-left active:bg-[#f2f4f6]",
} as const;
