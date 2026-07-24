"use client";

import { useState } from "react";
import StarRating from "@/components/ui/StarRating";
import type { ProductReview } from "@/features/shared/types";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface ReviewModerationListProps {
  reviews: ProductReview[];
  isLoading: boolean;
  onApprove: (id: string) => Promise<unknown>;
  onReject: (id: string) => Promise<unknown>;
  isMutating: boolean;
}

export function ReviewModerationList({
  reviews,
  isLoading,
  onApprove,
  onReject,
  isMutating,
}: ReviewModerationListProps) {
  const { t } = useLocale();
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
    return <div className="p-8 text-center text-text-muted">{t("reviews.list.loading")}</div>;
  }

  if (reviews.length === 0) {
    return <div className="p-8 text-center text-text-muted">{t("reviews.list.empty")}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-surface">
      <table className="w-full text-start text-sm text-text-muted">
        <thead className="bg-surface text-text-primary">
          <tr>
            <th className="px-6 py-4 font-medium">{t("reviews.list.customer")}</th>
            <th className="px-6 py-4 font-medium">{t("reviews.list.product")}</th>
            <th className="px-6 py-4 font-medium">{t("reviews.list.rating")}</th>
            <th className="px-6 py-4 font-medium">{t("reviews.list.review")}</th>
            <th className="px-6 py-4 font-medium">{t("reviews.list.date")}</th>
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
              <td className="px-6 py-4 text-text-primary">{review.product?.name || "—"}</td>
              <td className="px-6 py-4">
                <StarRating value={review.rating} size={14} ariaLabel={t("reviews.list.rating")} />
              </td>
              <td className="px-6 py-4 max-w-xs">
                {review.title && <p className="font-medium text-text-primary">{review.title}</p>}
                {review.body && <p className="text-xs text-text-muted line-clamp-3">{review.body}</p>}
              </td>
              <td className="px-6 py-4 text-xs">
                {new Date(review.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td className="px-6 py-4">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
