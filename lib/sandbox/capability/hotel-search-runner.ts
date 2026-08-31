import {
  assertNotCancelled,
  captureStepScreenshot,
  highlightElement,
  pause,
} from "./helpers";
import type { BrowserRuntime, CapabilityRuntime, ExecutionContext, ExecutionResult } from "../types";

const LOCATION_SELECTOR = '[data-testid="location-input"]';
const CHECKIN_SELECTOR = '[data-testid="checkin-input"]';
const CHECKOUT_SELECTOR = '[data-testid="checkout-input"]';
const SEARCH_SELECTOR = '[data-testid="search-button"]';
const RESULTS_SELECTOR = '[data-testid="hotel-results"]';
const HOTEL_CARD_SELECTOR = '[data-testid="hotel-card"]';

export class HotelSearchCapabilityRunner implements CapabilityRuntime {
  async execute(
    capability: string,
    input: Record<string, unknown>,
    context: ExecutionContext,
    browser: BrowserRuntime,
  ): Promise<ExecutionResult> {
    if (capability !== "hotel.search") {
      return { ok: false, error: `unsupported_capability:${capability}` };
    }

    const location = String(input.location ?? "오사카, 일본");
    const checkIn = String(input.checkIn ?? "2024-06-01");
    const checkOut = String(input.checkOut ?? "2024-06-03");
    const targetUrl = `${context.baseUrl}/sandbox/osakastay`;

    context.setFlowStage("request");
    context.emitStep({
      type: "EXECUTION_STARTED",
      step: "request",
      action: "Execution started",
      metadata: { capability: "hotel.search" },
    });
    await pause(200, context);

    context.setFlowStage("intent");
    context.emit("flow.stage", { stage: "intent", intent: "hotel.search" });
    await pause(200, context);

    context.setFlowStage("capability");
    context.emit("flow.stage", { stage: "capability", capability: "hotel.search" });
    await pause(200, context);

    context.setFlowStage("runtime");
    context.emit("flow.stage", { stage: "runtime", runtime: "browser" });

    context.setCurrentAction("Launching Chromium", "browser_launch");
    context.emitStep({ type: "BROWSER_STARTED", step: "browser_launch", action: "Launch browser" });
    await browser.launch();
    await assertNotCancelled(context);
    await captureStepScreenshot(browser, context, "browser_launch");

    context.setCurrentAction("Opening OsakaStay", "open_website");
    context.emitStep({
      type: "NAVIGATION_STARTED",
      step: "open_website",
      action: "Open website",
      target: targetUrl,
    });
    await browser.navigate(targetUrl);
    context.emitStep({
      type: "NAVIGATION_COMPLETED",
      step: "open_website",
      action: "Open website",
      target: targetUrl,
    });
    await captureStepScreenshot(browser, context, "open_website");

    context.setCurrentAction("Entering location", "location_input");
    context.emitStep({
      type: "ELEMENT_FOUND",
      step: "location_input",
      action: "Find location input",
      target: LOCATION_SELECTOR,
    });
    await highlightElement(browser, context, LOCATION_SELECTOR, "Location");
    await browser.type(LOCATION_SELECTOR, location);
    context.emitStep({
      type: "TYPE",
      step: "location_input",
      action: "Type location",
      target: LOCATION_SELECTOR,
      metadata: { text: location },
    });
    await captureStepScreenshot(browser, context, "location_input");

    context.setCurrentAction("Setting dates", "dates_input");
    await browser.type(CHECKIN_SELECTOR, checkIn);
    context.emitStep({
      type: "TYPE",
      step: "checkin_input",
      action: "Set check-in",
      target: CHECKIN_SELECTOR,
      metadata: { text: checkIn },
    });
    await browser.type(CHECKOUT_SELECTOR, checkOut);
    context.emitStep({
      type: "TYPE",
      step: "checkout_input",
      action: "Set check-out",
      target: CHECKOUT_SELECTOR,
      metadata: { text: checkOut },
    });
    await highlightElement(browser, context, CHECKOUT_SELECTOR, "Dates");
    await captureStepScreenshot(browser, context, "dates_input");

    context.setCurrentAction("Clicking search", "submit_search");
    await highlightElement(browser, context, SEARCH_SELECTOR, "Click search");
    await browser.click(SEARCH_SELECTOR);
    context.emitStep({
      type: "CLICK",
      step: "submit_search",
      action: "Click search",
      target: SEARCH_SELECTOR,
    });
    await captureStepScreenshot(browser, context, "submit_search");

    context.setCurrentAction("Extracting results", "extract_results");
    context.emitStep({
      type: "WAIT",
      step: "wait_results",
      action: "Wait for results",
      target: RESULTS_SELECTOR,
    });
    await browser.waitForSelector(RESULTS_SELECTOR);
    const count = await browser.count(HOTEL_CARD_SELECTOR);
    context.emitStep({
      type: "DATA_EXTRACTED",
      step: "extract_results",
      action: "Extract results",
      metadata: { count, summary: `${count} hotels` },
    });
    await captureStepScreenshot(browser, context, "extract_results");

    const output = {
      hotelsFound: count,
      location,
      checkIn,
      checkOut,
    };

    context.setFlowStage("result");
    context.emitStep({
      type: "EXECUTION_COMPLETED",
      step: "result",
      action: "Execution completed",
      metadata: { summary: `${count} hotels found`, output },
    });
    context.setCurrentAction(null);
    context.setAgentCursor({ visible: false });

    await browser.close();

    return { ok: true, output };
  }
}
