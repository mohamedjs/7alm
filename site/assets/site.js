// Language (AR default / EN) and theme toggles for the 7alm product site.
(function () {
  const en = {
    skip: "Skip to content",
    "nav.features": "Features",
    "nav.inbox": "Inbox",
    "nav.screens": "Screens",
    "nav.arch": "Architecture",
    "nav.deploy": "Deploy",
    "nav.github": "GitHub",
    "hero.pill": "v2 · NestJS · Kafka · Redis · PostgreSQL",
    "hero.title": "Your store, your orders and every customer message… <em>in one place</em>",
    "hero.lead": "7alm is an Arabic-first e-commerce platform for brands that sell from Facebook and Instagram ads: a landing page per product, a full order lifecycle with shipping, and one inbox that answers Messenger, Instagram, WhatsApp and post comments.",
    "hero.watch": "Watch the video",
    "hero.deploy": "Run it on your server",
    "stat.channels": "Meta channels in one inbox",
    "stat.modules": "modules in a modular monolith",
    "stat.services": "production Docker services",
    "demo.title": "47 seconds of 7alm",
    "demo.lead": "Real footage of the running app: the store, a landing page, orders and the inbox.",
    "features.title": "Everything you need to sell",
    "f1.t": "Store and landing pages",
    "f1.d": "An ad-ready page per product at <code>/{slug}</code>, quantity offers (two for a special price), a storefront with categories and cart — Arabic and English, dark and light.",
    "f2.t": "A complete order lifecycle",
    "f2.d": "An order state machine: pending → approved → confirmed → shipped → delivered. Stock is reserved without races, the Bosta shipment is booked on approval, and courier webhooks keep the status live.",
    "f3.t": "A Meta inbox",
    "f3.d": "Messenger, Instagram Direct and the WhatsApp Cloud API on one screen, with WhatsApp numbers linked to the customer and their orders automatically.",
    "f4.t": "Answer comments",
    "f4.d": "Reply publicly to a Facebook or Instagram comment, or send the commenter one private message (within 7 days, as Meta requires), and hide spam in one click.",
    "f5.t": "CRM, coupons and reviews",
    "f5.d": "Customers keyed by phone with their stats, percentage / fixed / free-shipping coupons, and reviews only from verified buyers through a signed link.",
    "f6.t": "AI Studio",
    "f6.d": "Campaigns from Telegram, ad images and videos through OpenRouter, all stored inside 7alm.",
    "inbox.title": "Built on Meta's official docs",
    "inbox.c1": "One webhook for every Meta product, with <code>X-Hub-Signature-256</code> verified on the raw body.",
    "inbox.c2": "200 in well under 5 seconds: the webhook is written to an outbox and processed by the worker through Kafka.",
    "inbox.c3": "Redis de-duplication, because Meta retries deliveries.",
    "inbox.c4": "The 24-hour window: free replies inside it, Human Agent up to 7 days on Messenger and Instagram, an approved template on WhatsApp.",
    "inbox.c5": "Exactly one private reply per comment, within 7 days — enforced in the domain itself.",
    "inbox.c6": "Facebook Login for Business: a long-lived Page token, the linked Instagram account, and the webhook subscription set up automatically.",
    "screens.title": "Inside the app",
    "s.store": "Storefront",
    "s.landing": "Product landing page",
    "s.dashboard": "Dashboard",
    "s.orders": "Orders",
    "s.customers": "Customers",
    "s.products": "Products",
    "arch.title": "Architecture",
    "arch.lead": "A NestJS modular monolith: every module has Domain, Application, Infrastructure and Presentation layers, and modules talk through each other's public API or through events.",
    "deploy.title": "Run it on your server in 3 commands",
    "deploy.lead": "One VPS with Docker and a domain pointing at it. Caddy gets the HTTPS certificate by itself, migrations run before the api starts, and the database is backed up daily.",
  };

  const root = document.documentElement;
  const nodes = [...document.querySelectorAll("[data-i18n]")];
  const ar = Object.fromEntries(nodes.map((n) => [n.dataset.i18n, n.innerHTML]));
  const langBtn = document.getElementById("lang");
  const themeBtn = document.getElementById("theme");
  const save = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch (_) {}
  };

  function applyLang(lang) {
    const dict = lang === "en" ? en : ar;
    nodes.forEach((n) => {
      const v = dict[n.dataset.i18n];
      if (v) n.innerHTML = v;
    });
    root.lang = lang;
    root.dir = lang === "en" ? "ltr" : "rtl";
    document.title = lang === "en" ? "7alm — store and customer messages in one place" : "حلم — متجرك ورسائل عملائك في مكان واحد";
    langBtn.textContent = lang === "en" ? "ع" : "EN";
  }

  applyLang(root.lang === "en" ? "en" : "ar");
  langBtn.addEventListener("click", () => {
    const next = root.lang === "en" ? "ar" : "en";
    applyLang(next);
    save("site-lang", next);
  });

  themeBtn.addEventListener("click", () => {
    const current = root.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    const next = current === "light" ? "dark" : "light";
    root.dataset.theme = next;
    save("site-theme", next);
  });
})();
