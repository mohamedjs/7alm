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
      <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
        <div className="text-gray-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-gray-400 text-lg font-medium mb-2">No products yet</p>
        <p className="text-gray-500 text-sm">Create your first product to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-xl">
      <table className="w-full text-left text-sm text-gray-400">
        <thead className="bg-gray-800 text-gray-300">
          <tr>
            <th className="px-6 py-4 font-medium">Product</th>
            <th className="px-6 py-4 font-medium">Price</th>
            <th className="px-6 py-4 font-medium">Stock</th>
            <th className="px-6 py-4 font-medium">Status</th>
            <th className="px-6 py-4 font-medium">Landing Link</th>
            <th className="px-6 py-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-gray-800/50 transition-colors">
              <td className="px-6 py-4 flex items-center gap-3">
                {product.main_image ? (
                  <img
                    src={product.main_image}
                    alt={product.name}
                    className="w-10 h-10 rounded-md object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-gray-800 flex items-center justify-center text-xs text-gray-500">
                    N/A
                  </div>
                )}
                <div>
                  <div className="text-white font-medium">{product.name}</div>
                  <div className="text-xs text-gray-500">{product.slug}</div>
                </div>
              </td>
              <td className="px-6 py-4 text-white">
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
                <button
                  onClick={() => handleCopyLink(product.slug, product.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    copiedId === product.id
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-gray-800 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600"
                  }`}
                >
                  {copiedId === product.id ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Copy Link
                    </>
                  )}
                </button>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(product)}
                    className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                  >
                    Edit
                  </button>
                  <span className="text-gray-700">|</span>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-red-400 hover:text-red-300 text-xs font-medium"
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
