import type { Metadata } from "next";
import { categoryService } from "@/features/categories/categories.service";
import StoreNavbar from "@/components/store/StoreNavbar";
import StoreFooter from "@/components/store/StoreFooter";
import CartPageBody from "@/components/store/CartPageBody";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "السلة | حلم",
  description: "راجع سلة مشترياتك في حلم",
};

export default async function CartPage() {
  const categories = await categoryService.getActiveCategories();

  return (
    <main className="min-h-screen bg-dark-900">
      <StoreNavbar categories={categories} />
      <div className="container mx-auto px-6 pt-32 pb-20 lg:pt-44">
        <h1 className="font-heading text-3xl lg:text-4xl font-extrabold text-white mb-10">
          السلة
        </h1>
        <CartPageBody />
      </div>
      <StoreFooter />
    </main>
  );
}
