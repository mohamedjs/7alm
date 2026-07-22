"use client";

import { useState } from "react";
import { useTestimonialsManager } from "@/features/testimonials/testimonials.hooks";
import type { Testimonial } from "@/features/shared/types";
import TestimonialForm from "@/components/admin/testimonials/TestimonialForm";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";

export default function AdminTestimonialsPage() {
  const {
    testimonials,
    isLoading,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
  } = useTestimonialsManager();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);

  const handleCreate = () => {
    setEditingTestimonial(null);
    setIsFormOpen(true);
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this testimonial?")) {
      await deleteTestimonial(id);
    }
  };

  const handleFormSubmit = async (data: Omit<Testimonial, "id" | "created_at">) => {
    try {
      if (editingTestimonial) {
        await updateTestimonial({ id: editingTestimonial.id, updates: data }).unwrap();
      } else {
        await createTestimonial(data).unwrap();
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error("Failed to save testimonial", error);
      alert("Error saving testimonial");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-text-primary">Testimonials</h1>
        <button
          onClick={handleCreate}
          className="neu-pressed flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-600"
        >
          <PlusCircle className="h-5 w-5" />
          Add Testimonial
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-border">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="bg-surface-hover text-text-muted">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Rating</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 text-end font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-text-primary">
              {testimonials.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-surface-hover">
                  <td className="px-6 py-4">
                    <div className="font-semibold">{t.name_ar}</div>
                    {t.name_en && <div className="text-xs text-text-muted">{t.name_en}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div>{t.role_ar || "-"}</div>
                    {t.role_en && <div className="text-xs text-text-muted">{t.role_en}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-yellow-400">
                      <span>{t.rating}</span>
                      <span>★</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        t.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400"
                      }`}
                    >
                      {t.is_active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(t)}
                        className="rounded-lg p-2 text-text-muted transition-colors hover:bg-brand-500 hover:text-white"
                        title="Edit"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="rounded-lg p-2 text-text-muted transition-colors hover:bg-red-500 hover:text-white"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {testimonials.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                    No testimonials found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <TestimonialForm
          initialData={editingTestimonial || undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}
