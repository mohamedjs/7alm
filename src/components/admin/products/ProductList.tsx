"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/features/products/products.api";

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export default function ProductList({
  products,
  isLoading,
  onEdit,
  onDelete,
}: ProductListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (slug: string, id: string) => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    onDelete(id);
  };

  if (isLoading) {
    return (
      <div className="text-center text-gray-500 py-10">
        Loading products...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="text-gray-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-gray-900 text-lg font-medium mb-2">No products yet</p>
        <p className="text-gray-500 text-sm">Create your first product to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white border border-gray-200 shadow-sm rounded-xl">
      <table className="w-full text-left text-sm text-gray-600">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-6 py-4 font-medium">Product</th>
            <th className="px-6 py-4 font-medium">Price</th>
            <th className="px-6 py-4 font-medium">Stock</th>
            <th className="px-6 py-4 font-medium">Status</th>
            <th className="px-6 py-4 font-medium">Share Links</th>
            <th className="px-6 py-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 flex items-center gap-3">
                {product.main_image ? (
                  <img
                    src={product.main_image}
                    alt={product.name}
                    className="w-10 h-10 rounded-md object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400">
                    N/A
                  </div>
                )}
                <div>
                  <div className="text-gray-900 font-medium">{product.name}</div>
                  <div className="text-xs text-gray-500">{product.slug}</div>
                </div>
              </td>
              <td className="px-6 py-4 text-gray-900 font-medium">
                EGP {product.price}
                {product.compare_at_price && (
                  <span className="text-xs line-through text-gray-500 block">
                    EGP {product.compare_at_price}
                  </span>
                )}
              </td>
              <td className="px-6 py-4">{product.quantity}</td>
              <td className="px-6 py-4">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.is_active
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {product.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleCopyLink(`${product.slug}`, product.id)}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all w-full ${
                      copiedId === product.id
                        ? "bg-green-50 text-green-600 border border-green-200"
                        : "bg-white text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {copiedId === product.id ? "Copied!" : "Copy URL"}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyLink(`${product.slug}?utm_source=facebook`, `${product.id}-fb`)}
                      title="Copy Facebook Link"
                      className={`flex-1 inline-flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all ${
                        copiedId === `${product.id}-fb`
                          ? "bg-green-50 text-green-600 border border-green-200"
                          : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
                      }`}
                    >
                      {copiedId === `${product.id}-fb` ? "✓" : "FB"}
                    </button>
                    <button
                      onClick={() => handleCopyLink(`${product.slug}?utm_source=instagram`, `${product.id}-ig`)}
                      title="Copy Instagram Link"
                      className={`flex-1 inline-flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all ${
                        copiedId === `${product.id}-ig`
                          ? "bg-green-50 text-green-600 border border-green-200"
                          : "bg-pink-50 text-pink-600 border border-pink-200 hover:bg-pink-100"
                      }`}
                    >
                      {copiedId === `${product.id}-ig` ? "✓" : "IG"}
                    </button>
                    <button
                      onClick={() => handleCopyLink(`${product.slug}?utm_source=tiktok`, `${product.id}-tk`)}
                      title="Copy TikTok Link"
                      className={`flex-1 inline-flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all ${
                        copiedId === `${product.id}-tk`
                          ? "bg-green-50 text-green-600 border border-green-200"
                          : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
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
                    className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                  >
                    Edit
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-red-600 hover:text-red-700 text-xs font-medium"
                  >
                    Delete
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
