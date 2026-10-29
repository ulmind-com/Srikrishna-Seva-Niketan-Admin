import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Loader2,
  LocateFixed,
  Navigation,
  Radio,
  RefreshCw,
  Route as RouteIcon,
} from "lucide-react";
import {
  DEFAULT_CENTER,
  L,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from "@/components/common/leaflet-setup";
import { Button } from "@/components/ui/button";
import {
  staffPortalService,
  type RouteResult,
  type StaffAssignment,
} from "@/services/staff-portal.service";

type GeoState = "locating" | "ready" | "denied" | "unavailable" | "timeout";
type RoutePreference = "shortest" | "fastest";

function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371e3;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function createNurseIcon() {
  return L.divIcon({
    className: "nurse-live-marker",
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div class="nurse-radar-ping" style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background: rgba(16, 185, 129, 0.45); pointer-events: none;"></div>
        <div style="position: absolute; width: 26px; height: 26px; border-radius: 9999px; background: rgba(16, 185, 129, 0.25); animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position: relative; width: 32px; height: 32px; border-radius: 9999px; background: linear-gradient(135deg, #059669 0%, #0d9488 100%); border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v20M2 12h20"/>
          </svg>
        </div>
        <div style="position: absolute; bottom: -20px; background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(4px); color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.2); white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 4px;">
          <span style="width: 5px; height: 5px; border-radius: 9999px; background: #22c55e; display: inline-block;"></span>
          Nurse (You)
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

function createDestIcon(name: string) {
  const safeName = (name || "Customer").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return L.divIcon({
    className: "customer-dest-marker",
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="position: relative; width: 32px; height: 32px; border-radius: 9999px; background: linear-gradient(135deg, #e11d48 0%, #f43f5e 100%); border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div style="position: absolute; bottom: -20px; background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(4px); color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.2); white-space: nowrap; max-width: 120px; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">
          ${safeName}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

/**
 * Production-quality Zomato/Rapido style live nurse-to-customer route tracking.
 *
 * Features:
 * - Real-time continuous GPS tracking via navigator.geolocation.watchPosition
 * - Real road-following routing via server-side Ola Maps Directions API
 * - Two overlapping polyline layers: wider semi-transparent cyan glow + narrower bright blue inner line
 * - Animated pulsating live nurse marker & custom destination pin
 * - Dynamic route recalculation when nurse moves > 40 meters (throttled)
 * - Configurable route preference (shortest vs fastest)
 * - Never draws fake straight lines between markers
 * - Graceful degradation and error handling (denied, timeout, stale fix)
 */
export function AssignmentRouteMap({ assignment }: { assignment: StaffAssignment }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);
  const nurseMarkerRef = useRef<L.Marker | null>(null);

  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [geoState, setGeoState] = useState<GeoState>("locating");
  const [geoErrorMsg, setGeoErrorMsg] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isStaleGps, setIsStaleGps] = useState(false);
  const [preference, setPreference] = useState<RoutePreference>("shortest");

  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // References for live GPS throttling and route recalculation
  const lastPingTimeRef = useRef<number>(0);
  const lastRoutedCoordRef = useRef<[number, number] | null>(null);
  const lastRouteTimeRef = useRef<number>(0);
  const inFlightRouteRef = useRef<boolean>(false);
  const watchIdRef = useRef<number | null>(null);

  const dest: [number, number] | null =
    route?.dest_lat != null && route?.dest_lng != null
      ? [route.dest_lat, route.dest_lng]
      : assignment.dest_lat != null && assignment.dest_lng != null
        ? [assignment.dest_lat, assignment.dest_lng]
        : null;

  // 1. Fetch road-following directions from Ola Maps backend
  const fetchDirections = useCallback(
    async (nurseLat: number, nurseLng: number, pref: RoutePreference) => {
      if (inFlightRouteRef.current) return;
      inFlightRouteRef.current = true;
      setLoadingRoute(true);
      setRouteError(null);

      try {
        const res = await staffPortalService.route(assignment.id, nurseLat, nurseLng, pref);
        if (res && res.geometry && res.geometry.length > 1) {
          setRoute(res);
          lastRoutedCoordRef.current = [nurseLat, nurseLng];
          lastRouteTimeRef.current = Date.now();
        } else {
          // If no geometry returned, keep previous or flag notice
          if (!route?.geometry) {
            setRouteError("Road route unavailable. Showing nurse and destination pins.");
          }
        }
      } catch {
        if (!route?.geometry) {
          setRouteError("Could not retrieve road directions from routing server.");
        }
      } finally {
        setLoadingRoute(false);
        inFlightRouteRef.current = false;
      }
    },
    [assignment.id, route?.geometry]
  );

  // 2. Continuous GPS position handler
  const handlePositionUpdate = useCallback(
    (pos: GeolocationPosition) => {
      const now = Date.now();
      const fixAge = now - pos.timestamp;
      const stale = fixAge > 60_000;
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = Math.round(pos.coords.accuracy);

      setOrigin([lat, lng]);
      setGpsAccuracy(acc);
      setIsStaleGps(stale);
      setGeoState("ready");
      setGeoErrorMsg(null);

      // Throttled location ping to backend (at most once every 12 seconds)
      if (now - lastPingTimeRef.current > 12_000) {
        lastPingTimeRef.current = now;
        staffPortalService.pingLocation(lat, lng).catch(() => {});
      }

      // Smoothly update marker position directly on map
      if (nurseMarkerRef.current) {
        nurseMarkerRef.current.setLatLng([lat, lng]);
      }

      // Check whether to recalculate directions
      const lastCoord = lastRoutedCoordRef.current;
      const movedMeters = lastCoord ? haversineMeters(lastCoord, [lat, lng]) : Infinity;
      const timeSinceLastRoute = now - lastRouteTimeRef.current;

      // Recalculate if first fix, or moved > 40 meters, or > 60s passed and moved > 15m
      if (!lastCoord || movedMeters > 40 || (timeSinceLastRoute > 60_000 && movedMeters > 15)) {
        fetchDirections(lat, lng, preference);
      }
    },
    [fetchDirections, preference]
  );

  const handlePositionError = useCallback((err: GeolocationPositionError) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setGeoState("denied");
        setGeoErrorMsg("Location permission denied. Please allow location access in browser settings.");
        break;
      case err.POSITION_UNAVAILABLE:
        setGeoState("unavailable");
        setGeoErrorMsg("GPS signal unavailable. Please ensure device location is switched on.");
        break;
      case err.TIMEOUT:
        setGeoState("timeout");
        setGeoErrorMsg("Location request timed out. Retrying GPS lock…");
        break;
      default:
        setGeoState("unavailable");
        setGeoErrorMsg("Unable to determine GPS location.");
    }
  }, []);

  // 3. Initialize Geolocation watch & immediate kickstart
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoState("denied");
      setGeoErrorMsg("Geolocation is not supported by your browser.");
      return;
    }

    // Only track if assignment is accepted/active
    const isApplicable =
      assignment.acceptance_status === "accepted" ||
      assignment.acceptance_status === "pending";

    if (!isApplicable) return;

    // Immediate initial fix
    navigator.geolocation.getCurrentPosition(handlePositionUpdate, handlePositionError, {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 10_000,
    });

    // Continuous watch
    const watchId = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 10_000,
      }
    );
    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [assignment.acceptance_status, handlePositionUpdate, handlePositionError]);

  // 4. Initialize Leaflet Map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
    }).setView(DEFAULT_CENTER, 12);

    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    mapRef.current = map;

    // Invalidate size once parent dialog/sheet animation completes
    const t = setTimeout(() => map.invalidateSize(), 300);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      nurseMarkerRef.current = null;
    };
  }, []);

  // 5. Fit bounds to whole route and both markers
  const fit = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts: [number, number][] = [];
    if (origin) pts.push(origin);
    if (dest) pts.push(dest);

    if (route?.geometry && route.geometry.length > 1) {
      route.geometry.forEach(([lng, lat]) => pts.push([lat, lng]));
    }

    if (pts.length >= 2) {
      map.fitBounds(L.latLngBounds(pts).pad(0.2), { animate: true });
    } else if (pts.length === 1) {
      map.setView(pts[0], 15, { animate: true });
    }
  }, [origin, dest, route?.geometry]);

  // 6. Draw markers and dual-layer road polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear prior route layers
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];

    // Nurse Marker
    if (origin) {
      const nm = L.marker(origin, {
        icon: createNurseIcon(),
        zIndexOffset: 1000,
      }).addTo(map);
      nm.bindPopup(
        `<div style="font-size: 12px; line-height: 1.4;">
          <strong>Your Live Location</strong><br/>
          GPS Accuracy: ±${gpsAccuracy ?? 10}m<br/>
          Status: Live Active Shift
        </div>`
      );
      nurseMarkerRef.current = nm;
      layersRef.current.push(nm);
    }

    // Destination Marker
    if (dest) {
      const dm = L.marker(dest, {
        icon: createDestIcon(assignment.customer_name),
        zIndexOffset: 900,
      }).addTo(map);
      dm.bindPopup(
        `<div style="font-size: 12px; line-height: 1.4;">
          <strong>${assignment.customer_name}</strong><br/>
          Posting: ${assignment.place_name || assignment.place_type}<br/>
          Address: ${assignment.address || "Confirmed map pin"}
        </div>`
      );
      layersRef.current.push(dm);
    }

    // Draw Real Road Geometry — Overlapping Glow + Inner Crisp Line
    if (route?.geometry && route.geometry.length > 1) {
      // route.geometry is [[lng, lat], ...] in GeoJSON convention
      // Convert to Leaflet [[lat, lng], ...]
      const latlngs = route.geometry.map(([lng, lat]) => [lat, lng]) as [number, number][];

      // Layer 1: Wider semi-transparent outer glow
      const outerGlow = L.polyline(latlngs, {
        color: "#06b6d4",
        weight: 12,
        opacity: 0.38,
        lineCap: "round",
        lineJoin: "round",
        className: "route-outer-glow",
      }).addTo(map);
      layersRef.current.push(outerGlow);

      // Layer 2: Narrower bright inner road line
      const innerLine = L.polyline(latlngs, {
        color: "#0284c7",
        weight: 5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      layersRef.current.push(innerLine);

      fit();
    } else if (origin || dest) {
      fit();
    }
  }, [origin, dest, route, assignment.customer_name, assignment.place_name, assignment.place_type, assignment.address, gpsAccuracy, fit]);

  // Handle route preference toggle
  const handleTogglePreference = (newPref: RoutePreference) => {
    if (newPref === preference) return;
    setPreference(newPref);
    if (origin) {
      fetchDirections(origin[0], origin[1], newPref);
    }
  };

  const openInMaps = () => {
    if (!dest) return;
    const o = origin ? `${origin[0]},${origin[1]}` : "";
    const url = `https://www.google.com/maps/dir/?api=1${
      o ? `&origin=${o}` : ""
    }&destination=${dest[0]},${dest[1]}`;
    window.open(url, "_blank", "noopener");
  };

  // Metrics calculation
  const distanceDisplay = route?.readable_distance
    ? route.readable_distance
    : route?.distance_m != null
      ? `${(route.distance_m / 1000).toFixed(1)} km`
      : null;

  const durationDisplay = route?.readable_duration
    ? route.readable_duration
    : route?.duration_s != null
      ? `~${Math.round(route.duration_s / 60)} min`
      : null;

  // Calculate ETA clock time (e.g. 05:45 PM)
  const etaClockTime = route?.duration_s != null
    ? new Date(Date.now() + route.duration_s * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-3">
      {/* Live Status Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-card border border-border shadow-xs">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative" />
          </div>
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-emerald-500" />
            Live Nurse Route
          </span>
          {geoState === "locating" && (
            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin text-primary" /> Acquiring GPS…
            </span>
          )}
          {isStaleGps && (
            <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
              Stale Fix
            </span>
          )}
          {loadingRoute && (
            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin text-primary" /> Routing…
            </span>
          )}
        </div>

        {/* Route Preference (Shortest vs Fastest ETA) */}
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md text-xs">
          <button
            type="button"
            onClick={() => handleTogglePreference("shortest")}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
              preference === "shortest"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Shortest
          </button>
          <button
            type="button"
            onClick={() => handleTogglePreference("fastest")}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
              preference === "fastest"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Fastest
          </button>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative">
        <div
          ref={containerRef}
          className="h-72 sm:h-80 w-full overflow-hidden rounded-xl border border-border shadow-inner"
          style={{ zIndex: 0 }}
        />

        {/* Floating Metrics Pill over Map */}
        {(distanceDisplay || durationDisplay) && (
          <div className="absolute top-3 left-3 z-[400] flex items-center gap-2 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border/80 shadow-md">
            {distanceDisplay && (
              <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                <RouteIcon className="h-3.5 w-3.5 text-primary" />
                {distanceDisplay}
              </div>
            )}
            {durationDisplay && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Clock className="h-3.5 w-3.5" />
                  {durationDisplay}
                </div>
              </>
            )}
            {etaClockTime && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                ETA {etaClockTime}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Warning/Error Notice if routing or GPS fails */}
      {routeError && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs border border-amber-500/20">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{routeError}</span>
        </div>
      )}

      {geoErrorMsg && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs border border-destructive/20">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{geoErrorMsg}</span>
        </div>
      )}

      {/* Bottom Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fit}
            disabled={!origin && !dest}
            className="h-8 text-xs gap-1.5"
          >
            <LocateFixed className="h-3.5 w-3.5 text-primary" />
            Recenter Map
          </Button>

          {origin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchDirections(origin[0], origin[1], preference)}
              disabled={loadingRoute}
              className="h-8 text-xs gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingRoute ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={openInMaps}
          disabled={!dest}
          className="h-8 text-xs gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
        >
          <Navigation className="h-3.5 w-3.5" />
          Open in Maps
          <ExternalLink className="h-3 w-3 opacity-70" />
        </Button>
      </div>
    </div>
  );
}
