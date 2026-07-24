"use client";

import StarRating from "@/components/ui/StarRating";
import { useProductReviews } from "@/features/reviews/reviews.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface ProductRatingSummaryProps {
  slug: string;
}

/**
 * Compact avg-stars + count badge for the product-detail price area.
 * Shares the RTK Query cache entry with `ProductReviewsSection` (same
 * `slug` key) — no duplicate network request.
 */
export default function ProductRatingSummary({ slug }: ProductRatingSummaryProps) {
  const { aggregate, isLoading } = useProductReviews(slug);
  const { t } = useLocale();

  if (isLoading) {
    return <div className="mb-4 h-5 w-32 animate-pulse rounded-full bg-surface-raised" />;
  }

  if (aggregate.count === 0) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center gap-2">
      <StarRating value={aggregate.average} size={16} ariaLabel={t("store.reviews.ratingLabel")} />
      <span className="text-sm font-medium text-text-primary">{aggregate.average.toFixed(1)}</span>
      <span className="text-sm text-text-muted">
        ({aggregate.count} {t("store.reviews.countSuffix")})
      </span>
    </div>
  );
}
