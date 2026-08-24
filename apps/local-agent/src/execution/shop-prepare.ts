import type { Page } from "playwright";
import { log } from "../logger.js";
import { pickBestValueCandidate, type ShopCandidate } from "./shop-pick.js";

const BUY_NOW = [/바로\s*구매/, /바로구매/];
const CART_ADD = [/장바구니\s*담기/];
const AGREE = [/모두\s*동의/, /전체\s*동의/, /약관\s*동의/];
const PAY = [/동의하고\s*결제/, /결제하기/, /주문\s*결제/, /구매하기/];

export function isPaymentNavigation(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /checkout|payment|pay\.coupang|order\/pay|billing|3d.?secure/i.test(
      `${parsed.hostname}${parsed.pathname}${parsed.search}`,
    );
  } catch {
    return true;
  }
}

async function dismissNoise(page: Page): Promise<void> {
  const labels = ["동의", "확인", "닫기", "오늘 하루 안 보기", "나중에"];
  for (const label of labels) {
    const btn = page.getByRole("button", { name: label }).first();
    try {
      if (await btn.isVisible({ timeout: 500 })) {
        await btn.click({ timeout: 1_200 });
      }
    } catch {
      /* ignore */
    }
  }
}

async function hasCaptcha(page: Page): Promise<boolean> {
  const frame = page.locator(
    'iframe[src*="captcha"], iframe[src*="recaptcha"], iframe[title*="captcha" i]',
  );
  return (await frame.count()) > 0;
}

async function hasHumanAuthGate(page: Page): Promise<boolean> {
  if (await hasCaptcha(page)) {
    return true;
  }
  const title = await page.title().catch(() => "");
  const visible = await page.locator("body").innerText().catch(() => "");
  const blob = `${page.url()} ${title} ${visible.slice(0, 6_000)}`;
  if (
    /3d.?secure|nicepay|inicis|tosspayments|인증번호|보안카드|앱에서\s*승인|휴대폰\s*인증/i.test(
      blob,
    )
  ) {
    return true;
  }
  const pw = page.locator(
    'input[type="password"], input[autocomplete="cc-csc"], input[name*="cvv" i]',
  );
  try {
    const n = await pw.count();
    for (let i = 0; i < n; i += 1) {
      const el = pw.nth(i);
      if (await el.isVisible()) {
        const value = await el.inputValue().catch(() => "");
        if (!value) {
          return true;
        }
      }
    }
  } catch {
    /* ignore */
  }
  return false;
}

async function clickFirstVisibleText(
  page: Page,
  patterns: readonly RegExp[],
): Promise<boolean> {
  for (const pattern of patterns) {
    const loc = page.getByText(pattern).first();
    try {
      if (await loc.isVisible({ timeout: 2_200 })) {
        await loc.click({ timeout: 6_000 });
        return true;
      }
    } catch {
      /* next */
    }
  }
  return false;
}

async function scrapeSearchCards(page: Page): Promise<ShopCandidate[]> {
  return page.evaluate(() => {
    const parsePrice = (text: string): number => {
      const won = text.match(/(\d{1,3}(?:,\d{3})+|\d{4,8})\s*원/);
      if (won?.[1]) {
        return Number(won[1].replace(/,/g, ""));
      }
      const plain = text.match(/(?:₩|\\)\s*(\d{1,3}(?:,\d{3})+)/);
      if (plain?.[1]) {
        return Number(plain[1].replace(/,/g, ""));
      }
      return 0;
    };
    const parseRating = (text: string): number | null => {
      const star = text.match(/(?:별점|평점)\s*(\d(?:\.\d)?)/);
      if (star?.[1]) {
        return Number(star[1]);
      }
      const loose = text.match(/(\d(?:\.\d)?)\s*점/);
      if (loose?.[1]) {
        const n = Number(loose[1]);
        return n >= 1 && n <= 5 ? n : null;
      }
      return null;
    };
    const parseReviews = (text: string): number => {
      const m = text.match(
        /(?:\(|（)?\s*(\d{1,3}(?:,\d{3})*|\d+)\s*(?:개\s*)?(?:상품평|리뷰|건)/,
      );
      if (m?.[1]) {
        return Number(m[1].replace(/,/g, ""));
      }
      return 0;
    };

    const seen = new Set<string>();
    const cards: Array<{
      href: string;
      price: number;
      rating: number | null;
      reviewCount: number;
      rocket: boolean;
    }> = [];
    const anchors = document.querySelectorAll('a[href*="/vp/products/"]');
    for (const node of anchors) {
      const a = node as HTMLAnchorElement;
      const href = a.href;
      if (!href || seen.has(href)) {
        continue;
      }
      seen.add(href);
      const root =
        a.closest("li, article, section") ?? a.parentElement ?? a;
      const text = (root.textContent ?? "").replace(/\s+/g, " ").slice(0, 800);
      const price = parsePrice(text);
      if (!price) {
        continue;
      }
      cards.push({
        href,
        price,
        rating: parseRating(text),
        reviewCount: parseReviews(text),
        rocket: /로켓/.test(text),
      });
      if (cards.length >= 40) {
        break;
      }
    }
    return cards;
  });
}

async function openPickedProduct(page: Page): Promise<boolean> {
  await page.locator('a[href*="/vp/products/"]').first().waitFor({
    state: "visible",
    timeout: 18_000,
  });
  const cards = await scrapeSearchCards(page);
  const pick = pickBestValueCandidate(cards);
  log(
    "SHOP",
    pick
      ? `Pick ${pick.price}원 rating=${pick.rating ?? "-"} reviews=${pick.reviewCount}`
      : "No priced cards — first product",
  );
  if (pick) {
    const idMatch = pick.href.match(/products\/(\d+)/);
    const loc = idMatch
      ? page.locator(`a[href*="/vp/products/${idMatch[1]}"]`).first()
      : page.locator(`a[href="${pick.href}"]`).first();
    try {
      await loc.click({ timeout: 8_000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 25_000 });
      return true;
    } catch {
      /* fall through */
    }
  }
  try {
    await page.locator('a[href*="/vp/products/"]').first().click({ timeout: 8_000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 25_000 });
    return true;
  } catch {
    return false;
  }
}

async function tickAgreeBoxes(page: Page): Promise<void> {
  const boxes = page.getByRole("checkbox");
  const n = await boxes.count().catch(() => 0);
  for (let i = 0; i < Math.min(n, 12); i += 1) {
    const box = boxes.nth(i);
    try {
      if (await box.isVisible({ timeout: 400 }) && !(await box.isChecked())) {
        await box.check({ timeout: 1_500 }).catch(async () => {
          await box.click({ timeout: 1_500 });
        });
      }
    } catch {
      /* next */
    }
  }
  await clickFirstVisibleText(page, AGREE);
}

async function proceedToReview(page: Page): Promise<string> {
  const buyNow = await clickFirstVisibleText(page, BUY_NOW);
  if (!buyNow) {
    await clickFirstVisibleText(page, CART_ADD);
    const cartGo = page.getByText(/장바구니\s*가기|바로구매/);
    try {
      if (await cartGo.first().isVisible({ timeout: 2_500 })) {
        await cartGo.first().click({ timeout: 4_000 });
      }
    } catch {
      /* stay */
    }
  }

  await page.waitForLoadState("domcontentloaded", { timeout: 25_000 }).catch(() => undefined);
  await dismissNoise(page);

  if (await hasHumanAuthGate(page)) {
    log("SHOP", "Auth/captcha/3DS — human");
    return "awaiting_human_auth";
  }

  await tickAgreeBoxes(page);
  log("SHOP", "Review ready — waiting for user approval before pay");
  return "awaiting_user_approval";
}

export async function completeCheckoutAfterApproval(page: Page): Promise<string> {
  if (await hasHumanAuthGate(page)) {
    return "awaiting_human_auth";
  }
  const paid = await clickFirstVisibleText(page, PAY);
  if (!paid) {
    log("SHOP", "Pay button not found — page left open");
    return "checkout_open";
  }

  await page.waitForLoadState("domcontentloaded", { timeout: 25_000 }).catch(() => undefined);

  if (await hasHumanAuthGate(page)) {
    log("SHOP", "Pay clicked — bank/3DS needs human");
    return "awaiting_human_auth";
  }

  const url = page.url();
  if (/complete|thank|order.*success|주문완료|결제완료/i.test(url + (await page.title()))) {
    return "order_submitted";
  }
  log("SHOP", "Pay control clicked — confirm on PC if asked");
  return "pay_clicked";
}

export async function prepareShopOnPage(
  page: Page,
  input: { url: string; query?: string },
): Promise<{ url: string; message: string }> {
  log("SHOP", `Search ${input.query?.trim() || input.url}`);
  await page.goto(input.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await dismissNoise(page);

  if (await hasCaptcha(page)) {
    log("SHOP", "Captcha — waiting for human");
    return { url: page.url(), message: "awaiting_human_captcha" };
  }

  const opened = await openPickedProduct(page);
  if (!opened) {
    log("SHOP", "Search open — no product click");
    return { url: page.url(), message: "search_open" };
  }

  if (await hasHumanAuthGate(page)) {
    return { url: page.url(), message: "awaiting_human_auth" };
  }

  const message = await proceedToReview(page);
  return { url: page.url(), message };
}
