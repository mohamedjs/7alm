import type { Metadata } from "next";
import "@/app/globals.css";
import ReduxProvider from "@/lib/redux/ReduxProvider";
import { LocaleProvider } from "@/features/i18n/i18n.hooks";

export const metadata: Metadata = {
  title: "7alm — Admin Dashboard",
  description: "7alm Admin Dashboard — Manage orders and shipments",
};

/**
 * Admin Layout — bilingual (Arabic default / English available),
 * direction-aware (RTL default / LTR available) via a runtime toggle.
 * See src/features/i18n/i18n.hooks.tsx (useLocale) for the toggle itself.
 */
import AdminLayoutClient from "@/components/admin/dashboard/AdminLayoutClient";

export default function AdminLayout({
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
    // and correct (no-FOUC strategy, theme from 004 + locale from 006).
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/*
          No-FOUC theme init (T004): a tiny blocking inline script, run
          before first paint, that reads the persisted theme preference
          (localStorage "admin-theme") — falling back to the OS
          prefers-color-scheme — and applies/removes the "dark" class on
          <html> synchronously. Chosen over suppressHydrationWarning-only
          or a useLayoutEffect because those still allow one light-mode
          frame to paint before JS runs; a blocking <head> script is the
          only approach that guarantees zero flash. Scoped to the admin
          root only — (landing) pages don't render this layout.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("admin-theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d){document.documentElement.classList.add("dark");}}catch(e){}})();`,
          }}
        />
        {/*
          No-FOUC locale init (006-admin-i18n-rtl-toggle): mirrors the
          theme script above, but for language/direction. Unlike theme
          (which falls back to OS preference), locale's default when
          unset is "ar"/"rtl" — matching the public storefront's default
          language — so <html> above is already correct for the
          first-ever visit and this script only needs to act when the
          admin has explicitly opted into English previously.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem("admin-locale");if(l==="en"){document.documentElement.lang="en";document.documentElement.dir="ltr";}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-gray-50 dark:bg-surface text-gray-900 dark:text-text-primary antialiased font-sans transition-colors">
        <ReduxProvider>
          <LocaleProvider>
            <AdminLayoutClient>{children}</AdminLayoutClient>
          </LocaleProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
