"use client";

import { X } from "lucide-react";
import type { CouponInput, CouponType } from "@/features/shared/types";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface CouponFormProps {
  formData: CouponInput;
  setFormData: (data: CouponInput) => void;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
  isEditing: boolean;
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function CouponForm({
  formData,
  setFormData,
  isSaving,
  onSave,
  onClose,
  isEditing,
}: CouponFormProps) {
  const { t } = useLocale();

  const inputClasses = "w-full neu-input rounded-xl px-3 py-2 transition-all";
  const labelClasses = "block text-sm font-medium text-text-muted mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto neu-raised">
        <div className="flex items-center justify-between p-6 border-b border-border/20">
          <h2 className="text-xl font-semibold text-text-primary">
            {isEditing ? t("coupons.form.editTitle") : t("coupons.form.addTitle")}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary rounded-xl p-1 transition-all neu-raised-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>{t("coupons.form.code")}</label>
              <input
                type="text"
                required
                dir="ltr"
                className={inputClasses}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className={labelClasses}>{t("coupons.form.type")}</label>
              <select
                className={inputClasses}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as CouponType })}
              >
                <option value="percentage">{t("coupons.type.percentage")}</option>
                <option value="fixed">{t("coupons.type.fixed")}</option>
                <option value="free_shipping">{t("coupons.type.freeShipping")}</option>
              </select>
            </div>
          </div>

          {formData.type !== "free_shipping" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>
                  {formData.type === "percentage"
                    ? t("coupons.form.valuePercent")
                    : t("coupons.form.valueFixed")}
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClasses}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                />
              </div>
              {formData.type === "percentage" && (
                <div>
                  <label className={labelClasses}>{t("coupons.form.maxDiscount")}</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputClasses}
                    value={formData.max_discount ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_discount: e.target.value === "" ? null : parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className={labelClasses}>{t("coupons.form.minOrderTotal")}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClasses}
              value={formData.min_order_total ?? 0}
              onChange={(e) =>
                setFormData({ ...formData, min_order_total: parseFloat(e.target.value) || 0 })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>{t("coupons.form.perCustomerLimit")}</label>
              <input
                type="number"
                min={0}
                className={inputClasses}
                value={formData.per_customer_limit ?? ""}
                placeholder={t("coupons.form.unlimited")}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    per_customer_limit: e.target.value === "" ? null : parseInt(e.target.value, 10),
                  })
                }
              />
            </div>
            <div>
              <label className={labelClasses}>{t("coupons.form.usageLimit")}</label>
              <input
                type="number"
                min={0}
                className={inputClasses}
                value={formData.usage_limit ?? ""}
                placeholder={t("coupons.form.unlimited")}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    usage_limit: e.target.value === "" ? null : parseInt(e.target.value, 10),
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>{t("coupons.form.startsAt")}</label>
              <input
                type="date"
                dir="ltr"
                className={inputClasses}
                value={toDateInputValue(formData.starts_at)}
                onChange={(e) => setFormData({ ...formData, starts_at: e.target.value || null })}
              />
            </div>
            <div>
              <label className={labelClasses}>{t("coupons.form.expiresAt")}</label>
              <input
                type="date"
                dir="ltr"
                className={inputClasses}
                value={toDateInputValue(formData.expires_at)}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value || null })}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded accent-brand-500 w-4 h-4"
                checked={formData.first_order_only ?? false}
                onChange={(e) => setFormData({ ...formData, first_order_only: e.target.checked })}
              />
              <span className="text-sm font-medium text-text-muted">{t("coupons.form.firstOrderOnly")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded accent-brand-500 w-4 h-4"
                checked={formData.is_active ?? true}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span className="text-sm font-medium text-text-muted">{t("coupons.form.active")}</span>
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-border/20 bg-surface flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-text-muted hover:text-text-primary rounded-xl transition-all neu-raised-sm"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 bg-brand-500 text-white rounded-xl transition-all disabled:opacity-50 neu-btn"
          >
            {isSaving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
