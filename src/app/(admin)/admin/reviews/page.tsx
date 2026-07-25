"use client";

import { useState } from "react";
import { useReviewModeration } from "@/features/reviews/reviews.hooks";
import { ReviewModerationList } from "@/components/admin/reviews/ReviewModerationList";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { DictKey } from "@/features/i18n/dictionary";
import type { ReviewStatus } from "@/features/shared/types";

const FILTERS: { status: ReviewStatus | undefined; key: DictKey }[] = [
  { status: undefined, key: "reviews.filter.all" },
  { status: "pending", key: "reviews.filter.pending" },
  { status: "approved", key: "reviews.filter.approved" },
  { status: "rejected", key: "reviews.filter.rejected" },
];

export default function AdminReviewsPage() {
  const { t } = useLocale();
  const [status, setStatus] = useState<ReviewStatus | undefined>("pending");
  const { reviews, isLoading, approve, reject, moderateState } = useReviewModeration(status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t("reviews.title")}</h1>
        <p className="text-text-muted">{t("reviews.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setStatus(filter.status)}
            aria-pressed={status === filter.status}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              status === filter.status
                ? "neu-pressed bg-surface text-brand-500"
                : "neu-raised bg-surface text-text-muted hover:text-text-primary"
            }`}
          >
            {t(filter.key)}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-surface neu-raised">
        <ReviewModerationList
          reviews={reviews}
          isLoading={isLoading}
          onApprove={approve}
          onReject={reject}
          isMutating={moderateState.isLoading}
        />
      </div>
    </div>
  );
}
