/** Labels + confirm copy for bulk globe context delete (manage sheet · sidebar). */
export function describeGlobeContextDeleteSelection(input: {
  detachLocal: number;
  deleteUpstream: number;
  blocked: number;
  total: number;
}): { label: string; confirm: string | null; actionable: boolean } {
  const { detachLocal, deleteUpstream, blocked, total } = input;
  if (total === 0) {
    return { label: "맥락을 선택하세요", confirm: null, actionable: false };
  }
  if (blocked === total) {
    return { label: "삭제할 수 없어요", confirm: null, actionable: false };
  }
  const blockedLine =
    blocked > 0 ? `\n삭제할 수 없는 ${blocked}개는 건너뛰어요.` : "";
  if (detachLocal === total - blocked && deleteUpstream === 0) {
    return {
      label:
        total === 1
          ? "내 지구본에서만 숨기기"
          : `내 지구본에서만 숨기기 · ${total}개`,
      confirm:
        total === 1
          ? "선택한 맥락을 내 지구본에서만 숨길까요?\n원본 쪽 순간은 그대로 남아요." +
            blockedLine
          : `선택한 맥락 ${total}개를 내 지구본에서만 숨길까요?\n원본 쪽 순간은 그대로 남아요.${blockedLine}`,
      actionable: true,
    };
  }
  if (deleteUpstream === total - blocked && detachLocal === 0) {
    return {
      label: total === 1 ? "원본 삭제" : `원본 삭제 · ${total}개`,
      confirm:
        total === 1
          ? "선택한 맥락 원본을 지울까요?\n내 지구본에서도 함께 사라져요." +
            blockedLine
          : `선택한 맥락 ${total}개 원본을 지울까요?\n내 지구본에서도 함께 사라져요.${blockedLine}`,
      actionable: true,
    };
  }
  return {
    label: `숨기기/삭제 · ${total}개`,
    confirm:
      `선택한 맥락 ${total}개를 처리할까요?\n받아 둔 맥락은 내 지구본에서만 숨기고, 원본은 원본으로 지워요.${blockedLine}`,
    actionable: true,
  };
}

export function toastLineForGlobeContextDelete(input: {
  deleted: number;
  deleteLabel: string;
}): string {
  const { deleted, deleteLabel } = input;
  if (deleted === 0) {
    return "맥락을 지우지 못했어요";
  }
  if (deleteLabel.startsWith("내 지구본에서만 숨기기")) {
    return deleted === 1
      ? "내 지구본에서만 숨겼어요"
      : `${deleted}개를 내 지구본에서만 숨겼어요`;
  }
  if (deleteLabel.startsWith("원본 삭제")) {
    return deleted === 1 ? "원본을 지웠어요" : `원본 ${deleted}개를 지웠어요`;
  }
  return `맥락 ${deleted}개를 처리했어요`;
}
