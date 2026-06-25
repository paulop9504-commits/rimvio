/** 1:1 DM — 인스타 밀도 */
export const DM_CHAT = {
  bubblePx: "px-3",
  bubblePy: "py-2",
  bubbleText: "text-[15px] leading-[1.35]",
  bubbleRadius: "rounded-[18px]",
  bubbleMeCorner: "rounded-br-[4px]",
  bubblePeerCorner: "rounded-bl-[4px]",
  bubblePeer: "bg-[#EFEFEF] text-[#262626]",
  bubbleMe: "bg-primary text-white",
  listGap: "gap-[3px]",
  listPad: "px-3 py-2",
  timeText: "text-[9.5px]",
  rowGap: "gap-1",
  composerMinH: "min-h-[36px]",
  composerText: "text-[15px] leading-[1.35]",
  composerPad: "py-1.5 px-3",
  sendSize: "size-9",
  surface: "bg-[#FAFAFA]",
} as const;

/** 1:1 DM — 카톡식 다크 컴포저 (단일 pill) */
export const DM_KAKAO_COMPOSER = {
  bar: "flex min-h-[44px] items-end gap-0.5 rounded-[22px] bg-[#2A2A2A] px-1 py-1",
  plusBtn:
    "flex size-9 shrink-0 items-center justify-center rounded-full text-white/95 transition-opacity active:opacity-70 disabled:opacity-30",
  input:
    "max-h-24 min-h-[36px] flex-1 resize-none overflow-y-auto bg-transparent py-2 pl-1 pr-0.5 text-[15px] leading-[1.35] text-white outline-none placeholder:text-[#8E8E8E]",
  iconBtn:
    "flex size-9 shrink-0 items-center justify-center rounded-full text-[#B8B8B8] transition-opacity active:opacity-70 disabled:opacity-30",
  iconBtnFilled:
    "flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1C1C1C] text-white/90 transition-opacity active:opacity-70 disabled:opacity-30",
  sendBtn:
    "flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FEE500] text-[#191919] transition-transform active:scale-95 disabled:opacity-30",
} as const;
