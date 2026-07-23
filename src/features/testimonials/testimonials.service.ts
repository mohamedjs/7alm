import { testimonialsRepository } from "./testimonials.repository";
import type { Testimonial } from "../shared/types";

export const testimonialsService = {
  async getAllTestimonials(): Promise<Testimonial[]> {
    return testimonialsRepository.getAllTestimonials();
  },

  async getActiveTestimonials(): Promise<Testimonial[]> {
    return testimonialsRepository.getActiveTestimonials();
  },

  async createTestimonial(testimonial: Omit<Testimonial, "id" | "created_at">): Promise<Testimonial> {
    return testimonialsRepository.createTestimonial(testimonial);
  },

  async updateTestimonial(id: string, updates: Partial<Omit<Testimonial, "id" | "created_at">>): Promise<Testimonial> {
    return testimonialsRepository.updateTestimonial(id, updates);
  },

  async deleteTestimonial(id: string): Promise<void> {
    return testimonialsRepository.deleteTestimonial(id);
  },
};
