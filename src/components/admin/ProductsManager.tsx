"use client";

import { useAuth } from "@/features/auth/auth.hooks";
import {
  useProductsManager,
} from "@/features/products/products.hooks";
import { useMediaUpload } from "@/features/media/media.hooks";
import type { ProductInput } from "@/features/products/products.api";

export default function ProductsManager() {
  const { token } = useAuth();
  const {
    products,
    isLoading,
    isModalOpen,
    editingProduct,
    formData,
    setFormData,
    openModal,
    closeModal,
    saveProduct,
    removeProduct,
  } = useProductsManager();

  const { upload, uploading } = useMediaUpload();

  if (!token) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveProduct(formData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save product.";
      alert(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await removeProduct(id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete product.";
      alert(message);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "main_image" | "video_url" | "gallery",
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
      const message = err instanceof Error ? err.message : "Failed to upload file";
      alert(message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Products Manager</h2>
        <button
          onClick={() => openModal()}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm transition-all font-bold"
        >
          + Add Product
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 py-10">Loading products...</div>
      ) : (
        <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-xl">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Price</th>
                <th className="px-6 py-4 font-medium">Stock</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-800/50">
                  <td className="px-6 py-4 flex items-center gap-3">
                    {product.main_image ? (
                      <img src={product.main_image} alt={product.name} className="w-10 h-10 rounded-md object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-gray-800 flex items-center justify-center">N/A</div>
                    )}
                    <div>
                      <div className="text-white font-medium">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.slug}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white">
                    EGP {product.price}
                    {product.compare_at_price && (
                      <span className="text-xs line-through text-gray-500 block">EGP {product.compare_at_price}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {product.quantity}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {product.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => openModal(product)} className="text-blue-400 hover:text-blue-300 mr-3">Edit</button>
                    <button onClick={() => handleDelete(product.id)} className="text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-6">
              {editingProduct ? "Edit Product" : "Add Product"}
            </h3>
            <button onClick={closeModal} className="absolute top-6 right-6 text-gray-400 hover:text-white">
              ✕
            </button>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                  <input required type="text" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Slug</label>
                  <input required type="text" value={formData.slug || ""} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea rows={3} value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Price</label>
                  <input required type="number" step="0.01" value={formData.price || 0} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Compare Price</label>
                  <input type="number" step="0.01" value={formData.compare_at_price || ""} onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value ? parseFloat(e.target.value) : null })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">SKU</label>
                  <input type="text" value={formData.sku || ""} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
                  <input required type="number" value={formData.quantity || 0} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Stock Status</label>
                  <select value={formData.stock_status || "in_stock"} onChange={(e) => setFormData({ ...formData, stock_status: e.target.value as ProductInput["stock_status"] })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-800">
                <h4 className="text-white font-medium">Media</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Main Image URL</label>
                  <div className="flex gap-2">
                    <input type="text" value={formData.main_image || ""} onChange={(e) => setFormData({ ...formData, main_image: e.target.value })} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
                    <label className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap">
                      {uploading ? "..." : "Upload"}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, "main_image")} disabled={uploading} />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Video URL (Optional)</label>
                  <div className="flex gap-2">
                    <input type="text" value={formData.video_url || ""} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
                    <label className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap">
                      {uploading ? "..." : "Upload"}
                      <input type="file" className="hidden" accept="video/*" onChange={(e) => handleFileUpload(e, "video_url")} disabled={uploading} />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Gallery</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.gallery?.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img} className="w-16 h-16 object-cover rounded border border-gray-700" />
                        <button type="button" onClick={() => setFormData({ ...formData, gallery: formData.gallery?.filter((_, idx) => idx !== i) })} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                      </div>
                    ))}
                  </div>
                  <label className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg cursor-pointer text-sm inline-block">
                    {uploading ? "Uploading..." : "+ Add Gallery Image"}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, "gallery")} disabled={uploading} />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-800">
                <input type="checkbox" id="isActive" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-amber-500 focus:ring-amber-500/20" />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-300">Is Active</label>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold transition-colors">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
