"use client";

import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/features/shared/types";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface CategoryGridProps {
  categories: Category[];
}

/**
 * Top-level category tiles below the Lookbook hero, using `Category.image`.
 * Asymmetric bento grid (first tile spans 2×2) with neumorphic surfaces.
 * Links to `/category/[slug]`.
 */
export default function CategoryGrid({ categories }: CategoryGridProps) {
  const { t, locale } = useLocale();
  const topLevel = categories.filter((c) => !c.parent_id);
  if (topLevel.length === 0) return null;

  return (
    <section className="container mx-auto px-6 py-16 lg:py-24">
      <div className="mb-10 text-center">
        <h2 className="font-heading text-3xl lg:text-4xl font-extrabold text-text-primary mb-3">
          {t("store.home.categories")}
        </h2>
        <p className="text-text-muted">{t("store.home.categoriesSubtitle")}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-2 gap-4 lg:gap-6">
        {topLevel.slice(0, 5).map((category, index) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className={`group relative overflow-hidden rounded-2xl neu-raised bg-surface transition-transform duration-300 hover:-translate-y-1 ${
              index === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-[3/4]"
            }`}
          >
            {category.image ? (
              <Image
                src={category.image}
                alt={locale === "en" && category.name_en ? category.name_en : category.name_ar}
                fill
                sizes={index === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="absolute inset-0 bg-surface" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h3 className={`font-heading font-bold text-white ${index === 0 ? "text-xl lg:text-2xl" : "text-lg"}`}>
                {locale === "en" && category.name_en ? category.name_en : category.name_ar}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
