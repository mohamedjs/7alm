"use client";

import { useProductsManager } from "@/features/products/products.hooks";
import ProductForm from "@/components/admin/products/ProductForm";
import { useRouter } from "next/navigation";

/**
 * /admin/products/create — full-page product creation
 */
export default function CreateProductPage() {
  const router = useRouter();
  const {
    editingProduct,
    formData,
    setFormData,
    saveProduct,
  } = useProductsManager();

  const handleSave = async () => {
    await saveProduct(formData);
    router.push("/admin/products");
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Create Product</h2>
        <p className="text-gray-400">Fill in the details for a new product.</p>
      </div>

      <ProductForm
        formData={formData}
        setFormData={setFormData}
        editingProduct={editingProduct}
        onSave={handleSave}
        onClose={() => router.push("/admin/products")}
      />
    </div>
  );
}
