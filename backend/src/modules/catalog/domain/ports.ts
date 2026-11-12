import type { CategoryDto, CategoryWrite, ProductDto, ProductWrite } from "./catalog.types";

export const CATALOG_STORE = Symbol("CATALOG_STORE");

/** Persistence port for the catalog (implemented by CatalogRepository). */
export interface CatalogStore {
  listProducts(where?: { activeOnly?: boolean; featured?: boolean; categoryIds?: string[] }): Promise<ProductDto[]>;
  findProductById(id: string, tx?: unknown): Promise<ProductDto | null>;
  findProductsByIds(ids: string[], tx?: unknown): Promise<ProductDto[]>;
  findActiveProductBySlug(slug: string): Promise<ProductDto | null>;
  searchActive(query: string, limit?: number): Promise<ProductDto[]>;
  orderCountsByProduct(): Promise<Map<string, number>>;
  createProduct(input: ProductWrite): Promise<ProductDto>;
  updateProduct(id: string, input: ProductWrite): Promise<ProductDto>;
  deleteProduct(id: string): Promise<void>;
  adjustStock(productId: string, delta: number, tx?: unknown): Promise<boolean>;
  listCategories(activeOnly: boolean): Promise<CategoryDto[]>;
  findCategoryBySlug(slug: string): Promise<CategoryDto | null>;
  createCategory(input: CategoryWrite): Promise<CategoryDto>;
  updateCategory(id: string, input: CategoryWrite): Promise<CategoryDto>;
  deleteCategory(id: string): Promise<void>;
}
