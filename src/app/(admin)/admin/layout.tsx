import type { Metadata } from "next";
import "@/app/globals.css";
import ReduxProvider from "@/lib/redux/ReduxProvider";

export const metadata: Metadata = {
  title: "7alm — Admin Dashboard",
  description: "7alm Admin Dashboard — Manage orders and shipments",
};

/**
 * Admin Layout — English LTR
 */
import AdminLayoutClient from "@/components/admin/dashboard/AdminLayoutClient";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" data-scroll-behavior="smooth">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased font-sans">
        <ReduxProvider>
          <AdminLayoutClient>{children}</AdminLayoutClient>
        </ReduxProvider>
      </body>
    </html>
  );
}
