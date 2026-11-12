import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity";
import { GeoQueries } from "./application/geo.use-cases";
import { GEO_STORE } from "./domain/zone";
import { GeoRepository } from "./infrastructure/geo.repository";
import { GeoController } from "./presentation/geo.controller";

@Module({
  imports: [IdentityModule],
  controllers: [GeoController],
  providers: [{ provide: GEO_STORE, useClass: GeoRepository }, GeoQueries],
  exports: [GeoQueries],
})
export class GeoModule {}
