"use client";

import type { ProductInput } from "@/features/products/products.api";
import type { Product } from "@/features/products/products.api";
import { useMediaUpload } from "@/features/media/media.hooks";
import Image from "next/image";

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
  const { upload, uploading } = useMediaUpload();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave(formData);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save product.";
      alert(message);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "main_image" | "video_url" | "gallery"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
        err instanceof Error ? err.message : "Failed to upload file";
      alert(message);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl w-full p-6 shadow-xl relative">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        {editingProduct ? "Edit Product" : "Add Product"}
      </h3>
      
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              required
              type="text"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug
            </label>
            <input
              required
              type="text"
              value={formData.slug || ""}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price
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
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compare Price
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
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU
            </label>
            <input
              type="text"
              value={formData.sku || ""}
              onChange={(e) =>
                setFormData({ ...formData, sku: e.target.value })
              }
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
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
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Status
            </label>
            <select
              value={formData.stock_status || "in_stock"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  stock_status: e.target.value as ProductInput["stock_status"],
                })
              }
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            >
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-200">
          <h4 className="text-gray-900 font-medium">Media</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Main Image URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.main_image || ""}
                onChange={(e) =>
                  setFormData({ ...formData, main_image: e.target.value })
                }
                className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              <label className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap">
                {uploading ? "..." : "Upload"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "main_image")}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video URL (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.video_url || ""}
                onChange={(e) =>
                  setFormData({ ...formData, video_url: e.target.value })
                }
                className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              <label className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap">
                {uploading ? "..." : "Upload"}
                <input
                  type="file"
                  className="hidden"
                  accept="video/*"
                  onChange={(e) => handleFileUpload(e, "video_url")}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gallery
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.gallery?.map((img, i) => (
                <div key={i} className="relative group">
                  <div className="w-16 h-16 relative">
                    <Image
                      src={img}
                      alt="Gallery"
                      fill
                      className="object-cover rounded border border-gray-300"
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
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <label className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg cursor-pointer text-sm inline-block">
              {uploading ? "Uploading..." : "+ Add Gallery Image"}
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

        <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.is_active}
            onChange={(e) =>
              setFormData({ ...formData, is_active: e.target.checked })
            }
            className="w-4 h-4 rounded bg-white border-gray-300 text-amber-500 focus:ring-amber-500/20"
          />
          <label
            htmlFor="isActive"
            className="text-sm font-medium text-gray-700"
          >
            Is Active
          </label>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold transition-colors"
          >
            Save Product
          </button>
        </div>
      </form>
    </div>
  );
}
