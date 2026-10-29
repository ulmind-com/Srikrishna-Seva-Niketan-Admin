import { useEffect, useRef, useState } from "react";
import { useController, useWatch, type Control } from "react-hook-form";
import { AlertTriangle, CheckCircle2, Loader2, MapPin, Search, X } from "lucide-react";
import {
  DEFAULT_CENTER,
  L,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from "@/components/common/leaflet-setup";
import { Button } from "@/components/ui/button";
import { geoService, type GeocodeResult } from "@/services/geo.service";

interface LocationPinFieldProps {
  control: Control;
  latName: string;
  lngName: string;
  addressName?: string;
}

/**
 * A production-grade map pin picker that writes flat `lat` / `lng` form values.
 *
 * Supports:
 * - Direct 1-click address geocoding via Ola Maps Places API.
 * - Draggable map pin for fine-tuning exact doorstep / customer entrance.
 * - Ambiguity detection: warns admin if address was approximate and asks to verify the pin.
 * - Persistent confirmed coordinates stored directly in MongoDB.
 */
export function LocationPinField({
  control,
  latName,
  lngName,
  addressName = "address",
}: LocationPinFieldProps) {
  const lat = useController({ control, name: latName });
  const lng = useController({ control, name: lngName });
  const rawAddress = useWatch({ control, name: addressName }) as string | undefined;

  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [geocoding, setGeocoding] = useState(false);
  const [geoNotice, setGeoNotice] = useState<{
    type: "success" | "warning" | "error";
    text: string;
  } | null>(null);

  // Keep the latest setters in a ref so the init effect runs once.
  const setPoint = useRef<(la: number, ln: number) => void>(() => {});
  setPoint.current = (la, ln) => {
    lat.field.onChange(Number(la.toFixed(6)));
    lng.field.onChange(Number(ln.toFixed(6)));
  };

  const hasPin = lat.field.value != null && lng.field.value != null;

  const placeMarker = (la: number, ln: number, zoomTo = false) => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([la, ln]);
    } else {
      const m = L.marker([la, ln], { draggable: true }).addTo(map);
      m.bindPopup("Drag pin to set exact customer doorstep location").openPopup();
      m.on("dragend", () => {
        const p = m.getLatLng();
        setPoint.current(p.lat, p.lng);
        setGeoNotice({
          type: "success",
          text: `Exact pin confirmed at ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}.`,
        });
      });
      markerRef.current = m;
    }
    setPoint.current(la, ln);
    if (zoomTo) {
      map.setView([la, ln], 16, { animate: true });
    }
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start: [number, number] = hasPin
      ? [Number(lat.field.value), Number(lng.field.value)]
      : DEFAULT_CENTER;
    const map = L.map(containerRef.current).setView(start, hasPin ? 15 : 11);
    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);

    if (hasPin) placeMarker(Number(lat.field.value), Number(lng.field.value), false);

    map.on("click", (e: L.LeafletMouseEvent) => {
      placeMarker(e.latlng.lat, e.latlng.lng, false);
      setGeoNotice({
        type: "success",
        text: `Pin placed at ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}.`,
      });
    });

    mapRef.current = map;
    // The form may open in a dialog/sheet — recompute size so tiles render.
    const t = setTimeout(() => map.invalidateSize(), 300);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocateAddress = async () => {
    const addr = String(rawAddress || "").trim();
    if (!addr) {
      setGeoNotice({
        type: "warning",
        text: "Please enter an address in the form above before locating.",
      });
      return;
    }

    setGeocoding(true);
    setGeoNotice(null);
    try {
      const res: GeocodeResult = await geoService.geocode(addr);
      if (res && res.found && res.lat != null && res.lng != null) {
        placeMarker(res.lat, res.lng, true);
        if (res.is_approximate || (res.results_count && res.results_count > 1)) {
          setGeoNotice({
            type: "warning",
            text: `Approximate area located (${res.formatted_address || "multiple matches"}). Please drag the pin to confirm the exact doorstep.`,
          });
        } else {
          setGeoNotice({
            type: "success",
            text: `Address located: ${res.formatted_address || "Exact match"}. You can drag the pin to fine-tune.`,
          });
        }
      } else {
        setGeoNotice({
          type: "error",
          text: "Ola Maps could not pinpoint this address. Please click on the map to set the customer pin manually.",
        });
      }
    } catch {
      setGeoNotice({
        type: "error",
        text: "Geocoding request failed. Please drop the pin manually on the map.",
      });
    } finally {
      setGeocoding(false);
    }
  };

  const clearPin = () => {
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    lat.field.onChange(null);
    lng.field.onChange(null);
    setGeoNotice(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground">
          Verified Customer Map Location
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLocateAddress}
          disabled={geocoding || !rawAddress}
          className="h-7 text-xs gap-1"
        >
          {geocoding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5 text-primary" />
          )}
          {geocoding ? "Locating…" : "Locate Address on Map"}
        </Button>
      </div>

      <div
        ref={containerRef}
        className="h-60 w-full overflow-hidden rounded-lg border border-border"
        style={{ zIndex: 0 }}
      />

      {geoNotice && (
        <div
          className={`flex items-start gap-1.5 p-2 rounded text-xs ${
            geoNotice.type === "warning"
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              : geoNotice.type === "error"
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          }`}
        >
          {geoNotice.type === "warning" ? (
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          ) : geoNotice.type === "error" ? (
            <X className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span>{geoNotice.text}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-mono">
          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
          {hasPin
            ? `Confirmed: ${Number(lat.field.value).toFixed(5)}, ${Number(lng.field.value).toFixed(5)}`
            : "No pin dropped — click map or click 'Locate Address'"}
        </span>
        {hasPin && (
          <Button type="button" variant="ghost" size="sm" onClick={clearPin} className="h-6 text-xs text-destructive hover:text-destructive">
            <X className="mr-1 h-3.5 w-3.5" /> Clear pin
          </Button>
        )}
      </div>
    </div>
  );
}
