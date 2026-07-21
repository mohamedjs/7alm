"use client";

import type { ProductInput } from "@/features/products/products.api";
import type { Product } from "@/features/products/products.api";
import type { QuantityPriceTier } from "@/features/shared/types";
import { useMediaUpload } from "@/features/media/media.hooks";
import { useGetCategoriesQuery } from "@/features/categories/categories.api";
import { useLocale } from "@/features/i18n/i18n.hooks";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";

interface ProductFormProps {
  formData: ProductInput;
  setFormData: (data: ProductInput) => void;
  editingProduct: Product | null;
  onSave: (data: ProductInput) => Promise<void>;
  onClose: () => void;
}

export default function ProductForm({
  formData,
  setFormData,
  editingProduct,
  onSave,
  onClose,
}: ProductFormProps) {
  const { t } = useLocale();
  const { upload, uploading } = useMediaUpload();
  const { data: categories = [] } = useGetCategoriesQuery();

  // Media previews
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    // Revoke local object URLs on unmount to avoid memory leaks
    return () => {
      Object.values(localPreviews).forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [localPreviews]);

  // Derived categories
  const topCategories = useMemo(() => categories.filter(c => !c.parent_id), [categories]);
  
  // Find current parent category (if any) based on category_id
  const currentCategory = useMemo(() => categories.find(c => c.id === formData.category_id), [categories, formData.category_id]);
  const initialParentId = currentCategory?.parent_id || currentCategory?.id || "";
  
  const [selectedParentId, setSelectedParentId] = useState<string>(initialParentId);

  const subCategories = useMemo(() => categories.filter(c => c.parent_id === selectedParentId), [categories, selectedParentId]);

  const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const parentId = e.target.value;
    setSelectedParentId(parentId);
    setFormData({ ...formData, category_id: parentId || null }); // Default to parent if no sub selected
  };

  const handleSubChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subId = e.target.value;
    if (subId) {
      setFormData({ ...formData, category_id: subId });
    } else {
      setFormData({ ...formData, category_id: selectedParentId || null });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave(formData);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("products.form.saveFailed");
      alert(message);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "main_image" | "video_url" | "gallery"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create local preview immediately
    const localUrl = URL.createObjectURL(file);
    setLocalPreviews(prev => ({ ...prev, [file.name]: localUrl }));

    // For gallery, we might want to store local URL temporarily in form data to show preview while uploading,
    // but to keep it simple, we just show it below. Let's wait for upload to finish.

    try {
      const url = await upload(file);
      if (field === "gallery") {
        setFormData({
          ...formData,
          gallery: [...(formData.gallery || []), url],
        });
      } else {
        setFormData({ ...formData, [field]: url });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("products.form.uploadFailed");
      alert(message);
    }
  };

  // --- Quantity-Tier Pricing Management ---
  const quantityPrices: QuantityPriceTier[] = formData.quantity_prices || [];

  const addQuantityTier = () => {
    const nextMin = quantityPrices.length === 0
      ? 1
      : Math.max(...quantityPrices.map((t) => t.min_quantity)) + 1;
    const newTier: QuantityPriceTier = {
      min_quantity: nextMin,
      price: 0,
      compare_at_price: null,
      label: nextMin === 1 ? "قطعة واحدة" : `${nextMin} قطع`,
      is_special: nextMin > 1,
    };
    setFormData({
      ...formData,
      quantity_prices: [...quantityPrices, newTier].sort(
        (a, b) => a.min_quantity - b.min_quantity
      ),
    });
  };

  const updateQuantityTier = (
    index: number,
    field: keyof QuantityPriceTier,
    value: string | number | boolean | null
  ) => {
    const updated = quantityPrices.map((t, i) =>
      i === index ? { ...t, [field]: value } : t
    );
    setFormData({
      ...formData,
      quantity_prices: updated.sort((a, b) => a.min_quantity - b.min_quantity),
    });
  };

  const removeQuantityTier = (index: number) => {
    setFormData({
      ...formData,
      quantity_prices: quantityPrices.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="bg-white dark:bg-surface-raised border border-gray-200 dark:border-border rounded-2xl w-full p-6 shadow-xl relative">
      <h3 className="text-xl font-bold text-gray-900 dark:text-text-primary mb-6">
        {editingProduct ? t("products.form.editTitle") : t("products.form.addTitle")}
      </h3>
      
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
              {t("products.form.name")}
            </label>
            <input
              required
              type="text"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full bg-white dark:bg-surface border border-gray-300 dark:border-border rounded-lg px-4 py-2 text-gray-900 dark:text-text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
              {t("products.form.slug")}
            </label>
            <input
              required
              type="text"
              value={formData.slug || ""}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              dir="ltr"
              className="w-full bg-white dark:bg-surface border border-gray-300 dark:border-border rounded-lg px-4 py-2 text-gray-900 dark:text-text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
              {t("products.form.parentCategory")}
            </label>
            <select
              value={selectedParentId}
              onChange={handleParentChange}
              className="w-full bg-white dark:bg-surface border border-gray-300 dark:border-border rounded-lg px-4 py-2 text-gray-900 dark:text-text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            >
              <option value="">{t("products.form.selectParent")}</option>
              {topCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name_en} ({cat.name_ar})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
              {t("products.form.subcategory")}
            </label>
            <select
              value={formData.category_id || selectedParentId || ""}
              onChange={handleSubChange}
              disabled={!selectedParentId || subCategories.length === 0}
              className="w-full bg-white dark:bg-surface border border-gray-300 dark:border-border rounded-lg px-4 py-2 text-gray-900 dark:text-text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none disabled:bg-gray-100 dark:disabled:bg-surface"
            >
              <option value="">{t("products.form.selectSubcategory")}</option>
              {subCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name_en} ({cat.name_ar})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
            {t("products.form.description")}
          </label>
          <textarea
            rows={3}
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full bg-white dark:bg-surface border border-gray-300 dark:border-border rounded-lg px-4 py-2 text-gray-900 dark:text-text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
              {t("products.form.price")}
            </label>
            <input
              required
              type="number"
              step="0.01"
              value={formData.price || 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price: parseFloat(e.target.value),
                })
              }
              className="w-full bg-white dark:bg-surface border border-gray-300 dark:border-border rounded-lg px-4 py-2 text-gray-900 dark:text-text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
              {t("products.form.comparePrice")}
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.compare_at_price || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  compare_at_price: e.target.value
                    ? parseFloat(e.target.value)
                    : null,
                })
              }
              className="w-full bg-white dark:bg-surface border border-gray-300 dark:border-border rounded-lg px-4 py-2 text-gray-900 dark:text-text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
              {t("products.form.sku")}
            </label>
            <input
              type="text"
              value={formData.sku || ""}
              onChange={(e) =>
                setFormData({ ...formData, sku: e.target.value })
              }
              dir="ltr"
              className="w-full bg-white dark:bg-surface border border-gray-300 dark:border-border rounded-lg px-4 py-2 text-gray-900 dark:text-text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>

        {/* Quantity-Tier Pricing */}
        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-border">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-gray-900 dark:text-text-primary font-medium">{t("products.form.tierPricingTitle")}</h4>
              <p className="text-xs text-gray-500 dark:text-text-muted mt-0.5">
                {t("products.form.tierPricingSubtitle")}
              </p>
            </div>
            <button
              type="button"
              onClick={addQuantityTier}
              className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              {t("products.form.addTier")}
            </button>
          </div>

          {quantityPrices.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-text-muted italic py-2">
              {t("products.form.noTiers")}
            </p>
          ) : (
            <div className="space-y-2">
              {quantityPrices.map((tier, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-end bg-gray-50 dark:bg-surface border border-gray-200 dark:border-border rounded-lg p-3"
                >
                  {/* Min Quantity */}
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 dark:text-text-muted mb-1">{t("products.form.minQty")}</label>
                    <input
                      type="number"
                      min={1}
                      value={tier.min_quantity}
                      onChange={(e) =>
                        updateQuantityTier(
                          index,
                          "min_quantity",
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="w-full bg-white dark:bg-surface-raised border border-gray-300 dark:border-border rounded-lg px-2 py-1.5 text-sm text-gray-900 dark:text-text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  {/* Label — this is product DATA (the tier's Arabic display label), not UI chrome, so its value is never translated; only the field's own <label> text above is. */}
                  <div className="col-span-3">
                    <label className="block text-xs text-gray-600 dark:text-text-muted mb-1">{t("products.form.labelAr")}</label>
                    <input
                      type="text"
                      value={tier.label}
                      onChange={(e) =>
                        updateQuantityTier(index, "label", e.target.value)
                      }
                      placeholder="قطعتين"
                      className="w-full bg-white dark:bg-surface-raised border border-gray-300 dark:border-border rounded-lg px-2 py-1.5 text-sm text-gray-900 dark:text-text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  {/* Price */}
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 dark:text-text-muted mb-1">{t("products.form.price")}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tier.price}
                      onChange={(e) =>
                        updateQuantityTier(
                          index,
                          "price",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full bg-white dark:bg-surface-raised border border-gray-300 dark:border-border rounded-lg px-2 py-1.5 text-sm text-gray-900 dark:text-text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  {/* Compare Price */}
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 dark:text-text-muted mb-1">{t("products.form.compare")}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tier.compare_at_price || ""}
                      onChange={(e) =>
                        updateQuantityTier(
                          index,
                          "compare_at_price",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      className="w-full bg-white dark:bg-surface-raised border border-gray-300 dark:border-border rounded-lg px-2 py-1.5 text-sm text-gray-900 dark:text-text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  {/* Special toggle */}
                  <div className="col-span-2 flex items-center gap-2 pb-1.5">
                    <input
                      type="checkbox"
                      id={`tier-special-${index}`}
                      checked={tier.is_special}
                      onChange={(e) =>
                        updateQuantityTier(index, "is_special", e.target.checked)
                      }
                      className="w-4 h-4 rounded bg-white dark:bg-surface-raised border-gray-300 dark:border-border text-amber-500 focus:ring-amber-500/20"
                    />
                    <label
                      htmlFor={`tier-special-${index}`}
                      className="text-xs text-gray-700 dark:text-text-primary cursor-pointer"
                    >
                      {t("products.form.special")}
                    </label>
                  </div>

                  {/* Remove */}
                  <div className="col-span-1 flex justify-end pb-1.5">
                    <button
                      type="button"
                      onClick={() => removeQuantityTier(index)}
                      className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-lg leading-none"
                      aria-label={t("products.form.removeTier")}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
              {t("products.form.quantity")}
            </label>
            <input
              required
              type="number"
              value={formData.quantity || 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quantity: parseInt(e.target.value),
                })
              }
              className="w-full bg-white dark:bg-surface border border-gray-300 dark:border-border rounded-lg px-4 py-2 text-gray-900 dark:text-text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
              {t("products.form.stockStatus")}
            </label>
            <select
              value={formData.stock_status || "in_stock"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  stock_status: e.target.value as ProductInput["stock_status"],
                })
              }
              className="w-full bg-white dark:bg-surface border border-gray-300 dark:border-border rounded-lg px-4 py-2 text-gray-900 dark:text-text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            >
              <option value="in_stock">{t("products.form.inStock")}</option>
              <option value="low_stock">{t("products.form.lowStock")}</option>
              <option value="out_of_stock">{t("products.form.outOfStock")}</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-border">
          <h4 className="text-gray-900 dark:text-text-primary font-medium">{t("products.form.media")}</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
              {t("products.form.mainImageUrl")}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={formData.main_image || ""}
                onChange={(e) =>
                  setFormData({ ...formData, main_image: e.target.value })
                }
                dir="ltr"
                className="flex-1 bg-white dark:bg-surface border border-gray-300 dark:border-border rounded-lg px-4 py-2 text-gray-900 dark:text-text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              <label className="bg-gray-100 dark:bg-surface hover:bg-gray-200 dark:hover:bg-border text-gray-700 dark:text-text-primary px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap">
                {uploading ? t("common.uploadingEllipsis") : t("common.upload")}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "main_image")}
                  disabled={uploading}
                />
              </label>
            </div>
            {formData.main_image && (
              <div className="w-24 h-24 relative border border-gray-200 dark:border-border rounded overflow-hidden">
                <Image src={formData.main_image} alt="Main preview" fill className="object-cover" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
              {t("products.form.videoUrl")}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={formData.video_url || ""}
                onChange={(e) =>
                  setFormData({ ...formData, video_url: e.target.value })
                }
                dir="ltr"
                className="flex-1 bg-white dark:bg-surface border border-gray-300 dark:border-border rounded-lg px-4 py-2 text-gray-900 dark:text-text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              <label className="bg-gray-100 dark:bg-surface hover:bg-gray-200 dark:hover:bg-border text-gray-700 dark:text-text-primary px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap">
                {uploading ? t("common.uploadingEllipsis") : t("common.upload")}
                <input
                  type="file"
                  className="hidden"
                  accept="video/*"
                  onChange={(e) => handleFileUpload(e, "video_url")}
                  disabled={uploading}
                />
              </label>
            </div>
            {formData.video_url && (
              <video src={formData.video_url} controls className="h-32 rounded border" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
              {t("products.form.gallery")}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.gallery?.map((img, i) => (
                <div key={i} className="relative group">
                  <div className="w-16 h-16 relative">
                    <Image
                      src={img}
                      alt="Gallery"
                      fill
                      className="object-cover rounded border border-gray-300 dark:border-border"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        gallery: formData.gallery?.filter(
                          (_, idx) => idx !== i
                        ),
                      })
                    }
                    aria-label={t("products.form.removeGalleryImage")}
                    className="absolute top-1 end-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <label className="bg-gray-100 dark:bg-surface hover:bg-gray-200 dark:hover:bg-border text-gray-700 dark:text-text-primary px-4 py-2 rounded-lg cursor-pointer text-sm inline-block">
              {uploading ? t("common.uploading") : t("products.form.addGalleryImage")}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, "gallery")}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-border">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.is_active}
            onChange={(e) =>
              setFormData({ ...formData, is_active: e.target.checked })
            }
            className="w-4 h-4 rounded bg-white dark:bg-surface-raised border-gray-300 dark:border-border text-amber-500 focus:ring-amber-500/20"
          />
          <label
            htmlFor="isActive"
            className="text-sm font-medium text-gray-700 dark:text-text-muted"
          >
            {t("products.form.isActive")}
          </label>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-text-muted hover:text-gray-900 dark:hover:text-text-primary transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold transition-colors"
          >
            {t("products.form.saveProduct")}
          </button>
        </div>
      </form>
    </div>
  );
}
