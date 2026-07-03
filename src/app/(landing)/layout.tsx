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
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
