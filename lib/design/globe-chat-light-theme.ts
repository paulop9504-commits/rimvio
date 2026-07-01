/** Globe fullscreen chat — light surface tokens (Apple-style readability). */
export const globeChatLight = {
  screen: "bg-[#f5f6f8]",
  headerBorder: "border-black/[0.06]",
  title: "text-[#191f28]",
  subtitle: "text-[#8b95a1]",
  closeBtn:
    "bg-white text-[#4e5968] shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06] hover:bg-[#fafbfc]",
  composerBar: "border-t border-black/[0.06] bg-[#f5f6f8]/92 backdrop-blur-md",
  aiBubble:
    "rounded-[1.125rem] rounded-bl-[0.35rem] bg-white px-3.5 py-2.5 text-[13px] leading-[1.55] text-[#191f28] shadow-[0_1px_4px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.05]",
  userBubble:
    "rounded-[1.125rem] rounded-br-[0.35rem] bg-[#191f28] px-3.5 py-2.5 text-[13px] leading-[1.55] text-white shadow-[0_2px_10px_rgba(0,0,0,0.14)]",
  cardSurface:
    "rounded-[1rem] bg-white px-3 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.07)] ring-1 ring-black/[0.05]",
} as const;
