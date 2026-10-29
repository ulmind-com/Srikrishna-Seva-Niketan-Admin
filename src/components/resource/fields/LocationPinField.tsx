import { useEffect, useRef } from "react";
import { useController, type Control } from "react-hook-form";
import { MapPin, X } from "lucide-react";
import {
  DEFAULT_CENTER,
  L,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from "@/components/common/leaflet-setup";
import { Button } from "@/components/ui/button";

interface LocationPinFieldProps {
  control: Control;
  latName: string;
  lngName: string;
}

/**
 * A map pin picker that writes flat `lat` / `lng` form values.
 *
 * Optional — leave the pin unset and the backend geocodes the address on save.
 * Click the map or drag the marker to set an exact point.
 */
export function LocationPinField({ control, latName, lngName }: LocationPinFieldProps) {
  const lat = useController({ control, name: latName });
  const lng = useController({ control, name: lngName });

  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keep the latest setters in a ref so the init effect runs once.
  const setPoint = useRef<(la: number, ln: number) => void>(() => {});
  setPoint.current = (la, ln) => {
    lat.field.onChange(Number(la.toFixed(6)));
    lng.field.onChange(Number(ln.toFixed(6)));
  };

  const hasPin = lat.field.value != null && lng.field.value != null;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start: [number, number] = hasPin
      ? [Number(lat.field.value), Number(lng.field.value)]
      : DEFAULT_CENTER;
    const map = L.map(containerRef.current).setView(start, hasPin ? 15 : 11);
    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);

    const place = (la: number, ln: number) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([la, ln]);
      } else {
        const m = L.marker([la, ln], { draggable: true }).addTo(map);
        m.on("dragend", () => {
          const p = m.getLatLng();
          setPoint.current(p.lat, p.lng);
        });
        markerRef.current = m;
      }
      setPoint.current(la, ln);
    };

    if (hasPin) place(Number(lat.field.value), Number(lng.field.value));
    map.on("click", (e: L.LeafletMouseEvent) => place(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearPin = () => {
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    lat.field.onChange(null);
    lng.field.onChange(null);
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-56 w-full overflow-hidden rounded-lg border border-border"
        style={{ zIndex: 0 }}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {hasPin
            ? `Pinned: ${Number(lat.field.value).toFixed(5)}, ${Number(lng.field.value).toFixed(5)}`
            : "No pin — the address will be geocoded on save."}
        </span>
        {hasPin && (
          <Button type="button" variant="ghost" size="sm" onClick={clearPin}>
            <X className="mr-1 h-3.5 w-3.5" /> Clear pin
          </Button>
        )}
      </div>
    </div>
  );
}
