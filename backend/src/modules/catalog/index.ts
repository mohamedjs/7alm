/** Public API of the catalog module. */
export { CatalogModule } from "./catalog.module";
export { CatalogFacade, CatalogQueries } from "./application/catalog.use-cases";
export { lineTotal, canOrder, type PricedProduct, type QuantityPriceTier } from "./domain/product";
export type { ProductDto, CategoryDto } from "./domain/catalog.types";
export { toProductDto } from "./infrastructure/catalog.mappers";
