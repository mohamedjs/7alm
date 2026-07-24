"use client";

import { use } from "react";
import { useCustomerDetail } from "@/features/customers/customers.hooks";
import { useWhatsAppChat } from "@/features/whatsapp/whatsapp.hooks";
import { CustomerDetail } from "@/components/admin/customers/CustomerDetail";
import { WhatsAppChat } from "@/components/admin/customers/WhatsAppChat";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { customer, stats, orders, address, isLoading, updateCustomer } =
    useCustomerDetail(id);
  const {
    messages,
    isLoading: isMessagesLoading,
    isSending,
    composeText,
    setComposeText,
    sendMessage,
  } = useWhatsAppChat(id);

  return (
    <div className="space-y-6">
      <CustomerDetail
        customer={customer}
        stats={stats}
        orders={orders}
        address={address}
        isLoading={isLoading}
        onSaveNotes={(notes) => updateCustomer({ notes })}
      />

      <WhatsAppChat
        messages={messages}
        isLoading={isMessagesLoading}
        isSending={isSending}
        composeText={composeText}
        onComposeChange={setComposeText}
        onSend={sendMessage}
      />
    </div>
  );
}
