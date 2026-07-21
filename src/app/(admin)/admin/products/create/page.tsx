"use client";

import { useProductsManager } from "@/features/products/products.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";
import ProductForm from "@/components/admin/products/ProductForm";
import { useRouter } from "next/navigation";

/**
 * /admin/products/create — full-page product creation
 */
export default function CreateProductPage() {
  const router = useRouter();
  const { t } = useLocale();
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
        <h2 className="mb-2 text-2xl font-bold text-text-primary">{t("products.create.title")}</h2>
        <p className="text-text-muted">{t("products.create.subtitle")}</p>
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
