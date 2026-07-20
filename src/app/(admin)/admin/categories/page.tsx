"use client";

import { useCategoriesManager } from "@/features/categories/categories.hooks";
import { CategoryList } from "@/components/admin/categories/CategoryList";
import { CategoryForm } from "@/components/admin/categories/CategoryForm";
import { Plus } from "lucide-react";

export default function CategoriesPage() {
  const {
    tree,
    categories,
    isLoading,
    isModalOpen,
    editingCategory,
    formData,
    setFormData,
    openModal,
    closeModal,
    saveCategory,
    removeCategory,
    createState,
    updateState,
  } = useCategoriesManager();

  const isSaving = createState.isLoading || updateState.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Categories الأقسام</h1>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <CategoryList 
          tree={tree} 
          isLoading={isLoading} 
          onEdit={openModal} 
          onDelete={removeCategory} 
        />
      </div>

      {isModalOpen && (
        <CategoryForm
          formData={formData}
          setFormData={setFormData}
          categories={categories}
          isSaving={isSaving}
          onSave={() => saveCategory(formData)}
          onClose={closeModal}
          isEditing={!!editingCategory}
          editingCategoryId={editingCategory?.id}
        />
      )}
    </div>
  );
}
