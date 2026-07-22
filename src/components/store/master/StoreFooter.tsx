"use client";

import Link from "next/link";
import { useLocale } from "@/features/i18n/i18n.hooks";

/**
 * Store-specific footer — kept separate from `src/components/landing/Footer.tsx`
 * so the funnel's footer can evolve independently (per plan constraints).
 */
export default function StoreFooter() {
  const { t } = useLocale();

  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-start">
            <h3 className="font-heading text-2xl font-bold text-brand-600 dark:text-brand-400 mb-2">
              {t("store.footer.brand")}
            </h3>
            <p className="text-text-muted text-sm">
              {t("store.footer.tagline")}
            </p>
          </div>

          <div className="flex items-center gap-6 text-text-muted text-sm">
            <span>© {new Date().getFullYear()} {t("store.footer.copyright")}</span>
            <Link
              href="/privacy"
              className="hover:text-text-primary transition-colors underline underline-offset-4"
            >
              {t("store.footer.privacy")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
