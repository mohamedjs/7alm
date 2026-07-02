import type { IShippingProvider } from "./shipping.interface";
import type { ShippingProviderName } from "@/features/shared/types";
import { BostaProvider } from "./providers/bosta.provider";
import { AbsProvider } from "./providers/abs.provider";
import { MylerzProvider } from "./providers/mylerz.provider";

/**
 * Shipping Factory — Factory Pattern for logistics providers.
 *
 * Supports dynamic provider selection:
 * - Bosta (fully implemented)
 * - ABS (placeholder — add integration when ready)
 * - Mylerz (placeholder — add integration when ready)
 *
 * Usage:
 *   const provider = shippingFactory.getProvider('bosta');
 *   const result = await provider.createDelivery(input);
 *
 * To add a new provider:
 *   1. Create a new class implementing IShippingProvider
 *   2. Add it to the providers map in this factory
 *   3. Add the provider name to ShippingProviderName type
 */
class ShippingFactory {
  private providers: Map<ShippingProviderName, IShippingProvider>;

  constructor() {
    this.providers = new Map();
    this.registerProvider("bosta", new BostaProvider());
    this.registerProvider("abs", new AbsProvider());
    this.registerProvider("mylerz", new MylerzProvider());
  }

  /**
   * Register a new shipping provider
   */
  registerProvider(name: ShippingProviderName, provider: IShippingProvider) {
    this.providers.set(name, provider);
  }

  /**
   * Get a shipping provider by name
   * Falls back to Bosta if the requested provider is not found
   */
  getProvider(name: ShippingProviderName): IShippingProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      console.warn(
        `Shipping provider "${name}" not found. Falling back to Bosta.`
      );
      return this.providers.get("bosta")!;
    }
    return provider;
  }

  /**
   * List all registered provider names
   */
  getAvailableProviders(): ShippingProviderName[] {
    return Array.from(this.providers.keys());
  }
}

// Singleton instance
export const shippingFactory = new ShippingFactory();
