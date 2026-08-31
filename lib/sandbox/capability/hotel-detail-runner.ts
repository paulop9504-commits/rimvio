import type { BrowserRuntime, CapabilityRuntime, ExecutionContext, ExecutionResult } from "../types";

const HOTEL_CARD_SELECTOR = '[data-testid="hotel-card"]';
const HOTEL_DETAIL_SELECTOR = '[data-testid="hotel-detail"]';
const HOTEL_DETAIL_NAME_SELECTOR = '[data-testid="hotel-detail-name"]';

export class HotelDetailCapabilityRunner implements CapabilityRuntime {
  async execute(
    capability: string,
    input: Record<string, unknown>,
    context: ExecutionContext,
    browser: BrowserRuntime,
  ): Promise<ExecutionResult> {
    if (capability !== "hotel.detail") {
      return { ok: false, error: `unsupported_capability:${capability}` };
    }

    const hotelId = String(input.hotelId ?? "grand-osaka");
    const targetUrl = `${context.baseUrl}/sandbox/osakastay?hotelId=${encodeURIComponent(hotelId)}`;

    context.setFlowStage("request");
    context.emit("flow.stage", { stage: "request" });
    context.setFlowStage("intent");
    context.emit("flow.stage", { stage: "intent", intent: "hotel.detail" });
    context.setFlowStage("capability");
    context.emit("flow.stage", { stage: "capability", capability: "hotel.detail" });
    context.setFlowStage("runtime");
    context.emit("flow.stage", { stage: "runtime", runtime: "browser" });

    context.setCurrentAction("Launching Chromium");
    context.emit("browser.launch", { browser: "chromium" });
    await browser.launch();

    context.setCurrentAction("Opening hotel detail");
    context.emit("page.goto", { url: targetUrl });
    await browser.navigate(targetUrl);
    context.setScreenshot(await browser.screenshot().then((b) => toScreenshotDataUrl(b)));

    context.setCurrentAction("Reading hotel detail");
    await browser.waitForSelector(HOTEL_DETAIL_SELECTOR);
    const name = (await browser.extractText(HOTEL_DETAIL_NAME_SELECTOR)).trim();
    const cardCount = await browser.count(HOTEL_CARD_SELECTOR);
    context.emit("extract", { summary: name || hotelId, hotelId, name });

    const output = {
      hotelId,
      name: name || hotelId,
      relatedHotels: cardCount,
    };

    context.setFlowStage("result");
    context.emit("result", { ok: true, summary: name || hotelId, output });
    context.setCurrentAction(null);
    context.setAgentCursor({ visible: false });
    await browser.close();

    return { ok: true, output };
  }
}

function toScreenshotDataUrl(buffer: Buffer): string {
  const head = buffer.subarray(0, 16).toString("utf8");
  if (head.includes("svg") || head.startsWith("<")) {
    return `data:image/svg+xml;base64,${buffer.toString("base64")}`;
  }
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}
