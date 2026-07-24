"use client";

import { useReviewModeration } from "@/features/reviews/reviews.hooks";
import { ReviewModerationList } from "@/components/admin/reviews/ReviewModerationList";
import { useLocale } from "@/features/i18n/i18n.hooks";

export default function AdminReviewsPage() {
  const { t } = useLocale();
  const { reviews, isLoading, approve, reject, moderateState } = useReviewModeration("pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t("reviews.title")}</h1>
        <p className="text-text-muted">{t("reviews.subtitle")}</p>
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
