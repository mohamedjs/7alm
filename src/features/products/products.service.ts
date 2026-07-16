import { productRepository } from "./products.repository";
import type { Product } from "@/features/shared/types";

export class ProductService {
  async getActiveProduct(): Promise<Product | null> {
    return productRepository.getActiveProduct();
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

