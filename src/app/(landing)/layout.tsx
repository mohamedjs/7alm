import type { Metadata } from "next";
import "@/app/globals.css";
import ReduxProvider from "@/lib/redux/ReduxProvider";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://7alm.com'),
  title: "حلم | اطلب الآن",
  description: "منتج حلم - أفضل جودة بأفضل سعر. اطلب الآن واحصل على توصيل مجاني",
  keywords: "حلم, 7alm, منتج, مصر, توصيل مجاني",
};

/**
 * Landing Page Layout — Arabic RTL
 */
export default function LandingLayout({
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
        <style dangerouslySetInnerHTML={{ __html: `
          body { background-color: #f9fafb; color: #111827; margin: 0; }
          main { min-height: 100vh; }
        `}} />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
