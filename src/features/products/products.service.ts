import { productRepository } from "./products.repository";
import type { ActiveProductDto, Product } from "@/features/shared/types";

export class ProductService {
  async getActiveProduct(): Promise<Product[] | null> {
    return productRepository.getActiveProduct();
  }

  async getActiveProductForAgent(): Promise<ActiveProductDto[] | null> {
    const products = await productRepository.getActiveProduct();
    if (!products || products.length === 0) return null;

    return products.map(product => {
      const discountPercentage =
        product.compare_at_price && product.compare_at_price > product.price
          ? Math.round(
              ((product.compare_at_price - product.price) /
                product.compare_at_price) *
                100
            )
          : 0;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        availability: {
          status: product.stock_status,
          available_quantity: product.quantity,
          can_order: product.stock_status !== "out_of_stock" && product.quantity > 0,
        },
        pricing: {
          currency: "EGP",
          unit_price: product.price,
          compare_at_price: product.compare_at_price,
          discount_percentage: discountPercentage,
        },
        quantity_offers: (product.quantity_prices ?? []).map((tier) => ({
          min_quantity: tier.min_quantity,
          label: tier.label,
          unit_price: tier.price,
          compare_at_price: tier.compare_at_price,
          is_special: tier.is_special,
        })),
      };
    });
  }

  async getProductById(id: string): Promise<Product | null> {
    return productRepository.getProductById(id);
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    return productRepository.getProductBySlug(slug);
  }

  async decrementStock(productId: string, quantity: number): Promise<boolean> {
    const product = await productRepository.getProductById(productId);
    if (!product) return false;
    if (product.quantity < quantity) return false;
    return productRepository.updateStock(productId, -quantity);
  }

  async incrementStock(productId: string, quantity: number): Promise<boolean> {
    return productRepository.updateStock(productId, quantity);
  }
}

export const productService = new ProductService();

