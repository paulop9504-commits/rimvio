"use client";

type HubAskRimvioBarProps = {
  readonly placeholder: string;
  readonly onAsk: (text: string) => void;
};

export function HubAskRimvioBar(props: HubAskRimvioBarProps) {
  return (
    <form
      className="mt-3 flex gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const input = form.elements.namedItem("ask") as HTMLInputElement;
        const text = input.value.trim();
        if (!text) return;
        props.onAsk(text);
        input.value = "";
      }}
    >
      <input
        name="ask"
        placeholder={props.placeholder}
        className="min-w-0 flex-1 rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-[11px] text-[#111827] placeholder:text-[#9ca3af] focus:border-violet-400 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-violet-700"
      >
        Ask Rimvio
      </button>
    </form>
  );
}
