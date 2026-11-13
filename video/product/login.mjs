// Logs into the local dev admin once (credentials from backend/.env, never written here) and saves
// tour_state.json (git-ignored) with dark theme + Arabic, so tour.mjs films a signed-in admin.
//   node --env-file=../../backend/.env login.mjs
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const c = await b.newContext({ viewport: { width: 1440, height: 810 } });
const p = await c.newPage();
await p.goto('http://localhost:3001/admin/login', { waitUntil: 'load' });
await p.evaluate(() => { for (const k of ['admin-theme', 'store-theme']) localStorage.setItem(k, 'dark'); for (const k of ['admin-locale', 'store-locale']) localStorage.setItem(k, 'ar'); });
await p.fill('input[type="email"]', process.env.ADMIN_SEED_EMAIL);
await p.fill('input[type="password"]', process.env.ADMIN_SEED_PASSWORD);
await p.keyboard.press('Enter');
await p.waitForURL(u => !u.pathname.endsWith('/login'), { timeout: 15000 });
await c.storageState({ path: 'tour_state.json' }); await b.close(); console.log('saved tour_state.json');
