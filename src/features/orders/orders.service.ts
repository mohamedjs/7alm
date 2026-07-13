import { customerService } from "@/features/customers/customers.service";
import { productService } from "@/features/products/products.service";
import { geoService } from "@/features/geo/geo.service";
import { shippingFactory } from "@/features/shipping/shipping.factory";
import { orderRepository } from "./orders.repository";
import type {
  CreateOrderInput,
  N8nOrderNotification,
  OrderWithDetails,
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

      // 3. Determine total price from product
      let totalPrice = 0;
      let productId: string | undefined;
      if (input.product_id) {
        const product = await productService.getProductById(input.product_id);
        if (product) {
          productId = product.id;
          const quantity = input.quantity || 1;
          const tiers = product.quantity_prices;

          if (tiers && Array.isArray(tiers) && tiers.length > 0) {
            // Sort tiers by min_quantity descending to match the highest applicable tier first
            const sortedTiers = [...tiers].sort((a, b) => b.min_quantity - a.min_quantity);
            const matchingTier = sortedTiers.find((t) => quantity >= t.min_quantity);

            if (matchingTier) {
              if (quantity === matchingTier.min_quantity) {
                totalPrice = matchingTier.price;
              } else {
                // If quantity exceeds the tier min_quantity, scale by the unit price of this tier
                const unitPrice = matchingTier.price / matchingTier.min_quantity;
                totalPrice = unitPrice * quantity;
              }
            } else {
              // Fallback if quantity is less than any tier's min_quantity
              totalPrice = product.price * quantity;
            }
          } else {
            // Fallback to base product price if no tiers are configured
            totalPrice = product.price * quantity;
          }
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
   * Admin approves a pending order.
   * Changes status to 'approved' and triggers shipping provider delivery creation.
   */
  async approveOrder(
    orderId: string,
    providerName?: ShippingProviderName
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
      if (order.status !== "pending") {
        return {
          success: false,
          error: `Order is already ${order.status}`,
        };
      }

      // Get the zone info for shipping
      const zone = await geoService.getZoneById(order.address.zone_id);
      if (!zone) {
        return { success: false, error: "Zone not found" };
      }

      // Use factory pattern to get the shipping provider
      const selectedProvider =
        providerName ||
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
        return {
          success: false,
          error: `Shipping error: ${shippingResult.error}`,
        };
      }

      // Update order status
      await orderRepository.updateOrderStatus(
        orderId,
        "approved",
        selectedProvider,
        shippingResult.trackingId
      );

      // Decrement stock
      if (order.product_id) {
        await productService.decrementStock(order.product_id, order.quantity);
      }

      // Notify n8n for WhatsApp notification (non-blocking)
      this.notifyN8n(order, "approved");

      return { success: true, trackingId: shippingResult.trackingId };
    } catch (err) {
      console.error("Error approving order:", err);
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
