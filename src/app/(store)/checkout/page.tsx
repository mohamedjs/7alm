import type { Metadata } from "next";
import { categoryService } from "@/features/categories/categories.service";
import StoreNavbar from "@/components/store/master/StoreNavbar";
import StoreFooter from "@/components/store/master/StoreFooter";
import StoreCheckoutForm from "@/components/store/cart/StoreCheckoutForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "إتمام الطلب | حلم",
  description: "أكمل بيانات التوصيل والدفع عند الاستلام",
};

export default async function CheckoutPage() {
  const categories = await categoryService.getActiveCategories();

  return (
    <main className="min-h-screen">
      <StoreNavbar categories={categories} />
      <div className="container mx-auto px-6 pt-32 pb-20 lg:pt-44">
        <StoreCheckoutForm />
      </div>
      <StoreFooter />
    </main>
  );
}
