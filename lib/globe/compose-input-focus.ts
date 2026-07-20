/** Compose IME owns the main thread — pause React storms while focused. */

let composeInputFocused = false;
const listeners = new Set<(focused: boolean) => void>();

export function isGlobeComposeInputFocused(): boolean {
  return composeInputFocused;
}

export function setGlobeComposeInputFocused(focused: boolean): void {
  if (composeInputFocused === focused) {
    return;
  }
  composeInputFocused = focused;
  for (const listener of listeners) {
    listener(focused);
  }
}

export function subscribeGlobeComposeInputFocus(
  listener: (focused: boolean) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
