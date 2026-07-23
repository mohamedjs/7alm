import { useGetTestimonialsQuery, useCreateTestimonialMutation, useUpdateTestimonialMutation, useDeleteTestimonialMutation } from "./testimonials.api";

export function useTestimonialsManager() {
  const { data: testimonials = [], isLoading, isError, refetch } = useGetTestimonialsQuery();
  const [createTestimonial, { isLoading: isCreating }] = useCreateTestimonialMutation();
  const [updateTestimonial, { isLoading: isUpdating }] = useUpdateTestimonialMutation();
  const [deleteTestimonial, { isLoading: isDeleting }] = useDeleteTestimonialMutation();

  return {
    testimonials,
    isLoading,
    isError,
    refetch,
    createTestimonial,
    isCreating,
    updateTestimonial,
    isUpdating,
    deleteTestimonial,
    isDeleting,
  };
}
