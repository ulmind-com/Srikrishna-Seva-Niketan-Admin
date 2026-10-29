import { endpoints } from "./api/endpoints";
import { http } from "./api/http";

export interface GeocodeResult {
  found: boolean;
  lat: number | null;
  lng: number | null;
  formatted_address: string | null;
  location_type: string | null;
  is_approximate: boolean;
  results_count: number;
}

export const geoService = {
  /** Converts address text to confirmed lat/lng via backend Ola Maps Places API. */
  geocode: (address: string) =>
    http.get<GeocodeResult>(endpoints.geo.geocode, { address }),
};
