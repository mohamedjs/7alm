import type { Metadata } from "next";
import "./globals.css";
import ReduxProvider from "@/lib/redux/ReduxProvider";

export const metadata: Metadata = {
  title: "حلم | 7alm",
  description: "منتج حلم - أفضل جودة بأفضل سعر",
};

/**
 * Root layout — minimal wrapper.
 * Actual lang/dir is set in route group layouts.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ReduxProvider>{children}</ReduxProvider>;
}
