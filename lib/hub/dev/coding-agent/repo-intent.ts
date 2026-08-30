/** Browser-safe repo intent — no Node imports. */

export function wantsRepoClone(utterance: string): boolean {
  return /clone|클론|레포\s*(가져와|받아|체크아웃)|git\s+clone|checkout\s+repo/i.test(utterance);
}
