"use client";

import { useProductsManager } from "@/features/products/products.hooks";
import ProductList from "@/components/admin/products/ProductList";
import Link from "next/link";

export default function ProductsPage() {
  const {
    products,
    isLoading,
    removeProduct,
  } = useProductsManager();

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Products Management
          </h2>
          <p className="text-gray-500">
            Add, update, or remove products from the store.
          </p>
        </div>
        <Link
          href="/admin/products/create"
          className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg text-sm transition-all font-bold"
        >
          + Add Product
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
                : "Failed to delete product.";
            alert(message);
          }
        }}
      />
    </div>
  );
}
