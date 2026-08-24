export const PC_CONNECT_INSPECT_ID = "__connect__";
export const PC_AGENT_LOCAL_CALLBACK_PORT = 38472;
export const PC_AGENT_DESKTOP_SESSION_TTL_MS = 15 * 60 * 1000;
export const PC_CONNECT_EVENT = "rimvio-pc-connect";
export const PC_CONNECT_OPEN_SIDEBAR_EVENT = "rimvio-pc-connect-sidebar";
export const PC_CONNECT_START_INSTALL_EVENT = "rimvio-pc-connect-install";
export const PC_INSTALL_QUERY_KEY = "rimvio-pc-install-query";

export function startPcProgramInstallFlow(query: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const text = query.trim();
  sessionStorage.setItem(PC_INSTALL_QUERY_KEY, text);
  window.dispatchEvent(new CustomEvent(PC_CONNECT_OPEN_SIDEBAR_EVENT));
  window.dispatchEvent(
    new CustomEvent(PC_CONNECT_START_INSTALL_EVENT, { detail: { query: text } }),
  );
}

export function localAgentHealthUrl(port = PC_AGENT_LOCAL_CALLBACK_PORT): string {
  return `http://127.0.0.1:${port}/health`;
}

export function localAgentAnnounceUrl(port = PC_AGENT_LOCAL_CALLBACK_PORT): string {
  return `http://127.0.0.1:${port}/announce`;
}

export function localAgentCallbackUrl(input: {
  nonce: string;
  exchange: string;
  port?: number;
}): string {
  const port = input.port ?? PC_AGENT_LOCAL_CALLBACK_PORT;
  const q = new URLSearchParams({
    nonce: input.nonce,
    exchange: input.exchange,
  });
  return `http://127.0.0.1:${port}/callback?${q.toString()}`;
}

export function pcConnectAppUrl(origin: string, nonce: string): string {
  const url = new URL("/", origin);
  url.searchParams.set("pcConnect", nonce);
  return url.toString();
}
