"use client";

import { Edit, Trash2 } from "lucide-react";
import type { Category, CategoryTree } from "@/features/shared/types";
import Image from "next/image";

interface CategoryListProps {
  tree: CategoryTree[];
  isLoading: boolean;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}

export function CategoryList({ tree, isLoading, onEdit, onDelete }: CategoryListProps) {
  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading categories...</div>;
  }

  if (!tree.length) {
    return <div className="p-8 text-center text-gray-500">No categories found.</div>;
  }

  const renderNode = (node: CategoryTree, depth: number = 0) => {
    return (
      <div key={node.id} className="flex flex-col border-b last:border-0 border-gray-100">
        <div 
          className="flex items-center justify-between py-4 pr-6 hover:bg-gray-50"
          style={{ paddingLeft: `${depth * 2 + 1.5}rem` }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center shrink-0">
              {node.image ? (
                <Image src={node.image} alt={node.name_en} width={48} height={48} className="object-cover" />
              ) : (
                <span className="text-gray-400 text-xs">No img</span>
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {depth > 0 && <span className="text-gray-400 mr-2">↳</span>}
                {node.name_ar} ({node.name_en})
              </div>
              <div className="text-sm text-gray-500">Slug: {node.slug}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-2 py-1 text-xs rounded-full ${node.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
              {node.is_active ? "Active" : "Hidden"}
            </span>
            <button
              onClick={() => onEdit(node)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this category?")) {
                  onDelete(node.id);
                }
              }}
              className="p-2 text-red-600 hover:bg-red-50 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {node.subcategories && node.subcategories.length > 0 && (
          <div className="flex flex-col">
            {node.subcategories.map(sub => renderNode(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {tree.map(node => renderNode(node))}
    </div>
  );
}
