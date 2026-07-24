"use client";

import StarRating from "@/components/ui/StarRating";
import { useProductReviews } from "@/features/reviews/reviews.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface ProductReviewsSectionProps {
  slug: string;
}

/** Approved-reviews list + aggregate header for the bottom of the product page. */
export default function ProductReviewsSection({ slug }: ProductReviewsSectionProps) {
  const { reviews, aggregate, isLoading, error } = useProductReviews(slug);
  const { t, locale } = useLocale();

  return (
    <section className="mt-16 border-t border-border pt-10">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold text-text-primary">
          {t("store.reviews.title")}
        </h2>
        {aggregate.count > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={aggregate.average} size={18} ariaLabel={t("store.reviews.ratingLabel")} />
            <span className="text-sm font-medium text-text-primary">{aggregate.average.toFixed(1)}</span>
            <span className="text-sm text-text-muted">({aggregate.count})</span>
          </div>
        )}
      </div>

      {isLoading && <p className="text-sm text-text-muted">{t("store.reviews.loading")}</p>}

      {!isLoading && error && <p className="text-sm text-danger">{t("store.reviews.loadError")}</p>}

      {!isLoading && !error && reviews.length === 0 && (
        <p className="text-sm text-text-muted">{t("store.reviews.empty")}</p>
      )}

      {!isLoading && reviews.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-2xl bg-surface p-5 neu-raised-sm">
              <div className="mb-2 flex items-center justify-between">
                <StarRating value={review.rating} size={14} ariaLabel={t("store.reviews.ratingLabel")} />
                <span className="text-xs text-text-muted">
                  {new Date(review.created_at).toLocaleDateString(
                    locale === "en" ? "en-US" : "ar-EG",
                    { year: "numeric", month: "short", day: "numeric" },
                  )}
                </span>
              </div>
              {review.title && (
                <p className="mb-1 text-sm font-bold text-text-primary">{review.title}</p>
              )}
              {review.body && (
                <p className="text-sm leading-relaxed text-text-muted">{review.body}</p>
              )}
              <p className="mt-3 text-xs font-medium text-text-muted">{review.author_name}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
