"use client";

import { useState } from "react";
import StarRating from "@/components/ui/StarRating";
import { useReviewSubmit } from "@/features/reviews/reviews.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface ReviewSubmitFormProps {
  /** Opaque verified-buyer token from the post-delivery WhatsApp link. */
  token: string;
}

/**
 * Star picker + optional title/body, gated by an opaque token — the token
 * alone authorizes the submission server-side (`POST /api/reviews`), so
 * this form never needs to resolve or display the underlying product.
 */
export default function ReviewSubmitForm({ token }: ReviewSubmitFormProps) {
  const { t } = useLocale();
  const { submit, isLoading } = useReviewSubmit();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (rating < 1) {
      setError(t("store.review.ratingRequired"));
      return;
    }

    try {
      await submit({ token, rating, title: title || undefined, body: body || undefined });
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("store.review.submitFailed");
      setError(message);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto rounded-3xl neu-raised-sm p-6 sm:p-10 text-center">
        <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-brand-600 dark:text-brand-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-text-primary mb-4">
          {t("store.review.thanksTitle")}
        </h2>
        <p className="text-text-muted text-sm">{t("store.review.thanksBody")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-heading text-3xl font-extrabold text-text-primary mb-2 text-center">
        {t("store.review.formTitle")}
      </h1>
      <p className="text-text-muted text-sm mb-8 text-center">{t("store.review.formSubtitle")}</p>

      <form onSubmit={handleSubmit} className="rounded-3xl neu-raised-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center gap-2">
          <label className="text-sm font-bold text-text-muted">{t("store.review.ratingLabel")}</label>
          <StarRating value={rating} onChange={setRating} size={32} ariaLabel={t("store.review.ratingLabel")} />
        </div>

        <div>
          <label htmlFor="reviewTitle" className="block text-sm font-bold text-text-muted mb-2">
            {t("store.review.titleLabel")} <span className="text-text-muted">{t("store.review.optional")}</span>
          </label>
          <input
            id="reviewTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("store.review.titlePlaceholder")}
            className="w-full neu-input rounded-xl px-4 py-3 transition-all"
          />
        </div>

        <div>
          <label htmlFor="reviewBody" className="block text-sm font-bold text-text-muted mb-2">
            {t("store.review.bodyLabel")} <span className="text-text-muted">{t("store.review.optional")}</span>
          </label>
          <textarea
            id="reviewBody"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("store.review.bodyPlaceholder")}
            className="w-full neu-input rounded-xl px-4 py-3 transition-all resize-none"
          />
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 text-danger text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-brand-500 text-white font-bold text-lg py-4 rounded-2xl transition-all neu-btn disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? t("store.review.submitting") : t("store.review.submitLabel")}
        </button>
      </form>
    </div>
  );
}
