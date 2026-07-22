"use client";

import { Star } from "lucide-react";
import type { DictKey } from "@/features/i18n/dictionary";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { Testimonial } from "@/features/shared/types";

interface TestimonialsProps {
  testimonials?: Testimonial[];
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/**
 * Home page "Testimonials" section — hardcoded customer reviews (no
 * dedicated reviews table yet), each string routed through the i18n
 * dictionary so it flips with locale like every other store surface.
 * Horizontal snap-scroll on mobile, 3-column grid on desktop.
 */
export default function Testimonials({ testimonials = [] }: TestimonialsProps) {
  const { t, locale } = useLocale();

  if (testimonials.length === 0) return null;

  return (
    <section className="container mx-auto px-6 py-16 lg:py-24">
      <div className="mb-10 text-center">
        <h2 className="font-heading text-3xl lg:text-4xl font-extrabold text-text-primary mb-3">
          {t("store.home.testimonials")}
        </h2>
        <p className="text-text-muted">{t("store.home.testimonialsSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {testimonials.map((testimonial, i) => {
          const name = locale === "en" && testimonial.name_en ? testimonial.name_en : testimonial.name_ar;
          const role = locale === "en" && testimonial.role_en ? testimonial.role_en : testimonial.role_ar;
          const text = locale === "en" && testimonial.text_en ? testimonial.text_en : testimonial.text_ar;
          
          return (
            <div
              key={testimonial.id || i}
              className="neu-raised flex flex-col justify-between rounded-2xl bg-surface p-8 transition-transform hover:-translate-y-1"
            >
              <div>
                <div className="mb-4 flex items-center gap-1" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`h-5 w-5 ${
                        idx < (testimonial.rating || 5)
                          ? "fill-brand-500 text-brand-500"
                          : "fill-transparent text-text-muted/40"
                      }`}
                    />
                  ))}
                </div>

                <p className="mb-6 text-lg leading-relaxed text-text-primary">
                  "{text}"
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full neu-pressed-sm bg-surface text-sm font-bold text-brand-600 dark:text-brand-400">
                  {getInitials(name)}
                </div>
                <div>
                  <p className="font-semibold text-text-primary">{name}</p>
                  <p className="text-sm text-text-muted">{role}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
