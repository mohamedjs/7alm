"use client";

import { useCallback, useState } from "react";
import {
  useCreateTestimonialMutation,
  useDeleteTestimonialMutation,
  useGetTestimonialsQuery,
  useUpdateTestimonialMutation,
} from "./testimonials.api";
import type { TestimonialInput } from "./testimonials.api";
import type { Testimonial } from "@/features/shared/types";

const EMPTY_FORM: TestimonialInput = {
  name_ar: "",
  name_en: "",
  role_ar: "",
  role_en: "",
  text_ar: "",
  text_en: "",
  rating: 5,
  is_active: true,
};

export function useTestimonialsManager() {
  const { data: testimonials, isLoading, error, refetch } = useGetTestimonialsQuery();

  const [createTestimonial, createState] = useCreateTestimonialMutation();
  const [updateTestimonial, updateState] = useUpdateTestimonialMutation();
  const [deleteTestimonial, deleteState] = useDeleteTestimonialMutation();

  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [formData, setFormData] = useState<TestimonialInput>(EMPTY_FORM);

  const saveTestimonial = useCallback(
    async (data: TestimonialInput) => {
      if (editingTestimonial) {
        await updateTestimonial({ id: editingTestimonial.id, ...data }).unwrap();
      } else {
        await createTestimonial(data).unwrap();
      }
    },
    [createTestimonial, updateTestimonial, editingTestimonial],
  );

  const removeTestimonial = useCallback(
    async (id: string) => {
      await deleteTestimonial(id).unwrap();
    },
    [deleteTestimonial],
  );

  return {
    testimonials: testimonials ?? [],
    isLoading,
    error,
    refetch,
    editingTestimonial,
    setEditingTestimonial,
    formData,
    setFormData,
    saveTestimonial,
    removeTestimonial,
    createState,
    updateState,
    deleteState,
  };
}
