"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { useProductSearch } from "@/features/store/store.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";

/**
 * Toggleable search icon + dropdown panel for the store header — debounced
 * input against `/api/products/search`, results link to `/product/{slug}`.
 * Self-contained: owns its own open/close state (mirrors the admin avatar
 * dropdown's outside-click pattern).
 */
export default function StoreSearchBar() {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, results, isSearching, hasQuery, isTooShort } = useProductSearch();

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={t("store.nav.searchLabel")}
        className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface/70 hover:text-text-primary"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="absolute end-0 top-full z-50 mt-2 w-72 rounded-2xl bg-surface p-3 neu-raised sm:w-80">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("store.nav.searchPlaceholder")}
            className="w-full neu-input rounded-xl px-3 py-2 text-sm transition-all"
          />

          <div className="mt-2 max-h-80 overflow-y-auto">
            {isTooShort && (
              <p className="px-1 py-3 text-center text-xs text-text-muted">
                {t("store.nav.searchTooShort")}
              </p>
            )}
            {!isTooShort && hasQuery && isSearching && (
              <p className="px-1 py-3 text-center text-xs text-text-muted">
                {t("store.nav.searchLoading")}
              </p>
            )}
            {!isTooShort && hasQuery && !isSearching && results.length === 0 && (
              <p className="px-1 py-3 text-center text-xs text-text-muted">
                {t("store.nav.searchEmpty")}
              </p>
            )}
            {results.length > 0 && (
              <ul className="flex flex-col gap-1">
                {results.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/product/${product.slug}`}
                      onClick={close}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 transition-all hover:neu-pressed-sm"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-raised">
                        {product.main_image && (
                          <Image
                            src={product.main_image}
                            alt={product.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {product.name}
                        </p>
                        <p className="text-xs text-text-muted">
                          {product.price} {t("store.product.currency")}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
