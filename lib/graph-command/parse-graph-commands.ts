/**
 * Deterministic Graph Command parser — Korean patterns, no LLM.
 * L1 only: returns IR; never mutates Reality or calls search APIs.
 */

import { hasEateryDomainCue } from "@/lib/globe/domain-cues/eatery-domain-cues";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";
import {
  applyFieldsToGraphFilter,
  mergeGraphFilterPredicates,
  parseContextFields,
} from "@/lib/context-field";
import { resolveGraphEntityRef } from "@/lib/graph-command/resolve-graph-entity";
import {
  isDeicticTargetLabel,
  listVisiblePlaceNodes,
  parseOrdinalIndex,
  resolveSelectionOrOrdinalRef,
  resolveUtteranceTargetRef,
  selectionRefFromGraph,
} from "@/lib/graph-command/resolve-selection-ref";
import { isSameProjectReSearchUtterance } from "@/lib/graph-command/is-same-project-re-search";
import { parseTripDayPoiSearchProject } from "@/lib/graph-command/parse-trip-day-poi-project";
import { resolveLodgingStayForTools } from "@/lib/context-builder/resolve-lodging-stay-for-tools";
import { isBrowseExtractQuery } from "@/lib/tool-registry/browse-extract";
import type {
  GraphCommand,
  GraphEntityDomain,
  GraphEntityRef,
  GraphFilterPredicate,
  GraphPinAccent,
  SessionGraphV1,
} from "@/lib/graph-command/types";

function normalize(text: string): string {
  return text.trim().replace(/\s+/gu, " ");
}

function resolveDomain(text: string): GraphEntityDomain {
  if (hasLodgingDomainCue(text) || /호텔|숙소|모텔|게스트하우스|hotel|stay/iu.test(text)) {
    return "lodging";
  }
  if (
    hasEateryDomainCue(text) ||
    /맛집|식당|카페|찌개|라면|bbq|스테이크|음식|밥집|restaurant|cafe/iu.test(text)
  ) {
    return "eatery";
  }
  return "poi";
}

function refFor(graph: SessionGraphV1 | null, labelKo: string): GraphEntityRef {
  return resolveGraphEntityRef(graph, labelKo);
}

function selectionRef(graph: SessionGraphV1 | null): GraphEntityRef | null {
  return selectionRefFromGraph(graph);
}

function extractQuotedOrNamedTarget(text: string): string | null {
  const quoted = text.match(/[「"“]([^」"”]+)[」"”]/u);
  if (quoted?.[1]?.trim()) {
    return quoted[1].trim();
  }
  const pin = text.match(
    /^(.+?)\s*(?:을|를|이|가)?\s*(?:글로브(?:에)?\s*)?(?:고정|핀|pin|북마크)/iu,
  );
  if (pin?.[1]?.trim() && pin[1].trim().length <= 40) {
    return pin[1].trim().replace(/(?:을|를|이|가)$/u, "").trim();
  }
  const reserve = text.match(
    /^(.+?)\s*(?:을|를)?\s*(?:예약\s*준비|예약해|예매|잡아(?:줘|요)?|부킹|reserve)/iu,
  );
  if (reserve?.[1]?.trim() && reserve[1].trim().length <= 40) {
    const label = reserve[1].trim().replace(/(?:을|를)$/u, "").trim();
    if (!isDeicticTargetLabel(label)) {
      return label;
    }
  }
  return null;
}

function stripParticle(label: string): string {
  return label.trim().replace(/(?:을|를|이|가|은|는)$/u, "").trim();
}

function folderContextId(folderLabelKo: string): string {
  const slug =
    folderLabelKo
      .trim()
      .toLowerCase()
      .replace(/\s+/gu, "-")
      .replace(/[^\w\uac00-\ud7a3-]+/gu, "")
      .slice(0, 40) || "folder";
  return `ctx-folder:${slug}`;
}

function hasPickContext(graph: SessionGraphV1 | null): boolean {
  if (!graph) {
    return false;
  }
  if (graph.compareClusterId) {
    return true;
  }
  if (graph.selectionIds.length > 0) {
    return true;
  }
  return listVisiblePlaceNodes(graph).length >= 2;
}

function parseSimulate(text: string): GraphCommand | null {
  if (
    !/(?:시뮬레이션|시뮬(?:해|레이션)?|만약|(?:이|하)라면|면\s*어때|(?:비\s*오|내일\s*가)면|.+(?:호텔|숙소|카페|식당)이면)/iu.test(
      text,
    )
  ) {
    return null;
  }
  return { op: "simulate", scenarioKo: text };
}

function parseReasonPick(
  text: string,
  graph: SessionGraphV1 | null,
): GraphCommand | null {
  const pickCue =
    /(?:어느\s*게\s*(?:더\s*)?(?:낫|나아)|뭐가\s*(?:더\s*)?(?:좋|나)|추천해|골라(?:줘|요|주세요)?|고르(?:자|게)|그거\s*어때|어때요?\s*\?|어때\s*\?|그냥\s*해(?:줘|요)?|분석해|이\s*중에|뭐\s*고르)/iu.test(
      text,
    );
  if (!pickCue) {
    return null;
  }
  // Bare search-style "추천해" without Diff pool → search_project later.
  if (!hasPickContext(graph)) {
    return null;
  }
  return { op: "reason_pick", promptKo: text };
}

function parseCompare(text: string, graph: SessionGraphV1 | null): GraphCommand | null {
  const m =
    text.match(
      /(.+?)\s*(?:이랑|랑|와|과|하고)\s*(.+?)\s*(?:비교|compare)/iu,
    ) ?? text.match(/(.+?)\s*(?:vs|VS)\s*(.+)/u);
  if (m?.[1]?.trim() && m?.[2]?.trim() && /비교|compare|vs/iu.test(text)) {
    const left = stripParticle(m[1]);
    const right = stripParticle(
      m[2]
        .replace(/(?:을|를|이|가)?\s*(?:비교(?:해|해서|하고|한\s*뒤|한\s*다음|해서|봐)?).*$/iu, "")
        .trim(),
    );
    if (left && right && left.length <= 40 && right.length <= 40) {
      return {
        op: "compare",
        leftRef: refFor(graph, left),
        rightRef: refFor(graph, right),
      };
    }
  }

  // Bare 「비교해 봐」→ selection / visible first two
  if (!/비교(?:해(?:\s*(?:봐|줘|요|주세요))?|하자)?|compare|vs/iu.test(text)) {
    return null;
  }
  if (/이랑|랑|와|과|하고/iu.test(text) && m == null) {
    return null;
  }
  const selected = (graph?.selectionIds ?? [])
    .map((id) => graph?.nodes.find((n) => n.id === id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n));
  const pool =
    selected.length >= 2 ? selected : listVisiblePlaceNodes(graph);
  if (pool.length < 2) {
    return null;
  }
  return {
    op: "compare",
    leftRef: { labelKo: pool[0]!.labelKo, nodeId: pool[0]!.id },
    rightRef: { labelKo: pool[1]!.labelKo, nodeId: pool[1]!.id },
  };
}

function parseDelete(text: string, graph: SessionGraphV1 | null): GraphCommand | null {
  if (
    !/(?:삭제(?:해(?:줘|요|주세요)?)?|지워(?:줘|요|버려)?|없애(?:줘|요)?|빼\s*(?:줘|버려)|빼줘|제거(?:해)?|지워버려)/iu.test(
      text,
    )
  ) {
    return null;
  }
  const named =
    text.match(
      /^(.+?)\s*(?:을|를)?\s*(?:삭제|지워|없애|빼\s*(?:줘|버려)|빼줘|제거|지워버려)/iu,
    )?.[1] ?? extractQuotedOrNamedTarget(text);
  const label = named ? stripParticle(named) : null;
  if (label && label.length <= 40 && !isDeicticTargetLabel(label)) {
    return { op: "delete_node", targetRef: refFor(graph, label) };
  }
  const resolved = resolveSelectionOrOrdinalRef(graph, text);
  if (resolved) {
    return { op: "delete_node", targetRef: resolved };
  }
  return null;
}

function parseUngroup(
  text: string,
  graph: SessionGraphV1 | null,
): GraphCommand | null {
  if (!/(?:풀어|ungroup|그룹\s*해제|묶음\s*해제)/iu.test(text)) {
    return null;
  }
  if (!graph) {
    return null;
  }
  const selectedGroup = graph.selectionIds
    .map((id) => graph.nodes.find((n) => n.id === id))
    .find((n) => n?.kind === "group");
  if (selectedGroup) {
    return {
      op: "delete_node",
      targetRef: { labelKo: selectedGroup.labelKo, nodeId: selectedGroup.id },
    };
  }
  const member = selectionRef(graph);
  if (member?.nodeId) {
    const node = graph.nodes.find((n) => n.id === member.nodeId);
    if (node?.groupId) {
      const group = graph.nodes.find((n) => n.id === node.groupId);
      if (group) {
        return {
          op: "delete_node",
          targetRef: { labelKo: group.labelKo, nodeId: group.id },
        };
      }
    }
  }
  const groupNode = graph.nodes.find((n) => n.kind === "group" && n.visible);
  if (groupNode) {
    return {
      op: "delete_node",
      targetRef: { labelKo: groupNode.labelKo, nodeId: groupNode.id },
    };
  }
  return null;
}

function parseGroup(text: string, graph: SessionGraphV1 | null): GraphCommand | null {
  if (/(?:풀어|ungroup|그룹\s*해제)/iu.test(text)) {
    return null;
  }
  if (!/(?:묶어(?:줘|요|주세요)?|그룹)/iu.test(text)) {
    return null;
  }
  const pair = text.match(
    /(.+?)\s*(?:이랑|랑|와|과|하고)\s*(.+?)\s*(?:을|를)?\s*(?:묶어|그룹)/iu,
  );
  if (pair?.[1]?.trim() && pair?.[2]?.trim()) {
    const left = stripParticle(pair[1]);
    const right = stripParticle(
      pair[2].replace(/(?:을|를)?\s*(?:묶어|그룹).*$/iu, ""),
    );
    if (left && right && left.length <= 40 && right.length <= 40) {
      return {
        op: "group_nodes",
        memberRefs: [refFor(graph, left), refFor(graph, right)],
        labelKo: null,
      };
    }
  }
  if (graph && graph.selectionIds.length >= 2) {
    const refs: GraphEntityRef[] = [];
    for (const id of graph.selectionIds) {
      const node = graph.nodes.find((n) => n.id === id);
      if (node) {
        refs.push({ labelKo: node.labelKo, nodeId: node.id });
      }
    }
    if (refs.length >= 2) {
      return { op: "group_nodes", memberRefs: refs, labelKo: null };
    }
  }
  // Bare 「묶어줘」→ first two visible places in Diff
  const visible = listVisiblePlaceNodes(graph);
  if (visible.length >= 2) {
    return {
      op: "group_nodes",
      memberRefs: [
        { labelKo: visible[0]!.labelKo, nodeId: visible[0]!.id },
        { labelKo: visible[1]!.labelKo, nodeId: visible[1]!.id },
      ],
      labelKo: null,
    };
  }
  return null;
}

function parseMoveContext(
  text: string,
  graph: SessionGraphV1 | null,
): GraphCommand | null {
  const ritual = text.match(
    /(?:(.+?)\s*(?:을|를)\s*)?(?:(.+?)\s+)?맥락으로\s*옮겨/iu,
  );
  if (ritual && /맥락으로\s*옮겨/iu.test(text)) {
    const folderRaw = (ritual[2] ?? "여행").trim();
    const folderLabelKo =
      !folderRaw || /여행/iu.test(folderRaw)
        ? "여행"
        : stripParticle(folderRaw);
    let targetLabel = ritual[1] ? stripParticle(ritual[1]) : null;
    if (targetLabel && /맥락으로/iu.test(targetLabel)) {
      targetLabel = null;
    }
    if (!targetLabel || targetLabel.length > 40) {
      const selected = selectionRef(graph);
      if (!selected) {
        return null;
      }
      return {
        op: "move_context",
        targetRef: selected,
        toContextEventId: folderContextId(folderLabelKo),
        folderLabelKo,
      };
    }
    return {
      op: "move_context",
      targetRef: refFor(graph, targetLabel),
      toContextEventId: folderContextId(folderLabelKo),
      folderLabelKo,
    };
  }

  // Casual Move — 「옮겨줘」「여기로 옮겨」「이쪽으로 옮겨」
  if (
    !/(?:옮겨(?:줘|요|주세요)?|여기로\s*옮겨|이쪽으로\s*옮겨|저기로\s*옮겨)/iu.test(
      text,
    )
  ) {
    return null;
  }
  if (/메모|공유|고정|삭제|예약|찾아/iu.test(text)) {
    return null;
  }

  const named = text.match(
    /^(.+?)\s*(?:을|를)?\s*(?:여기로|이쪽으로|저기로)?\s*옮겨/iu,
  );
  let targetLabel =
    named?.[1] && named[1].trim().length <= 40
      ? stripParticle(named[1])
      : null;
  if (
    targetLabel &&
    /여기|이쪽|저기|그거|이것|저것|맥락/iu.test(targetLabel)
  ) {
    targetLabel = null;
  }

  const folderLabelKo = "여행";
  if (!targetLabel) {
    const selected = selectionRef(graph);
    if (!selected) {
      return null;
    }
    return {
      op: "move_context",
      targetRef: selected,
      toContextEventId: folderContextId(folderLabelKo),
      folderLabelKo,
    };
  }
  return {
    op: "move_context",
    targetRef: refFor(graph, targetLabel),
    toContextEventId: folderContextId(folderLabelKo),
    folderLabelKo,
  };
}

function parseCreateNote(
  text: string,
  graph: SessionGraphV1 | null,
): GraphCommand | null {
  if (
    !/(?:메모\s*(?:달아|적어|해)|메모해|적어(?:줘|요|주세요)?)/iu.test(text)
  ) {
    return null;
  }
  if (/항상\s*보여|공유해|맥락으로\s*옮겨|옮겨(?:줘|요)/iu.test(text)) {
    return null;
  }
  const quoted = text.match(/[「"“]([^」"”]+)[」"”]/u);
  const named = text.match(
    /^(.+?)\s*(?:에|을|를|한테)?\s*(?:메모\s*(?:달아|적어|해)|메모해|적어)/iu,
  );
  let targetLabel = named?.[1] ? stripParticle(named[1]) : null;
  if (targetLabel && /메모|적어/iu.test(targetLabel)) {
    targetLabel = null;
  }
  if (targetLabel && isDeicticTargetLabel(targetLabel)) {
    targetLabel = null;
  }
  const bodyKo =
    quoted?.[1]?.trim() ||
    text
      .replace(/^.*?메모\s*(?:달아|적어|해)\s*/iu, "")
      .replace(/^.*?메모해(?:줘|요|주세요)?\s*/iu, "")
      .replace(/^.*?적어(?:줘|요|주세요)?\s*/iu, "")
      .trim() ||
    "메모";
  const targetRef =
    targetLabel && targetLabel.length <= 40
      ? refFor(graph, targetLabel)
      : resolveSelectionOrOrdinalRef(graph, text) ?? selectionRef(graph);
  if (!targetRef) {
    return null;
  }
  return {
    op: "create_note",
    targetRef,
    bodyKo: bodyKo.slice(0, 120) || "메모",
  };
}

function parseStylePin(
  text: string,
  graph: SessionGraphV1 | null,
): GraphCommand | null {
  let accent: GraphPinAccent | null = null;
  if (/빨간(?:색)?|빨강|red/iu.test(text)) {
    accent = "red";
  } else if (/파란(?:색)?|파랑|blue/iu.test(text)) {
    accent = "blue";
  } else if (/초록(?:색)?|녹색|green/iu.test(text)) {
    accent = "green";
  } else if (/주황(?:색)?|오렌지|orange/iu.test(text)) {
    accent = "orange";
  }
  if (!accent) {
    return null;
  }
  const styleCue =
    /(?:빨간색|파란(?:색)?|초록(?:색)?|주황(?:색)?)\s*(?:으로\s*)?(?:표시|보여)?/iu.test(
      text,
    ) ||
    /핀(?:은|을|를)?\s*(?:빨간|파란|초록|주황)/iu.test(text) ||
    /(?:빨간|파란|초록|주황)(?:색)?\s*(?:으로\s*)?(?:표시|보여|칠해)?/iu.test(text);
  if (!styleCue || !/(?:빨간|파란|초록|주황|표시|보여|핀)/iu.test(text)) {
    return null;
  }
  const named =
    text.match(
      /^(.+?)\s*(?:을|를|은|는)?\s*(?:빨간|파란|초록|주황|빨간색|파란색|초록색)/iu,
    )?.[1] ?? null;
  const label = named ? stripParticle(named) : null;
  const targetRef =
    label && label.length <= 40 && !/^(?:이\s*)?핀$/iu.test(label)
      ? refFor(graph, label)
      : selectionRef(graph) ?? { labelKo: "선택", nodeId: null };
  return { op: "style_pin", targetRef, accent };
}

function parseSetVisibility(
  text: string,
  graph: SessionGraphV1 | null,
): GraphCommand | null {
  const hide = /숨겨|가려|숨김|hide/iu.test(text);
  const always = /항상\s*보여/iu.test(text);
  if (!hide && !always) {
    return null;
  }
  const named = text.match(
    /^(.+?)\s*(?:을|를)?\s*(?:항상\s*보여|숨겨|가려)/iu,
  )?.[1];
  const label = named ? stripParticle(named) : null;
  const targetRef =
    label && label.length <= 40 && !/항상|숨겨|가려/iu.test(label)
      ? refFor(graph, label)
      : selectionRef(graph) ?? { labelKo: "선택", nodeId: null };
  return {
    op: "set_visibility",
    targetRef,
    alwaysVisible: always && !hide,
  };
}

function parseShareContext(
  text: string,
  graph: SessionGraphV1 | null,
): GraphCommand | null {
  if (
    !/(?:공유해|공유\s*하자|share|카톡으로|링크로\s*(?:보내|공유)|(?:카톡|링크)\s*(?:로\s*)?보내)/iu.test(
      text,
    )
  ) {
    return null;
  }
  if (/예약|결제|찾아|길\s*찾/iu.test(text) && !/공유|share|카톡|링크/iu.test(text)) {
    return null;
  }
  const named = text.match(
    /^(.+?)\s*(?:을|를)?\s*(?:공유해|공유\s*하자|share|카톡으로|링크로|보내)/iu,
  )?.[1];
  const label = named ? stripParticle(named) : null;
  const targetRef = resolveUtteranceTargetRef({
    graph,
    utterance: text,
    namedLabel: label && !isDeicticTargetLabel(label) ? label : null,
  });
  if (!targetRef) {
    return null;
  }
  return {
    op: "share_context",
    targetRef:
      targetRef.nodeId != null
        ? targetRef
        : refFor(graph, targetRef.labelKo),
  };
}

function parseFilter(text: string): GraphCommand | null {
  let maxWalkMinutes: number | null | undefined;
  let minRating: number | null | undefined;
  let reservableOnly: boolean | null | undefined;
  let domain: GraphFilterPredicate["domain"];
  let sortBy: GraphFilterPredicate["sortBy"];
  let matched = false;

  const fieldPred = applyFieldsToGraphFilter(parseContextFields(text));

  const walk = text.match(
    /(?:걸어서|도보|walking)?\s*(\d+)\s*분\s*(?:안|이내|내|이하)?/iu,
  );
  if (walk?.[1]) {
    maxWalkMinutes = Number(walk[1]);
    matched = true;
  } else if (fieldPred?.maxWalkMinutes != null) {
    maxWalkMinutes = fieldPred.maxWalkMinutes;
    matched = true;
  }

  const rating = text.match(
    /(?:평점|별점|rating)\s*(\d+(?:\.\d+)?)\s*(?:이상|↑|\+)?/iu,
  );
  if (rating?.[1]) {
    minRating = Number(rating[1]);
    matched = true;
  }

  if (/예약\s*가능|reservable|예약\s*되는/iu.test(text)) {
    reservableOnly = true;
    matched = true;
  }

  if (
    fieldPred?.localFavoriteOnly ||
    /현지인|로컬\s*(?:맛집|만)|local\s*favorite|현지\s*(?:만|맛집)/iu.test(text)
  ) {
    // thicker local signal — filter + sort
    matched = true;
    return {
      op: "filter",
      predicate: {
        localFavoriteOnly: true,
        sortBy: "local_desc",
        ...(reservableOnly ? { reservableOnly: true } : {}),
        ...(maxWalkMinutes !== undefined ? { maxWalkMinutes } : {}),
        ...(minRating !== undefined ? { minRating } : {}),
      },
    };
  }

  if (/가격\s*순|싼\s*순|저렴한\s*순|싼\s*것만|더\s*싸게|싸게|price\s*asc/iu.test(text)) {
    sortBy = "price_asc";
    matched = true;
  } else if (/평점\s*순|높은\s*평점|rating\s*desc/iu.test(text)) {
    sortBy = "rating_desc";
    matched = true;
  } else if (/가까운\s*순|거리\s*순|walk\s*asc/iu.test(text)) {
    sortBy = "walk_asc";
    matched = true;
  }

  if (
    /(?:만|only)\s*$/iu.test(text) ||
    /만\s*(?:보여|남겨|남기|골라)/iu.test(text)
  ) {
    const resolved = resolveDomain(text);
    if (
      resolved !== "poi" ||
      hasEateryDomainCue(text) ||
      hasLodgingDomainCue(text)
    ) {
      domain = resolved;
      matched = true;
    }
  }

  if (
    /남겨|걸러|필터|filter/iu.test(text) &&
    (minRating != null ||
      maxWalkMinutes != null ||
      reservableOnly ||
      /현지/iu.test(text))
  ) {
    matched = true;
  }

  if (!matched) {
    return null;
  }

  const predicate: GraphFilterPredicate = mergeGraphFilterPredicates(
    {
      ...(maxWalkMinutes !== undefined ? { maxWalkMinutes } : {}),
      ...(minRating !== undefined ? { minRating } : {}),
      ...(reservableOnly !== undefined ? { reservableOnly } : {}),
      ...(domain !== undefined ? { domain } : {}),
      ...(sortBy !== undefined ? { sortBy } : {}),
    },
    fieldPred,
  );
  return { op: "filter", predicate };
}

function parsePin(text: string, graph: SessionGraphV1 | null): GraphCommand | null {
  if (
    !/(?:고정해(?:줘|요|주세요)?|고정\s*해|고정(?:\s|$)|핀\s*해|핀해|핀\s*찍어|핀\s*고정|북마크|pin\b|글로브에\s*(?:고정|올려|표시))/iu.test(
      text,
    )
  ) {
    return null;
  }
  if (/핀(?:은|을|를)?\s*(?:빨간|파란|초록|주황)/iu.test(text)) {
    return null;
  }
  const named = extractQuotedOrNamedTarget(text);
  const targetRef = resolveUtteranceTargetRef({
    graph,
    utterance: text,
    namedLabel: named,
  });
  if (!targetRef) {
    return null;
  }
  return {
    op: "pin_node",
    targetRef:
      targetRef.nodeId != null
        ? targetRef
        : refFor(graph, targetRef.labelKo),
  };
}

function parsePaymentPrep(
  text: string,
  graph: SessionGraphV1 | null,
): GraphCommand | null {
  if (!/(?:결제해(?:줘|요|주세요)?|결제\s*해|구매해|pay(?:ment)?|purchase)/iu.test(text)) {
    return null;
  }
  if (/예약|예매|찾아|비교/iu.test(text)) {
    return null;
  }

  const named = extractQuotedOrNamedTarget(text);
  const targetRef = resolveUtteranceTargetRef({
    graph,
    utterance: text,
    namedLabel:
      named && !/(?:결제|구매|pay)/iu.test(named) ? named : null,
  });
  if (!targetRef) {
    const pinned = graph?.nodes.find((n) => n.pinned && n.visible);
    if (pinned) {
      return {
        op: "payment_prep",
        targetRef: { labelKo: pinned.labelKo, nodeId: pinned.id },
      };
    }
    return null;
  }
  return {
    op: "payment_prep",
    targetRef:
      targetRef.nodeId != null
        ? targetRef
        : refFor(graph, targetRef.labelKo),
  };
}

function parseReservePrep(
  text: string,
  graph: SessionGraphV1 | null,
): GraphCommand | null {
  if (
    !/(?:예약\s*준비|예약해(?:줘|요|주세요)?|예매(?:할게|할래|해줘|해요|해)?|잡아(?:줘|요|주세요)?|부킹|reserve\s*prep|여기\s*예약|(?:첫|두|세)\s*(?:번\s*)?째\s*예약)/iu.test(
      text,
    )
  ) {
    return null;
  }

  const fromSelection = resolveSelectionOrOrdinalRef(graph, text);
  if (
    fromSelection &&
    (parseOrdinalIndex(text) != null ||
      /그거|이거|저거|여기|해당/iu.test(text))
  ) {
    return { op: "reserve_prep", targetRef: fromSelection };
  }

  const named = extractQuotedOrNamedTarget(text);
  if (named && !/(?:예약|예매|잡아|부킹)/iu.test(named)) {
    return { op: "reserve_prep", targetRef: refFor(graph, named) };
  }
  if (fromSelection) {
    return { op: "reserve_prep", targetRef: fromSelection };
  }
  const pinned = graph?.nodes.find((n) => n.pinned && n.visible);
  if (pinned) {
    return {
      op: "reserve_prep",
      targetRef: { labelKo: pinned.labelKo, nodeId: pinned.id },
    };
  }
  return null;
}

function parseSearchProject(
  text: string,
  graph: SessionGraphV1 | null,
): GraphCommand | null {
  // Trip day + named POI (no 「찾아」 required) — live Globe Diff path.
  const tripDay = parseTripDayPoiSearchProject(text);
  if (tripDay) {
    return tripDay;
  }

  const reSearch = isSameProjectReSearchUtterance(text);
  const searchCue =
    reSearch ||
    /(?:찾|추천|보여|알려|골라|주변|근처|near|around|search|find)/iu.test(text);
  const stay = resolveLodgingStayForTools(graph?.contextEventId);
  const domain = reSearch
    ? "lodging"
    : resolveDomain(text);
  const domainCue =
    reSearch ||
    domain !== "poi" ||
    /관광|명소|poi|편의|약국|입장권|티켓|ticket|테마\s*파크|액티비티|놀거리|볼거리|할거리|things?\s*to\s*do|attraction/iu.test(
      text,
    ) ||
    isBrowseExtractQuery(text);

  if (!searchCue || !domainCue) {
    return null;
  }
  if (
    !reSearch &&
    /만\s*(?:보여|남겨)|걸어서\s*\d+\s*분|예약\s*가능(?:한\s*곳)?\s*만|가격\s*순/iu.test(
      text,
    ) &&
    !/(?:찾|추천|주변|근처)/iu.test(text)
  ) {
    return null;
  }

  let anchorRef: GraphEntityRef | null = null;
  const around = text.match(/(.+?)\s*(?:주변|근처|around|near)\s*(.+)/iu);
  if (around?.[1]?.trim() && around[1].trim().length <= 40) {
    const anchorLabel = around[1]
      .trim()
      .replace(/(?:의|에)$/u, "")
      .trim();
    if (anchorLabel && !/여기|이\s*근처|주변/iu.test(anchorLabel)) {
      anchorRef = refFor(graph, anchorLabel);
    }
  }

  const seededQuery =
    reSearch && stay.searchQueryHint
      ? stay.searchQueryHint
      : text;

  return {
    op: "search_project",
    query: seededQuery,
    domain,
    anchorRef,
  };
}

/**
 * Parse utterance into 0..n graph commands.
 * Priority: simulate → reason_pick → compare → delete → group → move → note →
 * style → visibility → share → filter → pin → reserve → search.
 */
export function parseGraphCommands(
  utterance: string,
  graph: SessionGraphV1 | null = null,
): readonly GraphCommand[] {
  const text = normalize(utterance);
  if (!text || text.length > 160) {
    return [];
  }

  const parsers: Array<() => GraphCommand | null> = [
    () => parseSimulate(text),
    () => parseReasonPick(text, graph),
    () => parseCompare(text, graph),
    () => parseDelete(text, graph),
    () => parseUngroup(text, graph),
    () => parseGroup(text, graph),
    () => parseMoveContext(text, graph),
    () => parseCreateNote(text, graph),
    () => parseStylePin(text, graph),
    () => parseSetVisibility(text, graph),
    () => parseShareContext(text, graph),
    () => parseFilter(text),
    () => parsePin(text, graph),
    () => parsePaymentPrep(text, graph),
    () => parseReservePrep(text, graph),
    () => parseSearchProject(text, graph),
  ];

  for (const run of parsers) {
    const command = run();
    if (command) {
      return [command];
    }
  }
  return [];
}

export function isGraphCommandUtterance(
  utterance: string,
  graph: SessionGraphV1 | null = null,
): boolean {
  return parseGraphCommands(utterance, graph).length > 0;
}
