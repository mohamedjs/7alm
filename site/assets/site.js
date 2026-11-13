// Language (AR default / EN) and theme (dark default / light) toggles for the 7alm product site.
(function () {
  const en = {
    skip: "Skip to content",
    "nav.inbox": "Inbox",
    "nav.comments": "Comments",
    "nav.page": "Product page",
    "nav.orders": "Orders",
    "nav.cta": "Talk to us",
    "hero.pill": "For brands that sell on Facebook and Instagram",
    "hero.title": "Your customers message you from everywhere…<br /><em>answer them all from one place</em>",
    "hero.lead": "7alm brings Messenger, Instagram, WhatsApp and post comments into one screen, gives every product its own sales page, and follows each order from the moment it is placed until it is delivered.",
    "hero.cta": "Start with 7alm",
    "hero.more": "See the features",
    "ch.messenger": "Messenger",
    "ch.instagram": "Instagram",
    "ch.whatsapp": "WhatsApp",
    "ch.comments": "Post comments",
    n1: "screen for every message and comment",
    n2: "messages arrive the moment they are sent",
    n3: "messages or comments missed",
    n4: "languages: Arabic and English, dark and light",
    "video.k": "A minute with 7alm",
    "video.t": "See 7alm in action",
    "inbox.k": "Inbox",
    "inbox.t": "Messenger, Instagram and WhatsApp… in one conversation list",
    "inbox.d": "Instead of three apps, every message lands here instantly, labelled with the channel it came from. Reply from the same screen and see who is still waiting for an answer.",
    "inbox.p1t": "Live messages",
    "inbox.p1d": "Conversations update in front of you, no refresh needed.",
    "inbox.p2t": "Unread counters",
    "inbox.p2d": "See at a glance who wrote and has not had a reply.",
    "inbox.p3t": "Customer and orders",
    "inbox.p3d": "WhatsApp numbers are linked to the customer and their orders.",
    "inbox.p4t": "Search and filters",
    "inbox.p4d": "By channel, by name, or open and closed chats.",
    "comments.k": "Comments",
    "comments.t": "“How much?” under your post… never left unanswered",
    "comments.d": "Every comment on your Facebook and Instagram posts in one list. Reply publicly for everyone to see, send the commenter a private message in one click, and hide spam without deleting it.",
    "comments.c1": "Public reply or private message",
    "comments.c2": "A “needs reply” filter so nobody is forgotten",
    "comments.c3": "Hide annoying comments in one click",
    "page.k": "Product page",
    "page.t": "A sales page for every product, ready for your ads",
    "page.d": "The customer taps the ad, sees the photos, price and discount, and orders in one step with cash on delivery. Shipping is priced for their area straight away.",
    "page.c1": "Quantity offers: two for a special price",
    "page.c2": "Coupons: percentage, fixed amount or free shipping",
    "page.c3": "A full store with categories and cart, Arabic and English",
    "orders.k": "Orders and shipping",
    "orders.t": "From “Order now” to the customer's door",
    "orders.d": "Every order arrives with the customer's details, their area and the ad they came from. Approve with one click to book the shipment, and the status updates itself until delivery.",
    "flow.1": "New order",
    "flow.2": "Approved",
    "flow.3": "Customer confirms",
    "flow.4": "Shipped",
    "flow.5": "Delivered",
    "dash.k": "Dashboard",
    "dash.t": "Your numbers, every day",
    "dash.d": "Revenue, orders, average order value, and your best-selling products and areas. Know what works and spend on the ads that bring sales.",
    "more.t": "And also…",
    "m1.t": "Customers by phone number",
    "m1.d": "Each customer with their order count, total spent and last order.",
    "m2.t": "Real reviews",
    "m2.d": "After delivery the customer gets a link to review, so every review comes from a real buyer.",
    "m3.t": "Coupons",
    "m3.d": "Percentage, fixed amount or free shipping, with usage limits and an expiry date.",
    "m4.t": "WhatsApp updates",
    "m4.d": "Customers follow their order status on WhatsApp.",
    "m5.t": "Automatic shipping",
    "m5.d": "The shipment is booked with the courier the moment you approve the order.",
    "m6.t": "Arabic and English",
    "m6.d": "Store and dashboard in Arabic and English, in dark and light mode.",
    "cta.t": "Ready to stop losing customers?",
    "cta.d": "Message us on Messenger and we will set up your store and inbox.",
    "cta.b": "Message us on Messenger",
    footer: "© 2026 7alm — your store and your customers in one place",
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
    document.title = lang === "en" ? "7alm — sell more and answer every customer from one place" : "حلم — بيع أكتر ورد على كل عملائك من مكان واحد";
    langBtn.textContent = lang === "en" ? "ع" : "EN";
  }

  applyLang(root.lang === "en" ? "en" : "ar");
  langBtn.addEventListener("click", () => {
    const next = root.lang === "en" ? "ar" : "en";
    applyLang(next);
    save("site-lang", next);
  });

  themeBtn.addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    save("site-theme", next);
  });
})();
