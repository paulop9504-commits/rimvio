import { isPlaywrightAvailable } from "../browser/playwright-runtime";
import { playwrightRequired } from "../errors";
import { validateProductSearchInput } from "./contracts";
import {
  assertNotCancelled,
  captureStepScreenshot,
  cursorFromBox,
  highlightElement,
  pause,
} from "./helpers";
import type {
  BrowserRuntime,
  CapabilityRuntime,
  ExecutionContext,
  ExecutionResult,
  ProductSearchOutput,
} from "../types";

const QUERY_SELECTOR = '[data-testid="product-query-input"]';
const SEARCH_SELECTOR = '[data-testid="product-search-button"]';
const RESULTS_SELECTOR = '[data-testid="product-results"]';
const PRODUCT_CARD_SELECTOR = '[data-testid="product-card"]';

const EXTRACT_SCRIPT = `
return elements.map((el) => ({
  name: el.querySelector('[data-testid="product-name"]')?.textContent?.trim() ?? '',
  price: el.querySelector('[data-testid="product-price"]')?.textContent?.trim() ?? '',
  url: el.querySelector('[data-testid="product-link"]')?.getAttribute('href') ?? '',
}));
`;

export class ProductSearchCapabilityRunner implements CapabilityRuntime {
  async execute(
    capability: string,
    input: Record<string, unknown>,
    context: ExecutionContext,
    browser: BrowserRuntime,
  ): Promise<ExecutionResult> {
    if (capability !== "product.search") {
      return { ok: false, error: `unsupported_capability:${capability}` };
    }

    if (!(await isPlaywrightAvailable())) {
      context.fail(playwrightRequired("browser_launch"));
    }

    const parsed = validateProductSearchInput(input);
    if (!parsed.ok) {
      return { ok: false, error: parsed.errors.join("; ") };
    }

    const { query, limit = 5 } = parsed.value;
    const targetUrl = `${context.baseUrl}/sandbox/shop`;

    context.setFlowStage("request");
    context.emitStep({
      type: "EXECUTION_STARTED",
      step: "request",
      action: "Execution started",
      metadata: { capability: "product.search", query },
    });
    await pause(100, context);

    context.setFlowStage("intent");
    context.emitStep({
      type: "flow.stage",
      step: "intent",
      action: "Resolve intent",
      metadata: { intent: "product.search" },
    });
    await pause(100, context);

    context.setFlowStage("capability");
    context.emitStep({
      type: "flow.stage",
      step: "capability",
      action: "Load capability",
      metadata: { capability: "product.search" },
    });
    await pause(100, context);

    context.setFlowStage("runtime");
    context.setCurrentAction("Launching Chromium", "browser_launch");
    context.emitStep({ type: "BROWSER_STARTED", step: "browser_launch", action: "Launch browser" });
    await browser.launch();
    await assertNotCancelled(context);
    await captureStepScreenshot(browser, context, "browser_launch");

    context.setCurrentAction("Opening shop", "open_website");
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

    context.setCurrentAction("Finding search field", "search_input");
    context.emitStep({
      type: "ELEMENT_FOUND",
      step: "search_input",
      action: "Find search field",
      target: QUERY_SELECTOR,
    });
    await browser.waitForSelector(QUERY_SELECTOR);
    await highlightElement(browser, context, QUERY_SELECTOR, "Search field");
    await captureStepScreenshot(browser, context, "search_input");

    context.setCurrentAction(`Typing "${query}"`, "type_query");
    await browser.type(QUERY_SELECTOR, query);
    context.emitStep({
      type: "TYPE",
      step: "type_query",
      action: "Type query",
      target: QUERY_SELECTOR,
      metadata: { text: query },
    });
    await highlightElement(browser, context, QUERY_SELECTOR, `Typing "${query}"`);
    await captureStepScreenshot(browser, context, "type_query");

    context.setCurrentAction("Submitting search", "submit_search");
    context.emitStep({
      type: "ELEMENT_FOUND",
      step: "submit_search",
      action: "Find search button",
      target: SEARCH_SELECTOR,
    });
    await highlightElement(browser, context, SEARCH_SELECTOR, "Click search");
    await browser.click(SEARCH_SELECTOR);
    context.emitStep({
      type: "CLICK",
      step: "submit_search",
      action: "Click search",
      target: SEARCH_SELECTOR,
    });
    await captureStepScreenshot(browser, context, "submit_search");

    context.setCurrentAction("Waiting for results", "wait_results");
    context.emitStep({
      type: "WAIT",
      step: "wait_results",
      action: "Wait for results",
      target: RESULTS_SELECTOR,
    });
    await browser.waitForSelector(RESULTS_SELECTOR);
    await browser.wait(300);
    await captureStepScreenshot(browser, context, "wait_results");

    context.setCurrentAction("Extracting products", "extract_results");
    const products = await browser.extractStructured<ProductSearchOutput["products"]>(
      PRODUCT_CARD_SELECTOR,
      EXTRACT_SCRIPT,
    );
    const limited = products.slice(0, limit).map((product) => ({
      ...product,
      url: product.url.startsWith("http") ? product.url : `${context.baseUrl}${product.url}`,
    }));

    context.emitStep({
      type: "DATA_EXTRACTED",
      step: "extract_results",
      action: "Extract results",
      metadata: { count: limited.length, summary: `${limited.length} products` },
    });
    await captureStepScreenshot(browser, context, "extract_results");

    const output: ProductSearchOutput = { products: limited };

    context.setFlowStage("result");
    context.emitStep({
      type: "STEP_COMPLETED",
      step: "extract_results",
      action: "Extract results",
      metadata: { count: limited.length },
    });
    context.emitStep({
      type: "EXECUTION_COMPLETED",
      step: "result",
      action: "Execution completed",
      metadata: { summary: `${limited.length} products found`, output },
    });
    context.setCurrentAction(null);
    context.setAgentCursor({ visible: false });

    await browser.close();

    return { ok: true, output };
  }
}
