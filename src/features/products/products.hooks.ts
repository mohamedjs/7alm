"use client";

import { useCallback, useState } from "react";
import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useGetProductsQuery,
  useUpdateProductMutation,
} from "./products.api";
import type { Product, ProductInput } from "./products.api";

const EMPTY_FORM: ProductInput = {
  name: "",
  slug: "",
  description: "",
  price: 0,
  compare_at_price: null,
  quantity_prices: [],
  sku: "",
  quantity: 0,
  category_id: null,
  stock_status: "in_stock",
  main_image: "",
  gallery: [],
  video_url: "",
  is_active: true,
  theme_color: "#06b6d4",
  is_featured: false,
};

/**
 * Admin products manager — list, create, update, delete.
 * Components stay pure: they only render the data and call these actions.
 */
export function useProductsManager() {
  const { data: products, isLoading, error, refetch } = useGetProductsQuery();

  const [createProduct, createState] = useCreateProductMutation();
  const [updateProduct, updateState] = useUpdateProductMutation();
  const [deleteProduct, deleteState] = useDeleteProductMutation();

  // Modal / form UI state stays local to the manager hook.
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductInput>(EMPTY_FORM);

  const openModal = useCallback((product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product as ProductInput);
    } else {
      setEditingProduct(null);
      setFormData(EMPTY_FORM);
    }
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingProduct(null);
  }, []);

  const saveProduct = useCallback(
    async (data: ProductInput) => {
      if (editingProduct) {
        await updateProduct({ id: editingProduct.id, ...data }).unwrap();
      } else {
        await createProduct(data).unwrap();
      }
      closeModal();
    },
    [createProduct, updateProduct, editingProduct, closeModal],
  );

  const removeProduct = useCallback(
    async (id: string) => {
      await deleteProduct(id).unwrap();
    },
    [deleteProduct],
  );

  return {
    products: products ?? [],
    isLoading,
    error,
    refetch,
    isModalOpen,
    editingProduct,
    setEditingProduct,
    formData,
    setFormData,
    openModal,
    closeModal,
    saveProduct,
    removeProduct,
    createState,
    updateState,
    deleteState,
  };
}
