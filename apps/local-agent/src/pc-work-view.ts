export type PcWorkFinding = {
  kind: "web" | "note" | "key";
  title: string;
  detail?: string;
};

export type PcWorkView = {
  running: boolean;
  title: string;
  userLine: string;
  planLine: string;
  toolTitle: string;
  findings: PcWorkFinding[];
  previewTitle: string;
  url: string;
  phase: string;
  screenshotJpeg: string | null;
  recents: string[];
};

const recents: string[] = [];
let current: PcWorkView = idleWorkView();

function assignDefined(patch: Partial<PcWorkView>): void {
  (Object.keys(patch) as (keyof PcWorkView)[]).forEach((key) => {
    const value = patch[key];
    if (value !== undefined) {
      (current as PcWorkView)[key] = value as never;
    }
  });
}

export function idleWorkView(): PcWorkView {
  return {
    running: false,
    title: "Rimvio PC",
    userLine: "",
    planLine: "",
    toolTitle: "",
    findings: [],
    previewTitle: "",
    url: "",
    phase: "",
    screenshotJpeg: null,
    recents: [...recents],
  };
}

function rememberTitle(title: string): void {
  const next = title.trim();
  if (!next || next === "Rimvio PC") {
    return;
  }
  const rest = recents.filter((item) => item !== next);
  recents.length = 0;
  recents.push(next, ...rest);
  if (recents.length > 8) {
    recents.length = 8;
  }
}

export function publishPcWork(patch: Partial<PcWorkView> & { title?: string }): PcWorkView {
  assignDefined(patch);
  const title = (current.title || "Rimvio PC").trim();
  current.title = title;
  rememberTitle(title);
  current.recents = [...recents];
  return readPcWork();
}

export function readPcWork(): PcWorkView {
  return { ...current, recents: [...recents], findings: [...current.findings] };
}

export function clearPcWork(): PcWorkView {
  current = idleWorkView();
  current.screenshotJpeg = null;
  return readPcWork();
}
