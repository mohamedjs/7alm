"use client";

import { useCustomersManager } from "@/features/customers/customers.hooks";
import { CustomerList } from "@/components/admin/customers/CustomerList";
import { useLocale } from "@/features/i18n/i18n.hooks";

export default function CustomersPage() {
  const {
    customers,
    totalCount,
    page,
    pageSize,
    isLoading,
    searchQuery,
    setSearchQuery,
    setPage,
  } = useCustomersManager();
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">{t("crm.title")}</h1>
      </div>

      <CustomerList
        customers={customers}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onPageChange={setPage}
      />
    </div>
  );
}
