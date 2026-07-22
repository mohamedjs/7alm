"use client";

import { useProductsManager } from "@/features/products/products.hooks";
import { useUpdateProductMutation } from "@/features/products/products.api";
import { useRealtime } from "@/features/realtime/realtime.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";
import ProductList from "@/components/admin/products/ProductList";
import Link from "next/link";

export default function ProductsPage() {
  const { t } = useLocale();
  const {
    products,
    isLoading,
    refetch,
    removeProduct,
  } = useProductsManager();

  const [updateProduct] = useUpdateProductMutation();

  // Realtime: auto-refresh on any change to the products table
  useRealtime("products", { event: "*", onEvent: () => refetch() });

  return (
    <div>
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-text-primary">
            {t("products.title")}
          </h2>
          <p className="text-text-muted">
            {t("products.subtitle")}
          </p>
        </div>
        <Link
          href="/admin/products/create"
          className="w-full rounded-xl bg-brand-500 px-5 py-2.5 text-center text-sm font-bold text-white transition-all sm:w-auto neu-btn"
        >
          {t("products.add")}
        </Link>
      </div>

      <ProductList
        products={products}
        isLoading={isLoading}
        onEdit={(product) => window.location.assign(`/admin/products/edit/${product.id}`)}
        onDelete={async (id) => {
          try {
            await removeProduct(id);
          } catch (err: unknown) {
            const message =
              err instanceof Error
                ? err.message
                : t("products.deleteFailed");
            alert(message);
          }
        }}
        onToggleFeatured={async (id, featured) => {
          try {
            await updateProduct({ id, is_featured: featured }).unwrap();
          } catch (err: unknown) {
            const message =
              err instanceof Error
                ? err.message
                : t("products.deleteFailed");
            alert(message);
          }
        }}
      />
    </div>
  );
}
