// Captures the real running app for the product site and the launch video.
// Usage: node scripts/capture-screens.mjs  (needs `next dev -p 3001` + the api running, demo data loaded)
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.APP_URL ?? "http://localhost:3001";
const OUT = process.env.OUT_DIR ?? "site/assets/screens";
const EMAIL = process.env.ADMIN_SEED_EMAIL ?? "admin@7alm.local";
const PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? "ChangeMe-7alm-2026";

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "ar-EG", ignoreHTTPSErrors: true });
const page = await desktop.newPage();

async function shot(name, path, { wait = 1800, before } = {}) {
  if (path) await page.goto(BASE + path, { waitUntil: "networkidle" });
  if (before) await before();
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("✔", name);
}

await shot("store-home", "/", { wait: 3500 });
await shot("landing", "/7alm-smart-bottle", { wait: 3000 });
await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight * 0.45 }));
await shot("landing-checkout", null, { wait: 1200 });
await shot("product", "/product/7alm-leather-wallet", { wait: 2500 });

await page.goto(BASE + "/admin/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.keyboard.press("Enter");
await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 15_000 }).catch(() => undefined);
await page.waitForTimeout(1500);

await shot("admin-dashboard", "/admin", { wait: 3500 });
await shot("admin-orders", "/admin/orders", { wait: 2500 });
await shot("admin-inbox", "/admin/inbox", {
  wait: 1800,
  before: async () => {
    await page.waitForTimeout(1200);
    const first = page.locator("ul li button").first();
    if (await first.count()) await first.click();
  },
});
await shot("admin-comments", "/admin/inbox", {
  before: async () => {
    await page.waitForTimeout(1000);
    await page.getByRole("tab").nth(1).click();
  },
});
await shot("admin-customers", "/admin/customers", { wait: 2500 });
await shot("admin-products", "/admin/products", { wait: 2500 });
await shot("admin-connections", "/admin/connections", { wait: 2000 });
await shot("admin-ai-studio", "/admin/ai-studio", { wait: 2000 });

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-EG", ignoreHTTPSErrors: true });
const m = await mobile.newPage();
await m.goto(BASE + "/7alm-smart-bottle", { waitUntil: "networkidle" });
await m.waitForTimeout(2500);
await m.screenshot({ path: `${OUT}/mobile-landing.png` });
await m.goto(BASE + "/", { waitUntil: "networkidle" });
await m.waitForTimeout(2500);
await m.screenshot({ path: `${OUT}/mobile-store.png` });
console.log("✔ mobile");

await browser.close();
