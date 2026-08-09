"use client";

import { useState } from "react";
import Image from "next/image";
import StarRating from "@/components/ui/StarRating";
import type { ProductReview, ReviewStatus } from "@/features/shared/types";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { DictKey } from "@/features/i18n/dictionary";

const STATUS_KEY: Record<ReviewStatus, DictKey> = {
  pending: "reviews.status.pending",
  approved: "reviews.status.approved",
  rejected: "reviews.status.rejected",
};

const STATUS_CLASS: Record<ReviewStatus, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-danger/10 text-danger",
};

interface ReviewModerationListProps {
  reviews: ProductReview[];
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  onApprove: (id: string) => Promise<unknown>;
  onReject: (id: string) => Promise<unknown>;
  isMutating: boolean;
}

function formatReviewDate(iso: string, locale: "ar" | "en") {
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ProductThumbnail({ name, image, na }: { name: string; image?: string | null; na: string }) {
  if (image) {
    return (
      <div className="relative h-10 w-10 shrink-0">
        <Image src={image} alt={name} fill className="rounded-md object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-xs text-text-muted neu-pressed-sm">
      {na}
    </div>
  );
}

export function ReviewModerationList({
  reviews,
  isLoading,
  hasError,
  onRetry,
  onApprove,
  onReject,
  isMutating,
}: ReviewModerationListProps) {
  const { t, locale } = useLocale();
  const [activeId, setActiveId] = useState<string | null>(null);

  const handle = async (id: string, action: (id: string) => Promise<unknown>) => {
    setActiveId(id);
    try {
      await action(id);
    } finally {
      setActiveId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-surface p-12 neu-raised transition-all">
        <div className="flex flex-col items-center justify-center text-text-muted">
          <svg className="mb-4 h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p>{t("reviews.list.loading")}</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="rounded-2xl bg-surface p-12 neu-raised transition-all">
        <div className="flex flex-col items-center justify-center text-center text-text-muted">
          <svg className="mb-4 h-12 w-12 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <p className="mb-4 text-lg font-medium text-text-primary">{t("reviews.list.error")}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-surface px-4 py-2 text-sm font-medium text-brand-500 transition-all neu-raised-sm hover:neu-raised"
          >
            {t("reviews.list.retry")}
          </button>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl bg-surface py-16 text-center neu-raised">
        <div className="mb-4 text-text-muted">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        </div>
        <p className="mb-2 text-lg font-medium text-text-primary">{t("reviews.list.empty")}</p>
        <p className="text-sm text-text-muted">{t("reviews.list.emptySubtitle")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-surface neu-raised transition-all">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-start text-sm text-text-muted">
          <thead className="bg-surface text-text-primary">
            <tr>
              <th className="px-6 py-4 font-medium">{t("reviews.list.customer")}</th>
              <th className="px-6 py-4 font-medium">{t("reviews.list.product")}</th>
              <th className="px-6 py-4 font-medium">{t("reviews.list.rating")}</th>
              <th className="px-6 py-4 font-medium">{t("reviews.list.review")}</th>
              <th className="px-6 py-4 font-medium">{t("reviews.list.date")}</th>
              <th className="px-6 py-4 font-medium">{t("reviews.list.status")}</th>
              <th className="px-6 py-4 font-medium">{t("reviews.list.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reviews.map((review) => (
              <tr key={review.id} className="align-top transition-all hover:bg-surface-raised/50">
                <td className="px-6 py-4">
                  <div className="font-medium text-text-primary">{review.customer?.full_name || "—"}</div>
                  <div className="text-xs text-text-muted" dir="ltr">
                    {review.customer?.phone || ""}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <ProductThumbnail
                      name={review.product?.name || ""}
                      image={review.product?.main_image}
                      na={t("reviews.list.na")}
                    />
                    <span className="text-text-primary">{review.product?.name || "—"}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StarRating value={review.rating} size={14} ariaLabel={t("reviews.list.rating")} />
                </td>
                <td className="px-6 py-4 max-w-xs">
                  {review.title && <p className="font-medium text-text-primary">{review.title}</p>}
                  {review.body && <p className="text-xs text-text-muted line-clamp-3">{review.body}</p>}
                </td>
                <td className="px-6 py-4 text-xs">{formatReviewDate(review.created_at, locale)}</td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[review.status]}`}
                  >
                    {t(STATUS_KEY[review.status])}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {review.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handle(review.id, onApprove)}
                        disabled={isMutating && activeId === review.id}
                        className="rounded-xl bg-success/10 px-3 py-1.5 text-xs font-medium text-success transition-all neu-raised-sm disabled:opacity-50"
                      >
                        {t("reviews.list.approve")}
                      </button>
                      <button
                        onClick={() => handle(review.id, onReject)}
                        disabled={isMutating && activeId === review.id}
                        className="rounded-xl bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger transition-all neu-raised-sm disabled:opacity-50"
                      >
                        {t("reviews.list.reject")}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-border/20 lg:hidden">
        {reviews.map((review) => (
          <div key={review.id} className="p-4">
            <div className="flex items-start gap-3">
              <ProductThumbnail
                name={review.product?.name || ""}
                image={review.product?.main_image}
                na={t("reviews.list.na")}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium text-text-primary">{review.product?.name || "—"}</p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[review.status]}`}
                  >
                    {t(STATUS_KEY[review.status])}
                  </span>
                </div>
                <p className="text-xs text-text-muted">{review.customer?.full_name || "—"}</p>
                <div className="mt-1">
                  <StarRating value={review.rating} size={12} ariaLabel={t("reviews.list.rating")} />
                </div>
              </div>
            </div>

            {(review.title || review.body) && (
              <div className="mt-3">
                {review.title && <p className="font-medium text-text-primary">{review.title}</p>}
                {review.body && <p className="text-sm text-text-muted">{review.body}</p>}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-text-muted">{formatReviewDate(review.created_at, locale)}</span>
              {review.status === "pending" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handle(review.id, onApprove)}
                    disabled={isMutating && activeId === review.id}
                    className="rounded-xl bg-success/10 px-3 py-1.5 text-xs font-medium text-success transition-all neu-raised-sm disabled:opacity-50"
                  >
                    {t("reviews.list.approve")}
                  </button>
                  <button
                    onClick={() => handle(review.id, onReject)}
                    disabled={isMutating && activeId === review.id}
                    className="rounded-xl bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger transition-all neu-raised-sm disabled:opacity-50"
                  >
                    {t("reviews.list.reject")}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
