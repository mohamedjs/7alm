"use client";

import ProductsManager from "@/components/admin/ProductsManager";

export default function ProductsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Products Management</h2>
          <p className="text-gray-400">Add, update, or remove products from the store.</p>
        </div>
      </div>
      <ProductsManager />
    </div>
  );
}
