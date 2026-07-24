"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useCouponsManager } from "@/features/coupons/coupons.hooks";
import { CouponList } from "@/components/admin/coupons/CouponList";
import { CouponForm } from "@/components/admin/coupons/CouponForm";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { Coupon } from "@/features/shared/types";

export default function CouponsPage() {
  const { t } = useLocale();
  const {
    coupons,
    isLoading,
    formData,
    setFormData,
    editingCoupon,
    startCreate,
    startEdit,
    saveCoupon,
    removeCoupon,
    createState,
    updateState,
  } = useCouponsManager();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const openCreate = () => {
    startCreate();
    setIsFormOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    startEdit(coupon);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    try {
      await saveCoupon(formData);
      setIsFormOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("coupons.saveFailed");
      alert(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t("coupons.title")}</h1>
          <p className="text-text-muted">{t("coupons.subtitle")}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-white transition-all neu-btn"
        >
          <Plus className="h-4 w-4" />
          {t("coupons.add")}
        </button>
      </div>

      <div className="rounded-2xl bg-surface neu-raised">
        <CouponList coupons={coupons} isLoading={isLoading} onEdit={openEdit} onDelete={removeCoupon} />
      </div>

      {isFormOpen && (
        <CouponForm
          formData={formData}
          setFormData={setFormData}
          isSaving={createState.isLoading || updateState.isLoading}
          onSave={handleSave}
          onClose={() => setIsFormOpen(false)}
          isEditing={!!editingCoupon}
        />
      )}
    </div>
  );
}
