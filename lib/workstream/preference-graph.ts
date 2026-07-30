/**
 * Personal Preference Graph — long-term travel/style memory (ADR-043).
 * Edges accumulate so the next trip asks less.
 * Complements archive learning rollup — does not replace CompilerPreferenceVector.
 */

export const PREFERENCE_EDGE_KINDS = [
  "walk_prefer",
  "quiet_hotel",
  "no_waiting",
  "subway_prefer",
  "budget_sensitive",
  "luxury",
] as const;

export type PreferenceEdgeKind = (typeof PREFERENCE_EDGE_KINDS)[number];

export type PreferenceEdge = {
  readonly id: string;
  readonly kind: PreferenceEdgeKind;
  /** 0–1 strength. */
  readonly weight: number;
  readonly evidenceKo: string;
  readonly updatedAtIso: string;
  readonly hitCount: number;
};

export type PreferenceGraph = {
  readonly version: 1;
  readonly edges: readonly PreferenceEdge[];
  readonly updatedAtIso: string;
};

const STORAGE_KEY = "rimvio.preference-graph.v1";

const EMPTY: PreferenceGraph = {
  version: 1,
  edges: [],
  updatedAtIso: new Date(0).toISOString(),
};

/** Node / SSR fallback so Preference Graph works in tests without window. */
let memoryGraph: PreferenceGraph = EMPTY;

function readGraph(): PreferenceGraph {
  if (typeof window === "undefined") return memoryGraph;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as PreferenceGraph;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.edges)) {
      return EMPTY;
    }
    return parsed;
  } catch {
    return EMPTY;
  }
}

function writeGraph(graph: PreferenceGraph): PreferenceGraph {
  memoryGraph = graph;
  if (typeof window === "undefined") return graph;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
  } catch {
    /* quota */
  }
  return graph;
}

export function readPreferenceGraph(): PreferenceGraph {
  return readGraph();
}

const UTTERANCE_RULES: readonly {
  kind: PreferenceEdgeKind;
  re: RegExp;
  evidenceKo: string;
}[] = [
  {
    kind: "walk_prefer",
    re: /도보|걸어서|걸어|walk/i,
    evidenceKo: "도보 선호",
  },
  {
    kind: "quiet_hotel",
    re: /조용한\s*숙소|조용한\s*호텔|한적|quiet/i,
    evidenceKo: "조용한 숙소 선호",
  },
  {
    kind: "no_waiting",
    re: /웨이팅|줄\s*서|대기\s*싫|no\s*wait/i,
    evidenceKo: "웨이팅 회피",
  },
  {
    kind: "subway_prefer",
    re: /지하철|전철|metro|subway|오사카\s*메트로/i,
    evidenceKo: "지하철 선호",
  },
  {
    kind: "budget_sensitive",
    re: /가성비|저렴|싸게|budget|hostel/i,
    evidenceKo: "가성비 민감",
  },
  {
    kind: "luxury",
    re: /고급|스위트|5성|luxury|premium/i,
    evidenceKo: "고급 선호",
  },
];

function bumpEdge(
  edges: PreferenceEdge[],
  kind: PreferenceEdgeKind,
  evidenceKo: string,
): PreferenceEdge[] {
  const now = new Date().toISOString();
  const idx = edges.findIndex((e) => e.kind === kind);
  if (idx < 0) {
    return [
      ...edges,
      {
        id: `pref:${kind}`,
        kind,
        weight: 0.55,
        evidenceKo,
        updatedAtIso: now,
        hitCount: 1,
      },
    ];
  }
  const prev = edges[idx]!;
  const next: PreferenceEdge = {
    ...prev,
    weight: Math.min(1, Math.round((prev.weight + 0.12) * 1000) / 1000),
    evidenceKo,
    updatedAtIso: now,
    hitCount: prev.hitCount + 1,
  };
  return edges.map((e, i) => (i === idx ? next : e));
}

/** Observe utterance → accumulate Preference Graph edges. */
export function observePreferenceFromUtterance(utterance: string): PreferenceGraph {
  const text = utterance.trim();
  if (!text) return readGraph();
  let edges = [...readGraph().edges];
  let changed = false;
  for (const rule of UTTERANCE_RULES) {
    if (rule.re.test(text)) {
      edges = bumpEdge(edges, rule.kind, rule.evidenceKo);
      changed = true;
    }
  }
  if (!changed) return readGraph();
  return writeGraph({
    version: 1,
    edges,
    updatedAtIso: new Date().toISOString(),
  });
}

export function preferenceWeight(
  kind: PreferenceEdgeKind,
): number {
  return readGraph().edges.find((e) => e.kind === kind)?.weight ?? 0;
}

/** Test helper — clear Preference Graph (memory + localStorage when present). */
export function resetPreferenceGraphForTests(): void {
  memoryGraph = EMPTY;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function formatPreferenceGraphBrief(
  graph: PreferenceGraph = readGraph(),
): string {
  if (graph.edges.length === 0) return "Preference Graph: (empty)";
  return [
    "Preference Graph:",
    ...graph.edges
      .slice()
      .sort((a, b) => b.weight - a.weight)
      .map(
        (e) =>
          `  · ${e.evidenceKo} (${Math.round(e.weight * 100)}% · ×${e.hitCount})`,
      ),
  ].join("\n");
}
