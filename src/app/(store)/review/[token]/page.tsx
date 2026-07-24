import type { Metadata } from "next";
import { categoryService } from "@/features/categories/categories.service";
import StoreNavbar from "@/components/store/master/StoreNavbar";
import StoreFooter from "@/components/store/master/StoreFooter";
import ReviewSubmitForm from "@/components/store/review/ReviewSubmitForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "قيّم تجربتك | حلم",
  description: "شاركنا رأيك في المنتج الذي اشتريته",
};

interface PageProps {
  params: Promise<{ token: string }>;
}

/**
 * Verified-buyer review landing — `/review/{token}`, the link sent via the
 * post-delivery WhatsApp notification. The token is opaque and only ever
 * consumed by `POST /api/reviews`; this page never resolves the product,
 * it just renders the submission form (spec: "keep it simple — the token
 * carries identity").
 */
export default async function ReviewTokenPage({ params }: PageProps) {
  const { token } = await params;
  const categories = await categoryService.getActiveCategories();

  return (
    <main className="min-h-screen bg-surface transition-colors">
      <StoreNavbar categories={categories} />
      <div className="container mx-auto px-6 pt-32 pb-20 lg:pt-44">
        <ReviewSubmitForm token={token} />
      </div>
      <StoreFooter />
    </main>
  );
}
