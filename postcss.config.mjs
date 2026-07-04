const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // Tailwind v4 outputs oklch()/color-mix() colors, which require
    // Safari 16.2+ / Chrome 111+. These plugins convert them to rgb()
    // fallbacks (wrapped in @supports for progressive enhancement) so
    // the site still renders correctly on older WebKit browsers, e.g.
    // Safari/Chrome on iPhone 7 Plus (capped at iOS 15 / Safari 15).
    "@csstools/postcss-color-mix-function": {},
    "@csstools/postcss-oklab-function": {},
  },
};

export default config;
