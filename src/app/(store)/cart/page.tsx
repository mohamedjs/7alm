import type { Metadata } from "next";
import { categoryService } from "@/features/categories/categories.service";
import StoreNavbar from "@/components/store/master/StoreNavbar";
import StoreFooter from "@/components/store/master/StoreFooter";
import CartPageBody from "@/components/store/cart/CartPageBody";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "السلة | حلم",
  description: "راجع سلة مشترياتك في حلم",
};

export default async function CartPage() {
  const categories = await categoryService.getActiveCategories();

  return (
    <main className="min-h-screen">
      <StoreNavbar categories={categories} />
      <div className="container mx-auto px-6 pt-32 pb-20 lg:pt-44">
        <CartPageBody />
      </div>
      <StoreFooter />
    </main>
  );
}
