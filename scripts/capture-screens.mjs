// Captures the real running app for the product site (dark theme, 2x, cropped to what matters).
// Usage: node --env-file=backend/.env scripts/capture-screens.mjs
//   needs `next dev -p 3001` + the api running and demo data loaded (backend/test/demo-activity.mjs)
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.APP_URL ?? "http://localhost:3001";
const OUT = process.env.OUT_DIR ?? "site/assets/screens";
const EMAIL = process.env.ADMIN_SEED_EMAIL ?? "admin@7alm.local";
const PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? "ChangeMe-7alm-2026";

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const prefs = () => {
  try {
    for (const k of ["admin-theme", "store-theme"]) localStorage.setItem(k, "dark");
    for (const k of ["admin-locale", "store-locale"]) localStorage.setItem(k, "ar");
  } catch {}
};
const hideDevUi = "nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }";

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "ar-EG" });
await desktop.addInitScript(prefs);
const page = await desktop.newPage();

async function open(path, wait = 2500) {
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.addStyleTag({ content: hideDevUi });
  await page.waitForTimeout(wait);
}
async function shot(name, clip) {
  await page.screenshot({ path: `${OUT}/${name}.png`, clip: clip ?? { x: 0, y: 0, width: 1440, height: 900 } });
  console.log("✔", name);
}

// Storefront + landing page
await open("/", 3500);
await shot("store-home");
await open("/7alm-smart-bottle", 3500);
await shot("landing");
const form = page.locator("form").first();
if (await form.count()) {
  await form.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const b = await form.boundingBox();
  await shot("landing-checkout", { x: 0, y: Math.max(0, b.y - 140), width: 1440, height: 900 });
}

// Admin
await page.goto(BASE + "/admin/login", { waitUntil: "load" });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.keyboard.press("Enter");
await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 15_000 }).catch(() => undefined);

await open("/admin", 4000);
await shot("admin-dashboard", { x: 0, y: 90, width: 1440, height: 720 });
await page.setViewportSize({ width: 1680, height: 900 });
await open("/admin/orders", 3000);
const all = page.getByRole("button", { name: /كل الطلبات/ });
if (await all.count()) { await all.first().click(); await page.waitForTimeout(2000); }
await shot("admin-orders", { x: 0, y: 90, width: 1680, height: 720 });
await page.setViewportSize({ width: 1440, height: 900 });
await open("/admin/inbox", 2500);
await page.locator("ul li button").first().click().catch(() => undefined);
await page.waitForTimeout(2000);
await shot("admin-inbox", { x: 0, y: 170, width: 1440, height: 680 });
await page.getByRole("tab").nth(1).click().catch(() => undefined);
await page.waitForTimeout(2000);
await page.locator("ul li button").first().click().catch(() => undefined);
await page.waitForTimeout(1500);
await shot("admin-comments", { x: 0, y: 170, width: 1440, height: 730 });
await open("/admin/customers", 3000);
await shot("admin-customers", { x: 0, y: 90, width: 1440, height: 720 });
await open("/admin/coupons", 2500);
await shot("admin-coupons", { x: 0, y: 90, width: 1440, height: 720 });
await open("/admin/reviews", 2500);
await shot("admin-reviews", { x: 0, y: 90, width: 1440, height: 720 });

// Phones
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "ar-EG" });
await mobile.addInitScript(prefs);
const m = await mobile.newPage();
for (const [name, path] of [["mobile-landing", "/7alm-smart-bottle"], ["mobile-store", "/"]]) {
  await m.goto(BASE + path, { waitUntil: "load" });
  await m.addStyleTag({ content: hideDevUi });
  await m.waitForTimeout(3000);
  await m.screenshot({ path: `${OUT}/${name}.png` });
  console.log("✔", name);
}
await browser.close();
