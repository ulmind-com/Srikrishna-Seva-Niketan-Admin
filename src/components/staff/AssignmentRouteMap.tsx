import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, LocateFixed, Navigation, ExternalLink } from "lucide-react";
import {
  DEFAULT_CENTER,
  L,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from "@/components/common/leaflet-setup";
import { Button } from "@/components/ui/button";
import { staffPortalService, type RouteResult, type StaffAssignment } from "@/services/staff-portal.service";

type GeoState = "locating" | "ready" | "denied";

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Shows the nurse's live GPS → the duty location with the shortest-path route,
 * distance and ETA. Degrades gracefully: no geolocation → destination only;
 * no route from the server → a straight line + crow-flies distance.
 */
export function AssignmentRouteMap({ assignment }: { assignment: StaffAssignment }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);

  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [geoState, setGeoState] = useState<GeoState>("locating");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const dest: [number, number] | null =
    route?.dest_lat != null && route?.dest_lng != null
      ? [route.dest_lat, route.dest_lng]
      : assignment.dest_lat != null && assignment.dest_lng != null
        ? [assignment.dest_lat, assignment.dest_lng]
        : null;

  // 1. Locate the nurse, persist the ping, fetch the route.
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoState("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const o: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setOrigin(o);
        setGeoState("ready");
        staffPortalService.pingLocation(o[0], o[1]).catch(() => {});
        setLoadingRoute(true);
        staffPortalService
          .route(assignment.id, o[0], o[1])
          .then(setRoute)
          .catch(() => setRoute(null))
          .finally(() => setLoadingRoute(false));
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, [assignment.id]);

  // 2. Init the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView(DEFAULT_CENTER, 11);
    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const fit = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts: [number, number][] = [];
    if (origin) pts.push(origin);
    if (dest) pts.push(dest);
    if (pts.length === 2) map.fitBounds(L.latLngBounds(pts).pad(0.3));
    else if (pts.length === 1) map.setView(pts[0], 15);
  }, [origin, dest]);

  // 3. Draw markers + route whenever inputs change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];

    if (origin) {
      const m = L.circleMarker(origin, {
        radius: 8,
        color: "#0ea5e9",
        fillColor: "#0ea5e9",
        fillOpacity: 1,
      }).addTo(map).bindPopup("You");
      layersRef.current.push(m);
    }
    if (dest) {
      const m = L.marker(dest).addTo(map).bindPopup(assignment.customer_name);
      layersRef.current.push(m);
    }
    if (route?.geometry && route.geometry.length > 1) {
      const latlngs = route.geometry.map(([lng, lat]) => [lat, lng]) as [number, number][];
      const line = L.polyline(latlngs, { color: "#14b8a6", weight: 5, opacity: 0.85 }).addTo(map);
      layersRef.current.push(line);
    } else if (origin && dest) {
      const line = L.polyline([origin, dest], {
        color: "#94a3b8",
        weight: 3,
        dashArray: "6 8",
      }).addTo(map);
      layersRef.current.push(line);
    }
    fit();
  }, [origin, dest, route, assignment.customer_name, fit]);

  const km =
    route?.distance_m != null
      ? route.distance_m / 1000
      : origin && dest
        ? haversineKm(origin, dest)
        : null;
  const etaMin = route?.duration_s != null ? Math.round(route.duration_s / 60) : null;
  const straightLine = !route?.geometry && km != null;

  const openInMaps = () => {
    if (!dest) return;
    const o = origin ? `${origin[0]},${origin[1]}` : "";
    const url = `https://www.google.com/maps/dir/?api=1${
      o ? `&origin=${o}` : ""
    }&destination=${dest[0]},${dest[1]}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-xl border border-border"
        style={{ zIndex: 0 }}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {loadingRoute && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Finding route…
          </span>
        )}
        {km != null && (
          <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
            {km.toFixed(1)} km{straightLine ? " (straight line)" : ""}
          </span>
        )}
        {etaMin != null && (
          <span className="rounded-full bg-muted px-3 py-1 font-medium">~{etaMin} min</span>
        )}
      </div>

      {geoState === "denied" && (
        <p className="text-xs text-warning">
          Enable location to see the route from where you are.{" "}
          {!dest && "The duty location is not pinned yet."}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={fit} disabled={!origin && !dest}>
          <LocateFixed className="mr-1.5 h-4 w-4" /> Recenter
        </Button>
        <Button variant="outline" size="sm" onClick={openInMaps} disabled={!dest}>
          <Navigation className="mr-1.5 h-4 w-4" /> Open in Maps
          <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
