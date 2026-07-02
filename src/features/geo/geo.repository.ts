import { supabase } from "@/lib/supabase";
import type { ZoneWithCity } from "@/features/shared/types";

export class GeoRepository {
  async getAllZones(): Promise<ZoneWithCity[]> {
    const { data, error } = await supabase
      .from("zones")
      .select(
        `
        id,
        city_id,
        english_name,
        arabic_name,
        city:cities (
          name,
          country:countries (
            name
          )
        )
      `
      )
      .order("arabic_name", { ascending: true });

    if (error) {
      console.error("Error fetching zones:", error);
      return [];
    }

    // Supabase returns nested objects; reshape them
    return (data || []).map((zone: Record<string, unknown>) => ({
      id: zone.id as string,
      city_id: zone.city_id as string,
      english_name: zone.english_name as string,
      arabic_name: zone.arabic_name as string,
      city: zone.city as unknown as { name: string; country: { name: string } },
    }));
  }

  async getZoneById(
    zoneId: string
  ): Promise<ZoneWithCity | null> {
    const { data, error } = await supabase
      .from("zones")
      .select(
        `
        id,
        city_id,
        english_name,
        arabic_name,
        city:cities (
          name,
          country:countries (
            name
          )
        )
      `
      )
      .eq("id", zoneId)
      .single();

    if (error) {
      console.error("Error fetching zone:", error);
      return null;
    }

    return {
      id: data.id,
      city_id: data.city_id,
      english_name: data.english_name,
      arabic_name: data.arabic_name,
      city: data.city as unknown as { name: string; country: { name: string } },
    };
  }
}

export const geoRepository = new GeoRepository();
