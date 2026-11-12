import { SkipThrottle } from "@nestjs/throttler";
import { Body, Controller, Delete, Get, NotFoundException, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AdminGuard, N8nGuard } from "../../identity";
import { ZodPipe } from "../../../shared/infrastructure/http/zod.pipe";
import { CatalogAdmin, CatalogQueries } from "../application/catalog.use-cases";
import { CategoryBody, ProductBody } from "./catalog.schemas";

/** Public storefront / landing reads. Not throttled: Server Components call these from one internal IP. */
@Controller()
@SkipThrottle()
export class CatalogPublicController {
  constructor(private readonly queries: CatalogQueries) {}

  @Get("products")
  list(@Query("category") category?: string, @Query("featured") featured?: string) {
    if (featured === "true") return this.queries.featured();
    if (category) return this.queries.byCategory(category);
    return this.queries.allActive();
  }

  @Get("products/active")
  async active() {
    const products = await this.queries.allActive();
    if (products.length === 0) throw new NotFoundException("No active products found");
    return products;
  }

  @Get("products/best-sellers")
  bestSellers(@Query("limit") limit?: string) {
    return this.queries.bestSellers(Math.min(Math.max(Number(limit) || 8, 1), 48));
  }

  @Get("products/search")
  search(@Query("q") q = "") {
    return this.queries.search(q);
  }

  @Get("products/:slug")
  async bySlug(@Param("slug") slug: string) {
    const product = await this.queries.bySlug(slug);
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  @Get("categories")
  categories() {
    return this.queries.activeCategories();
  }

  @Get("categories/:slug")
  async category(@Param("slug") slug: string) {
    const category = await this.queries.categoryBySlug(slug);
    if (!category) throw new NotFoundException("Category not found");
    return category;
  }
}

@Controller("admin")
@UseGuards(AdminGuard)
export class CatalogAdminController {
  constructor(private readonly admin: CatalogAdmin) {}

  @Get("products")
  products() {
    return this.admin.listProducts();
  }

  @Post("products")
  createProduct(@Body(new ZodPipe(ProductBody)) body: z.infer<typeof ProductBody>) {
    return this.admin.createProduct(body);
  }

  @Put("products/:id")
  updateProduct(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(ProductBody)) body: z.infer<typeof ProductBody>) {
    return this.admin.updateProduct(id, body);
  }

  @Delete("products/:id")
  async deleteProduct(@Param("id", ParseUUIDPipe) id: string) {
    await this.admin.deleteProduct(id);
  }

  @Get("categories")
  categories() {
    return this.admin.listCategories();
  }

  @Post("categories")
  createCategory(@Body(new ZodPipe(CategoryBody)) body: z.infer<typeof CategoryBody>) {
    return this.admin.createCategory(body);
  }

  @Put("categories/:id")
  updateCategory(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(CategoryBody)) body: z.infer<typeof CategoryBody>) {
    return this.admin.updateCategory(id, body);
  }

  @Delete("categories/:id")
  async deleteCategory(@Param("id", ParseUUIDPipe) id: string) {
    await this.admin.deleteCategory(id);
  }
}

/** Machine endpoints for the n8n sales agent. */
@Controller("n8n/products")
@UseGuards(N8nGuard)
export class CatalogN8nController {
  constructor(private readonly queries: CatalogQueries) {}

  @Get("active")
  async active() {
    const products = await this.queries.forAgent();
    if (products.length === 0) throw new NotFoundException("No active products found");
    return products;
  }
}
