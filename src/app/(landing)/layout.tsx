import type { Metadata } from "next";

export const metadata: Metadata = {
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
    <html lang="ar" dir="rtl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-dark-950 text-white antialiased">{children}</body>
    </html>
  );
}
