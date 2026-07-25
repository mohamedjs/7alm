"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import StarRating from "@/components/ui/StarRating";
import type { ReviewAggregate, ShowcaseReview } from "@/features/shared/types";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface CustomerReviewsProps {
  reviews: ShowcaseReview[];
  aggregate: ReviewAggregate;
}

/** Two-letter initials for the avatar badge. */
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
 * Home page "Customer Reviews" carousel — real, admin-approved 4-5 star
 * product reviews (`reviewsService.getShowcaseReviews`), replacing the old
 * hand-curated fake-praise section it replaces. Horizontal Embla carousel with
 * autoplay, mirroring `ProductGallery`'s idiom: `dir="ltr"` on the
 * viewport keeps the drag/scroll axis stable no matter the page direction,
 * while every slide's own content still inherits the page's direction.
 */
export default function CustomerReviews({ reviews, aggregate }: CustomerReviewsProps) {
  const { t, locale, dir } = useLocale();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" }, [
    Autoplay({ delay: 5000, stopOnInteraction: true }),
  ]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (reviews.length === 0) return null;

  const dateLocale = locale === "en" ? "en-US" : "ar-EG";

  return (
    <section className="container mx-auto px-6 py-16 lg:py-24">
      <div className="mb-10 text-center">
        <h2 className="font-heading text-3xl lg:text-4xl font-extrabold text-text-primary mb-3">
          {t("store.home.reviews")}
        </h2>
        <p className="text-text-muted">{t("store.home.reviewsSubtitle")}</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-2xl font-bold text-text-primary">
            {aggregate.average.toLocaleString(dateLocale, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
          </span>
          <StarRating value={aggregate.average} ariaLabel={t("store.home.reviewsAverage")} />
          <span className="text-sm text-text-muted">
            {t("store.home.reviewsCount").replace("{count}", String(aggregate.count))}
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef} dir="ltr">
          <div className="-mx-3 flex touch-pan-y">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="min-w-0 flex-[0_0_100%] px-3 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
                dir={dir}
              >
                <div className="neu-raised flex h-full flex-col justify-between rounded-2xl bg-surface p-6">
                  <div>
                    <StarRating
                      value={review.rating}
                      size={16}
                      ariaLabel={`${review.rating}/5`}
                    />
                    {review.title && (
                      <p className="mt-3 font-semibold text-text-primary">{review.title}</p>
                    )}
                    {review.body && (
                      <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-text-muted">
                        {review.body}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 flex items-end justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full neu-pressed-sm bg-surface text-sm font-bold text-brand-600 dark:text-brand-400">
                        {getInitials(review.author_name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          {review.author_name}
                        </p>
                        {review.product_slug && review.product_name && (
                          <Link
                            href={`/product/${review.product_slug}`}
                            className="text-xs text-brand-500 hover:underline"
                          >
                            {review.product_name}
                          </Link>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-text-muted">
                      {new Date(review.created_at).toLocaleDateString(dateLocale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {reviews.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => emblaApi?.scrollPrev()}
              aria-label={t("store.home.reviewsPrev")}
              className="absolute start-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full neu-raised-sm bg-surface text-text-primary transition-colors hover:text-brand-500 -translate-x-1/2 rtl:translate-x-1/2"
            >
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => emblaApi?.scrollNext()}
              aria-label={t("store.home.reviewsNext")}
              className="absolute end-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full neu-raised-sm bg-surface text-text-primary transition-colors hover:text-brand-500 translate-x-1/2 rtl:-translate-x-1/2"
            >
              <ChevronRight className="h-5 w-5 rtl:rotate-180" />
            </button>
          </>
        )}
      </div>

      {scrollSnaps.length > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => emblaApi?.scrollTo(index)}
              aria-label={String(index + 1)}
              aria-current={index === selectedIndex}
              className={`h-2 rounded-full transition-all ${
                index === selectedIndex ? "w-6 bg-brand-500" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
