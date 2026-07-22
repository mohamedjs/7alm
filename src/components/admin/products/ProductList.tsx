"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/features/products/products.api";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onToggleFeatured: (id: string, featured: boolean) => void;
}

export default function ProductList({
  products,
  isLoading,
  onEdit,
  onDelete,
  onToggleFeatured,
}: ProductListProps) {
  const { t } = useLocale();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (slug: string, id: string) => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(t("products.deleteConfirm"))) return;
    onDelete(id);
  };

  if (isLoading) {
    return (
      <div className="py-10 text-center text-text-muted">
        {t("products.list.loading")}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl bg-surface py-16 text-center neu-raised">
        <div className="mb-4 text-text-muted">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="mb-2 text-lg font-medium text-text-primary">{t("products.list.emptyTitle")}</p>
        <p className="text-sm text-text-muted">{t("products.list.emptySubtitle")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-surface neu-raised">
      <table className="w-full text-start text-sm text-text-muted">
        <thead className="bg-surface text-text-primary">
          <tr>
            <th className="px-6 py-4 font-medium">{t("products.list.product")}</th>
            <th className="px-6 py-4 font-medium">{t("products.list.price")}</th>
            <th className="px-6 py-4 font-medium">{t("products.list.stock")}</th>
            <th className="px-6 py-4 font-medium">{t("products.list.status")}</th>
            <th className="px-4 py-4 text-center font-medium">{t("products.list.featured")}</th>
            <th className="px-6 py-4 font-medium">{t("products.list.shareLinks")}</th>
            <th className="px-6 py-4 font-medium">{t("products.list.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {products.map((product) => (
            <tr key={product.id} className="transition-all hover:bg-surface-raised/50">
              <td className="flex items-center gap-3 px-6 py-4">
                {product.main_image ? (
                  <div className="relative h-10 w-10">
                    <Image
                      src={product.main_image}
                      alt={product.name}
                      fill
                      className="rounded-md object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-xs text-text-muted neu-pressed-sm">
                    {t("products.list.na")}
                  </div>
                )}
                <div>
                  <div className="font-medium text-text-primary">{product.name}</div>
                  <div className="text-xs text-text-muted">{product.slug}</div>
                </div>
              </td>
              <td className="px-6 py-4 font-medium text-text-primary">
                EGP {product.price}
                {product.compare_at_price && (
                  <span className="block text-xs text-text-muted line-through">
                    EGP {product.compare_at_price}
                  </span>
                )}
              </td>
              <td className="px-6 py-4">{product.quantity}</td>
              <td className="px-6 py-4">
                <span
                  className={`rounded-lg px-2 py-1 text-xs font-medium neu-pressed-sm ${
                    product.is_active
                      ? "text-success"
                      : "text-danger"
                  }`}
                >
                  {product.is_active ? t("products.list.active") : t("products.list.inactive")}
                </span>
              </td>
              <td className="px-4 py-4 text-center">
                <button
                  type="button"
                  onClick={() => onToggleFeatured(product.id, !product.is_featured)}
                  aria-label={product.is_featured ? t("products.list.unfeatured") : t("products.list.setFeatured")}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                    product.is_featured ? "bg-brand-500" : "bg-border"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      product.is_featured ? "translate-x-6 rtl:-translate-x-6" : "translate-x-1 rtl:-translate-x-1"
                    }`}
                  />
                </button>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleCopyLink(`${product.slug}`, product.id)}
                    className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                      copiedId === product.id
                        ? "neu-pressed-sm text-success"
                        : "bg-surface text-text-primary neu-raised-sm hover:neu-raised"
                    }`}
                  >
                    {copiedId === product.id ? t("products.list.copied") : t("products.list.copyUrl")}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyLink(`${product.slug}?utm_source=facebook`, `${product.id}-fb`)}
                      title={t("products.list.copyFb")}
                      className={`inline-flex flex-1 items-center justify-center rounded-xl py-1.5 text-xs font-medium transition-all ${
                        copiedId === `${product.id}-fb`
                          ? "neu-pressed-sm text-success"
                          : "bg-blue-500/10 text-blue-500 dark:text-blue-400 neu-raised-sm"
                      }`}
                    >
                      {copiedId === `${product.id}-fb` ? "✓" : "FB"}
                    </button>
                    <button
                      onClick={() => handleCopyLink(`${product.slug}?utm_source=instagram`, `${product.id}-ig`)}
                      title={t("products.list.copyIg")}
                      className={`inline-flex flex-1 items-center justify-center rounded-xl py-1.5 text-xs font-medium transition-all ${
                        copiedId === `${product.id}-ig`
                          ? "neu-pressed-sm text-success"
                          : "bg-pink-500/10 text-pink-500 dark:text-pink-400 neu-raised-sm"
                      }`}
                    >
                      {copiedId === `${product.id}-ig` ? "✓" : "IG"}
                    </button>
                    <button
                      onClick={() => handleCopyLink(`${product.slug}?utm_source=tiktok`, `${product.id}-tk`)}
                      title={t("products.list.copyTk")}
                      className={`inline-flex flex-1 items-center justify-center rounded-xl py-1.5 text-xs font-medium transition-all ${
                        copiedId === `${product.id}-tk`
                          ? "neu-pressed-sm text-success"
                          : "bg-surface text-text-primary neu-raised-sm"
                      }`}
                    >
                      {copiedId === `${product.id}-tk` ? "✓" : "TK"}
                    </button>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(product)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {t("products.list.edit")}
                  </button>
                  <span className="text-border">|</span>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    {t("products.list.delete")}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
