import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/features/shared/types";

interface CategoryGridProps {
  categories: Category[];
}

/**
 * Top-level category tiles below the Lookbook hero, using `Category.image`.
 * Links to `/category/[slug]` (Phase 3 — renders as a normal link either
 * way; the route just doesn't exist yet in this phase).
 */
export default function CategoryGrid({ categories }: CategoryGridProps) {
  const topLevel = categories.filter((c) => !c.parent_id);
  if (topLevel.length === 0) return null;

  return (
    <section className="container mx-auto px-6 py-16 lg:py-24">
      <div className="mb-10 text-center">
        <h2 className="font-heading text-3xl lg:text-4xl font-extrabold text-white mb-3">
          تسوق حسب القسم
        </h2>
        <p className="text-gray-400">اختر القسم الذي يناسبك واستكشف المنتجات</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {topLevel.slice(0, 4).map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="group relative aspect-[3/4] overflow-hidden rounded-2xl neu-raised-sm"
          >
            {category.image ? (
              <Image
                src={category.image}
                alt={category.name_ar}
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="absolute inset-0 bg-dark-800" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-dark-950/90 via-dark-950/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h3 className="font-heading text-lg font-bold text-white">
                {category.name_ar}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
