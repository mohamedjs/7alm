import { supabase } from "@/lib/supabase";
import type { Testimonial } from "../shared/types";

export const testimonialsRepository = {
  async getAllTestimonials(): Promise<Testimonial[]> {
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Testimonial[];
  },

  async getActiveTestimonials(): Promise<Testimonial[]> {
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Testimonial[];
  },

  async createTestimonial(testimonial: Omit<Testimonial, "id" | "created_at">): Promise<Testimonial> {
    const { data, error } = await supabase
      .from("testimonials")
      .insert([testimonial])
      .select()
      .single();

    if (error) throw error;
    return data as Testimonial;
  },

  async updateTestimonial(id: string, updates: Partial<Omit<Testimonial, "id" | "created_at">>): Promise<Testimonial> {
    const { data, error } = await supabase
      .from("testimonials")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Testimonial;
  },

  async deleteTestimonial(id: string): Promise<void> {
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) throw error;
  },
};
