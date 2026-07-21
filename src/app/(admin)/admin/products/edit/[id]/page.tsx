"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProductsManager } from "@/features/products/products.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";
import ProductForm from "@/components/admin/products/ProductForm";
import type { ProductInput } from "@/features/products/products.api";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { t } = useLocale();

  const {
    products,
    isLoading,
    editingProduct,
    setEditingProduct,
    formData,
    setFormData,
    saveProduct,
  } = useProductsManager();

  useEffect(() => {
    if (!isLoading && products.length > 0) {
      const product = products.find(p => p.id === id);
      if (product) {
        setEditingProduct(product);
        setFormData(product as ProductInput);
      } else {
        router.push("/admin/products");
      }
    }
  }, [isLoading, products, id, setEditingProduct, setFormData, router]);

  const handleSave = async () => {
    await saveProduct(formData);
    router.push("/admin/products");
  };

  if (isLoading || !editingProduct) {
    return <div className="p-8 text-text-muted">{t("products.loadingData")}</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="mb-2 text-2xl font-bold text-text-primary">{t("products.edit.title")}</h2>
        <p className="text-text-muted">{t("products.edit.subtitle")}</p>
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
