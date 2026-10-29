/**
 * Leaflet default-marker icon fix for bundlers.
 *
 * Leaflet's CSS points marker icons at relative paths that break under Vite.
 * Importing the images as assets and wiring them into the default icon makes
 * markers render everywhere. Import this module once before creating a map.
 */
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/** Kolkata — sensible default centre for this org's branches. */
export const DEFAULT_CENTER: [number, number] = [22.5726, 88.3639];

export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const cartoKey = (import.meta as any).env?.VITE_CARTO_API_KEY;

/** Apple/Google Maps-style clean navigation tiles (OpenStreetMap Humanitarian, 100% free with no watermark) */
export const NAVIGATION_TILE_URL = cartoKey
  ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoKey}`
  : "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png";

export const NAVIGATION_ATTRIBUTION = cartoKey
  ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles by <a href="https://www.hotosm.org/">HOT</a>';

export { L };
