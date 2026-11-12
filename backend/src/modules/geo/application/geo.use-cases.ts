import { Inject, Injectable } from "@nestjs/common";
import { CACHE, type Cache } from "../../../shared/application/cache.port";
import { GEO_STORE, toOption, type GeoStore, type ZoneOption } from "../domain/zone";

@Injectable()
export class GeoQueries {
  constructor(
    @Inject(GEO_STORE) private readonly store: GeoStore,
    @Inject(CACHE) private readonly cache: Cache,
  ) {}

  async zoneOptions(): Promise<ZoneOption[]> {
    const key = "cache:geo:zones";
    const hit = await this.cache.getJson<ZoneOption[]>(key).catch(() => null);
    if (hit) return hit;
    const options = (await this.store.listZones()).map(toOption);
    if (options.length > 0) await this.cache.setJson(key, options, 600).catch(() => undefined);
    return options;
  }

  zone(id: string, tx?: unknown) {
    return this.store.findZone(id, tx);
  }
}
