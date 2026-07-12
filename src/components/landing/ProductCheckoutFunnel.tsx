"use client";

import { useState } from "react";
import CheckoutSummary from "./CheckoutSummary";
import CheckoutForm from "./CheckoutForm";
import type { Product } from "@/features/shared/types";

interface ProductCheckoutFunnelProps {
  product: Product;
  discountPercent: number | null;
  gallery: string[];
}

export default function ProductCheckoutFunnel({
  product,
  discountPercent,
  gallery,
}: ProductCheckoutFunnelProps) {
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  return (
    <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
      {/* Right Column (RTL) - Product Summary & Urgency */}
      <div className="lg:col-span-7 space-y-6">
        <CheckoutSummary
          productName={product.name}
          productPrice={product.price}
          compareAtPrice={product.compare_at_price}
          discountPercent={discountPercent}
          description={product.description}
          gallery={gallery}
          quantityPrices={product.quantity_prices}
          onSelectQuantity={setSelectedQuantity}
        />
      </div>

      {/* Left Column (RTL) - Checkout Form */}
      <div className="lg:col-span-5 sticky top-8">
        <CheckoutForm productId={product.id} quantity={selectedQuantity} />
      </div>
    </div>
  );
}
