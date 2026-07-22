import { customerService } from "@/features/customers/customers.service";
import { productService } from "@/features/products/products.service";
import { geoService } from "@/features/geo/geo.service";
import { shippingFactory } from "@/features/shipping/shipping.factory";
import { orderRepository } from "./orders.repository";
import type {
  CreateOrderInput,
  N8nOrderNotification,
  OrderWithDetails,
  Product,
  ShippingProviderName,
} from "@/features/shared/types";

export class OrderService {
  /**
   * Process a new order from the landing page form submission.
   * 1. Find or create customer by phone
   * 2. Create address
   * 3. Create order with IP data and platform source
   */
  async processNewOrder(
    input: CreateOrderInput
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      // 1. Find or create customer
      const customer = await customerService.findOrCreate(
        input.phone,
        input.full_name,
        input.email
      );
      if (!customer) {
        return { success: false, error: "Failed to create/find customer" };
      }

      // 2. Create address
      const address = await orderRepository.createAddress(
        customer.id,
        input.zone_id,
        input.street_details
      );
      if (!address) {
        return { success: false, error: "Failed to create address" };
      }

      // 3. Determine total price from product (tiered-pricing aware)
      let totalPrice = 0;
      let productId: string | undefined;
      if (input.product_id) {
        const product = await productService.getProductById(input.product_id);
        if (product) {
          productId = product.id;
          const quantity = input.quantity || 1;
          totalPrice = this.calculateLineTotal(product, quantity);
        }
      }

      // 4. Create order
      const order = await orderRepository.createOrder({
        customer_id: customer.id,
        address_id: address.id,
        product_id: productId,
        quantity: input.quantity || 1,
        total_price: totalPrice,
        platform_source: input.platform_source,
        ip_address: input.ip_address,
        ip_country: input.ip_country,
        ip_city: input.ip_city,
      });

      if (!order) {
        return { success: false, error: "Failed to create order" };
      }

      return { success: true, orderId: order.id };
    } catch (err) {
      console.error("Error processing order:", err);
      return { success: false, error: "Internal server error" };
    }
  }

  /**
   * Resolve a line's total price for `quantity` units of `product`,
   * honoring quantity-tier pricing when configured. Shared by
   * `processNewOrder` (single-product funnel) and `processCartOrder`
   * (multi-item cart) so both price identically.
   */
  private calculateLineTotal(product: Product, quantity: number): number {
    const tiers = product.quantity_prices;
    if (tiers && Array.isArray(tiers) && tiers.length > 0) {
      // Sort tiers by min_quantity descending to match the highest applicable tier first
      const sortedTiers = [...tiers].sort((a, b) => b.min_quantity - a.min_quantity);
      const matchingTier = sortedTiers.find((t) => quantity >= t.min_quantity);

      if (matchingTier) {
        if (quantity === matchingTier.min_quantity) {
          return matchingTier.price;
        }
        // If quantity exceeds the tier min_quantity, scale by the unit price of this tier
        const unitPrice = matchingTier.price / matchingTier.min_quantity;
        return unitPrice * quantity;
      }
      // Fallback if quantity is less than any tier's min_quantity
      return product.price * quantity;
    }
    // Fallback to base product price if no tiers are configured
    return product.price * quantity;
  }

  /**
   * Process a multi-item cart checkout — the `(store)` surface's
   * counterpart to `processNewOrder`. Unit prices are always resolved
   * server-side from the DB (never trusted from the client).
   *
   * `orders.product_id`/`quantity` are populated from the FIRST resolved
   * item so every existing single-product reader (`OrdersTable`,
   * `OrderDetailsDrawer`, n8n's legacy top-level fields) keeps rendering
   * something correct; the full breakdown lives in `order_items`, read
   * back via `OrderWithDetails.items`.
   */
  async processCartOrder(
    input: CreateOrderInput
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    if (!input.items || input.items.length === 0) {
      return { success: false, error: "No items provided for cart order" };
    }

    try {
      // 1. Find or create customer
      const customer = await customerService.findOrCreate(
        input.phone,
        input.full_name,
        input.email
      );
      if (!customer) {
        return { success: false, error: "Failed to create/find customer" };
      }

      // 2. Create address
      const address = await orderRepository.createAddress(
        customer.id,
        input.zone_id,
        input.street_details
      );
      if (!address) {
        return { success: false, error: "Failed to create address" };
      }

      // 3. Validate every product and resolve server-side prices
      const resolvedItems: Array<{
        product_id: string;
        quantity: number;
        unit_price: number;
        total_price: number;
      }> = [];

      for (const item of input.items) {
        const product = await productService.getProductById(item.product_id);
        if (!product) {
          return { success: false, error: `Product ${item.product_id} not found` };
        }
        const quantity = Math.max(1, item.quantity || 1);
        resolvedItems.push({
          product_id: product.id,
          quantity,
          unit_price: product.price,
          total_price: this.calculateLineTotal(product, quantity),
        });
      }

      const totalPrice = resolvedItems.reduce((sum, i) => sum + i.total_price, 0);
      const firstItem = resolvedItems[0];

      // 4. Create the orders row (product_id/quantity from the first item
      // — see doc comment above)
      const order = await orderRepository.createOrder({
        customer_id: customer.id,
        address_id: address.id,
        product_id: firstItem.product_id,
        quantity: firstItem.quantity,
        total_price: totalPrice,
        platform_source: input.platform_source,
        ip_address: input.ip_address,
        ip_country: input.ip_country,
        ip_city: input.ip_city,
      });

      if (!order) {
        return { success: false, error: "Failed to create order" };
      }

      // 5. Persist the full line-item breakdown
      await orderRepository.createOrderItems(order.id, resolvedItems);

      return { success: true, orderId: order.id };
    } catch (err) {
      console.error("Error processing cart order:", err);
      return { success: false, error: "Internal server error" };
    }
  }

  /**
   * Admin approves a pending order.
   * Changes status to 'approved' and sends WhatsApp confirmation to customer.
   * Shipping is NOT triggered here — it waits for customer confirmation via WhatsApp.
   */
  async approveOrder(
    orderId: string,
    providerName?: ShippingProviderName
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const order = await orderRepository.getOrderById(orderId);
      if (!order) {
        return { success: false, error: "Order not found" };
      }
      if (order.status !== "pending") {
        return {
          success: false,
          error: `Order is already ${order.status}`,
        };
      }

      // Store the selected shipping provider for later use when order is confirmed
      const selectedProvider =
        providerName ||
        (process.env.DEFAULT_SHIPPING_PROVIDER as ShippingProviderName) ||
        "bosta";

      // Update order status to 'approved' with the shipping provider choice
      await orderRepository.updateOrderStatus(
        orderId,
        "approved",
        selectedProvider
      );

      // Decrement stock
      if (order.product_id) {
        await productService.decrementStock(order.product_id, order.quantity);
      }

      // Notify n8n → sends WhatsApp with accept/cancel buttons to customer
      this.notifyN8n(order, "approved");

      return { success: true };
    } catch (err) {
      console.error("Error approving order:", err);
      return { success: false, error: "Internal server error" };
    }
  }

  /**
   * Customer confirms order via WhatsApp button press.
   * Changes status to 'confirmed' and triggers shipping provider to create delivery.
   */
  async confirmOrder(
    orderId: string
  ): Promise<{
    success: boolean;
    trackingId?: string;
    error?: string;
  }> {
    try {
      const order = await orderRepository.getOrderById(orderId);
      if (!order) {
        return { success: false, error: "Order not found" };
      }
      if (order.status !== "approved") {
        return {
          success: false,
          error: `Order cannot be confirmed — current status is "${order.status}"`,
        };
      }

      // Get the zone info for shipping
      const zone = await geoService.getZoneById(order.address.zone_id);
      if (!zone) {
        return { success: false, error: "Zone not found" };
      }

      // Use the shipping provider that was saved when admin approved
      const selectedProvider =
        (order.shipping_provider as ShippingProviderName) ||
        (process.env.DEFAULT_SHIPPING_PROVIDER as ShippingProviderName) ||
        "bosta";
      const shippingProvider = shippingFactory.getProvider(selectedProvider);

      // Create delivery with the shipping provider
      const shippingResult = await shippingProvider.createDelivery({
        orderId: order.id,
        customerName: order.customer.full_name,
        customerPhone: order.customer.phone,
        city: zone.city?.name || "Cairo",
        zone: zone.english_name,
        streetAddress: order.address.street_details,
        cod: order.total_price,
        notes: order.platform_source
          ? `Platform: ${order.platform_source}`
          : undefined,
      });

      if (!shippingResult.success) {
        // If shipping fails, still mark as confirmed so admin can retry manually
        await orderRepository.updateOrderStatus(orderId, "confirmed");
        return {
          success: false,
          error: `Order confirmed but shipping failed: ${shippingResult.error}`,
        };
      }

      // Update order status to 'confirmed' with tracking info
      await orderRepository.updateOrderStatus(
        orderId,
        "confirmed",
        selectedProvider,
        shippingResult.trackingId
      );

      // Notify n8n → sends "order confirmed, shipping soon" message
      // Re-fetch order with updated tracking info
      const updatedOrder = await orderRepository.getOrderById(orderId);
      if (updatedOrder) {
        this.notifyN8n(updatedOrder, "confirmed");
      }

      return { success: true, trackingId: shippingResult.trackingId };
    } catch (err) {
      console.error("Error confirming order:", err);
      return { success: false, error: "Internal server error" };
    }
  }

  /**
   * Cancel an order. Can be called by admin or by customer via WhatsApp.
   */
  async cancelOrder(
    orderId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const order = await orderRepository.getOrderById(orderId);
      if (!order) {
        return { success: false, error: "Order not found" };
      }

      // Can only cancel if pending or approved (not yet shipped)
      if (!["pending", "approved"].includes(order.status)) {
        return {
          success: false,
          error: `Cannot cancel order — current status is "${order.status}"`,
        };
      }

      // If stock was decremented on approval, restore it
      if (
        order.status === "approved" &&
        order.product_id
      ) {
        await productService.incrementStock(order.product_id, order.quantity);
      }

      await orderRepository.updateOrderStatus(orderId, "cancelled");

      // Notify n8n → sends cancellation WhatsApp message
      this.notifyN8n(order, "cancelled");

      return { success: true };
    } catch (err) {
      console.error("Error cancelling order:", err);
      return { success: false, error: "Internal server error" };
    }
  }

  /**
   * Change order status (used by the State Machine)
   */
  async changeOrderStatus(
    orderId: string,
    newStatus: string,
    providerName?: ShippingProviderName
  ): Promise<{ success: boolean; trackingId?: string; error?: string }> {
    if (newStatus === "approved") {
      return this.approveOrder(orderId, providerName);
    }

    if (newStatus === "confirmed") {
      return this.confirmOrder(orderId);
    }

    if (newStatus === "cancelled") {
      const result = await this.cancelOrder(orderId);
      return result;
    }
    
    // For other status changes
    try {
      const order = await orderRepository.getOrderById(orderId);
      if (!order) {
        return { success: false, error: "Order not found" };
      }

      await orderRepository.updateOrderStatus(orderId, newStatus);

      // Notify n8n for WhatsApp notification (non-blocking)
      this.notifyN8n(order, newStatus);

      return { success: true };
    } catch (err) {
      console.error(`Error changing order status to ${newStatus}:`, err);
      return { success: false, error: "Internal server error" };
    }
  }

  /**
   * Public method to notify n8n about a status change.
   * Used by shipping webhooks that update order status externally.
   */
  async notifyStatusChange(orderId: string, newStatus: string): Promise<void> {
    const order = await orderRepository.getOrderById(orderId);
    if (order) {
      this.notifyN8n(order, newStatus);
    }
  }

  /**
   * Find the sender's order awaiting WhatsApp confirmation (status 'approved').
   * Accepts the phone in any common WhatsApp form (2010..., +2010..., 010...)
   * and normalizes it to the 11-digit local format stored in customers.phone.
   */
  async getOrderAwaitingConfirmation(
    rawPhone: string
  ): Promise<OrderWithDetails | null> {
    let digits = rawPhone.replace(/\D/g, "");
    if (digits.startsWith("0020")) digits = digits.slice(4);
    else if (digits.startsWith("20")) digits = digits.slice(2);
    if (!digits.startsWith("0")) digits = "0" + digits;
    return orderRepository.getLatestApprovedOrderByPhone(digits);
  }

  async getPendingOrders(): Promise<OrderWithDetails[]> {
    return orderRepository.getPendingOrders();
  }

  async getAllOrders(): Promise<OrderWithDetails[]> {
    return orderRepository.getAllOrders();
  }

  /**
   * Notify n8n about an order status change to trigger WhatsApp notifications.
   * This is fire-and-forget — failures are logged but never block the order flow.
   */
  private notifyN8n(order: OrderWithDetails, newStatus: string): void {
    const n8nWebhookUrl = process.env.N8N_ORDER_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      return; // n8n integration not configured — skip silently
    }

    const payload: N8nOrderNotification = {
      orderId: order.id,
      newStatus,
      customerPhone: order.customer.phone,
      customerName: order.customer.full_name,
      productName: order.product?.name || "طلبك",
      trackingId: order.shipping_tracking_id,
      totalPrice: order.total_price,
      quantity: order.quantity,
      // Always populated: today every order is single-product (order_items
      // multi-item carts land in a later phase), so this is a one-element
      // array derived from the existing legacy fields — never from order_items.
      items: [
        {
          productName: order.product?.name || "طلبك",
          quantity: order.quantity,
          unitPrice: order.product?.price ?? (order.quantity ? order.total_price / order.quantity : order.total_price),
          totalPrice: order.total_price,
        },
      ],
    };

    // Fire-and-forget — don't await
    fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error("Failed to notify n8n:", err);
    });
  }
}

export const orderService = new OrderService();
