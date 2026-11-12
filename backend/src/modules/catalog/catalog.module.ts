import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity";
import { CatalogAdmin, CatalogFacade, CatalogQueries } from "./application/catalog.use-cases";
import { CATALOG_STORE } from "./domain/ports";
import { CatalogRepository } from "./infrastructure/catalog.repository";
import { CatalogAdminController, CatalogN8nController, CatalogPublicController } from "./presentation/catalog.controllers";

@Module({
  imports: [IdentityModule],
  controllers: [CatalogPublicController, CatalogAdminController, CatalogN8nController],
  providers: [{ provide: CATALOG_STORE, useClass: CatalogRepository }, CatalogQueries, CatalogAdmin, CatalogFacade],
  exports: [CatalogFacade, CatalogQueries],
})
export class CatalogModule {}
