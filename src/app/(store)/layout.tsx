import type { Metadata } from "next";
import "@/app/globals.css";
import ReduxProvider from "@/lib/redux/ReduxProvider";
import { LocaleProvider } from "@/features/i18n/i18n.hooks";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://7alm.com"),
  title: "حلم | المتجر",
  description: "تسوق أحدث المنتجات من حلم — توصيل لجميع أنحاء مصر",
  keywords: "حلم, 7alm, متجر, تسوق, مصر, توصيل مجاني",
};

/**
 * Store Layout — bilingual (Arabic default / English available),
 * direction-aware (RTL default / LTR available), theme-aware
 * (light default / dark available) via runtime toggles.
 * Third independent root layout (siblings: `(landing)/layout.tsx`,
 * `(admin)/admin/layout.tsx`) per Next.js's documented "multiple root
 * layouts" pattern for route groups with disjoint chrome/direction needs.
 */
export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: the inline scripts below mutate this
    // element's classList/dir/lang synchronously before React hydrates,
    // so the server-rendered attributes and the pre-hydration DOM
    // legitimately differ for those attributes. Without this flag React
    // logs a hydration mismatch warning for a change that is intentional
    // and correct (no-FOUC strategy, matching admin layout pattern).
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" className="store-tokens" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/*
          No-FOUC theme init: a tiny blocking inline script, run before
          first paint, that reads the persisted theme preference
          (localStorage "store-theme") and adds the "dark" class on
          <html> synchronously ONLY when it is explicitly "dark". Unlike
          the admin script (which follows the OS preference when unset),
          the store is light-first: an unset preference stays light.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("store-theme");if(t==="dark"){document.documentElement.classList.add("dark");}}catch(e){}})();`,
          }}
        />
        {/*
          No-FOUC locale init: mirrors the theme script above, but for
          language/direction. Default when unset is "ar"/"rtl" — matching
          the <html> attributes above — so this script only needs to act
          when the user has explicitly opted into English previously.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem("store-locale");if(l==="en"){document.documentElement.lang="en";document.documentElement.dir="ltr";}}catch(e){}})();`,
          }}
        />
        {/* Critical inline styles — safety net for Safari 15 / iOS 15
            where Tailwind v4's @layer and oklch() may not be supported.
            These ensure the page is never fully blank/invisible. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          body { background-color: #ecebf6; color: #111827; margin: 0; }
          main { min-height: 100vh; }
        `,
          }}
        />
      </head>
      <body className="bg-surface text-text-primary antialiased transition-colors">
        <ReduxProvider>
          <LocaleProvider storageKey="store-locale">
            {children}
          </LocaleProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
