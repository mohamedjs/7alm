"use client";

import { useState, useMemo } from "react";
import type { QuantityPriceTier } from "@/features/shared/types";

interface QuantityPricingProps {
  tiers: QuantityPriceTier[];
  /** Fallback single price (product.price) — used when no tiers exist. */
  basePrice: number;
  baseCompareAtPrice: number | null;
  /** Called when the user selects a tier (updates checkout quantity). */
  onSelectTier?: (tier: QuantityPriceTier) => void;
}

/**
 * Quantity-tier pricing display for the landing page.
 *
 * Renders visually distinct price cards:
 *  - Tier 1 (1 piece): standard card
 *  - Tier 2 (2 pieces): highlighted "special offer" card with badge
 *  - Tier 3 (3 pieces): even more highlighted "best value" card
 *
 * The user clicks a card to select how many pieces they want.
 * The selected tier's min_quantity is passed up via onSelectTier.
 */
export default function QuantityPricing({
  tiers,
  basePrice,
  baseCompareAtPrice,
  onSelectTier,
}: QuantityPricingProps) {
  // If no tiers defined, fall back to a single-price display
  const displayTiers = useMemo<QuantityPriceTier[]>(() => {
    if (tiers.length > 0) return tiers;
    return [
      {
        min_quantity: 1,
        price: basePrice,
        compare_at_price: baseCompareAtPrice,
        label: "قطعة واحدة",
        is_special: false,
      },
    ];
  }, [tiers, basePrice, baseCompareAtPrice]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    onSelectTier?.(displayTiers[index]);
  };

  // Find the best-value tier (lowest per-unit price among special tiers)
  const bestValueIndex = useMemo(() => {
    const specialTiers = displayTiers
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.is_special);
    if (specialTiers.length === 0) return -1;
    let best = specialTiers[0];
    for (const candidate of specialTiers) {
      if (candidate.t.price < best.t.price) best = candidate;
    }
    return best.i;
  }, [displayTiers]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">💰</span>
        <h3 className="font-heading text-lg font-bold text-gray-900">
          اشتري أكثر ووفّر أكثر
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {displayTiers.map((tier, index) => {
          const isSelected = index === selectedIndex;
          const isBestValue = index === bestValueIndex;
          const discountPercent = tier.compare_at_price
            ? Math.round(
                ((tier.compare_at_price - tier.price) / tier.compare_at_price) *
                  100
              )
            : null;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(index)}
              className={`
                relative rounded-2xl p-4 text-center transition-all duration-200 border-2
                ${
                  isSelected
                    ? "border-brand-500 bg-brand-50 scale-[1.02] shadow-lg"
                    : "border-gray-200 bg-white hover:border-brand-300 hover:shadow-md"
                }
                ${tier.is_special && !isSelected ? "border-amber-300 bg-amber-50/50" : ""}
                ${isBestValue ? "ring-2 ring-amber-400 ring-offset-1" : ""}
              `}
              style={
                isSelected
                  ? { borderColor: "#dd6253", backgroundColor: "#fdf4f3" }
                  : isBestValue
                    ? { boxShadow: "0 0 0 2px #fbbf24, 0 4px 12px rgba(0,0,0,0.08)" }
                    : undefined
              }
            >
              {/* Best Value badge */}
              {isBestValue && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                  ⭐ أفضل قيمة
                </div>
              )}

              {/* Special offer badge */}
              {tier.is_special && !isBestValue && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                  عرض خاص
                </div>
              )}

              {/* Quantity label */}
              <div className="text-sm font-bold text-gray-700 mb-1">
                {tier.label}
              </div>

              {/* Price */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="text-2xl font-bold text-gray-900">
                  {tier.price}
                </span>
                <span className="text-sm text-gray-500 font-normal">ج.م</span>
              </div>

              {/* Compare-at price */}
              {tier.compare_at_price && (
                <div className="mt-1">
                  <span className="text-sm text-gray-400 line-through">
                    {tier.compare_at_price} ج.م
                  </span>
                  {discountPercent && (
                    <span className="mr-2 text-xs font-bold text-red-500">
                      -{discountPercent}%
                    </span>
                  )}
                </div>
              )}

              {/* Per-unit price hint for multi-piece tiers */}
              {tier.min_quantity > 1 && (
                <div className="mt-2 text-xs text-gray-500 border-t border-gray-100 pt-2">
                  <span className="text-gray-400">السعر للقطعة: </span>
                  <span className="font-bold text-gray-700">
                    {(tier.price / tier.min_quantity).toFixed(0)} ج.م
                  </span>
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary line for selected tier */}
      {displayTiers[selectedIndex] && (
        <div className="text-center text-sm text-gray-600 bg-gray-50 rounded-xl py-2 px-4">
          {selectedIndex === 0 ? (
            <span>السعر: <strong className="text-gray-900">{displayTiers[selectedIndex].price} ج.م</strong> للقطعة الواحدة</span>
          ) : (
            <span>
              اخترت <strong className="text-gray-900">{displayTiers[selectedIndex].label}</strong> —
              الإجمالي: <strong className="text-brand-600">{displayTiers[selectedIndex].price} ج.م</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
