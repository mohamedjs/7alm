import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "7alm — Admin Dashboard",
  description: "7alm Admin Dashboard — Manage orders and shipments",
};

/**
 * Admin Layout — English LTR
 */
import AdminLayoutClient from "@/components/admin/AdminLayoutClient";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-dark-950 text-white antialiased antialiased font-sans">
        <AdminLayoutClient>{children}</AdminLayoutClient>
      </body>
    </html>
  );
}
