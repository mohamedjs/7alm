import type { Metadata } from "next";
import PlanBoard from "@/components/store/plan/PlanBoard";

export const metadata: Metadata = {
  title: "Revenue Board | 7alm",
  description: "8-week revenue plan — pinned.",
  // Internal strategy board, not a storefront page: keep it out of search
  // results and sitemaps even though it sits in the public (store) group.
  robots: { index: false, follow: false },
};

export default function PlanPage() {
  return <PlanBoard />;
}
