/** Globe action / example pill — tap sizing SSOT. */
export const globeActionPillStyles = {
  row: "flex gap-1.5",
  rowWrap: "flex flex-wrap gap-1.5",
  rowScroll:
    "flex flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  buttonBase:
    "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[-0.01em] ring-1 transition-[transform,background-color] duration-150 active:scale-[0.97] touch-manipulation select-none",
  bubble: {
    light:
      "min-h-[30px] px-2.5 py-1 text-[12px] font-medium bg-[#e8f5ec] text-[#1a7f37] ring-[#34c759]/22 hover:bg-[#dcf5e4]",
    lightConfirm:
      "min-h-[30px] px-2.5 py-1 text-[12px] font-medium bg-[#f0f2f5] text-[#191f28] ring-black/[0.08] hover:bg-[#e8ebee]",
    dark:
      "min-h-[30px] px-2.5 py-1 text-[12px] font-medium bg-[#34c759]/14 text-[#b8f5c8] ring-[#34c759]/28 hover:bg-[#34c759]/22",
    darkConfirm:
      "min-h-[30px] px-2.5 py-1 text-[12px] font-medium bg-white/10 text-white/92 ring-white/16 hover:bg-white/14",
  },
  action: {
    light:
      "min-h-[34px] px-3.5 py-1.5 text-[13px] bg-[#f0f2f5] text-[#191f28] ring-black/[0.09] hover:bg-[#e8ebee] active:bg-[#e2e5e9]",
    dark:
      "min-h-[32px] px-3 py-1.5 text-[12px] bg-white/16 text-white ring-white/22 hover:bg-white/22 active:bg-white/26 backdrop-blur-sm",
  },
} as const;
