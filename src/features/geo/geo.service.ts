import { geoRepository } from "./geo.repository";

export class GeoService {
  async getZonesForDropdown() {
    const zones = await geoRepository.getAllZones();
    return zones.map((z) => ({
      id: z.id,
      arabic_name: z.arabic_name,
      english_name: z.english_name,
      city_name: z.city?.name || "",
    }));
  }

  async getZoneById(zoneId: string) {
    return geoRepository.getZoneById(zoneId);
  }
}

export const geoService = new GeoService();
