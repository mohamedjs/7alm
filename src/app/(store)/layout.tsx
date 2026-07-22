import type { Metadata } from "next";
import "@/app/globals.css";
import ReduxProvider from "@/lib/redux/ReduxProvider";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://7alm.com"),
  title: "حلم | المتجر",
  description: "تسوق أحدث المنتجات من حلم — توصيل لجميع أنحاء مصر",
  keywords: "حلم, 7alm, متجر, تسوق, مصر, توصيل مجاني",
};

/**
 * Store Layout — Arabic RTL, dark "Dynamic Lookbook" storefront.
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
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Critical inline styles — safety net for Safari 15 / iOS 15
            where Tailwind v4's @layer and oklch() may not be supported.
            These ensure the page is never fully blank/invisible. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          body { background-color: #0f172a; color: #e2e8f0; margin: 0; }
          main { min-height: 100vh; }
        `,
          }}
        />
      </head>
      <body className="bg-dark-900 text-gray-100 antialiased">
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
