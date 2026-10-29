import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Compass,
  CornerUpRight,
  ExternalLink,
  Flag,
  Loader2,
  LocateFixed,
  Maximize2,
  Minimize2,
  Navigation,
  Navigation2,
  Route as RouteIcon,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  DEFAULT_CENTER,
  L,
  NAVIGATION_ATTRIBUTION,
  NAVIGATION_TILE_URL,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from "@/components/common/leaflet-setup";
import { Button } from "@/components/ui/button";
import {
  staffPortalService,
  type RouteResult,
  type StaffAssignment,
} from "@/services/staff-portal.service";
import { playSynthesizedChime } from "@/utils/audioAlert";

type GeoState = "locating" | "ready" | "denied" | "unavailable" | "timeout";
type RoutePreference = "shortest" | "fastest";

/** Calculate real geographical distance in meters between two lat/lng coordinates. */
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

/** Calculate compass bearing (0-360 deg) between two points. */
function calculateBearing(a: [number, number], b: [number, number]): number {
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/** Precompute cumulative distances along real road coordinates. */
function computeRouteDistances(coords: [number, number][]) {
  const cumulative: number[] = [0];
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = haversineMeters(coords[i], coords[i + 1]);
    total += d;
    cumulative.push(total);
  }
  return { cumulative, total };
}

/** Binary search interpolation along polyline segments. */
function interpolateAlongRoute(
  coords: [number, number][],
  cumulative: number[],
  total: number,
  fraction: number
): [number, number] {
  if (coords.length === 0) return [0, 0];
  if (coords.length === 1) return coords[0];
  const targetDist = Math.max(0, Math.min(total, fraction * total));

  let low = 0;
  let high = cumulative.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (cumulative[mid] <= targetDist) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const idx = Math.max(0, Math.min(coords.length - 2, high));
  const d0 = cumulative[idx];
  const d1 = cumulative[idx + 1] || d0;
  const segDist = d1 - d0;
  const alpha = segDist > 0 ? (targetDist - d0) / segDist : 0;
  const lat = coords[idx][0] + alpha * (coords[idx + 1][0] - coords[idx][0]);
  const lng = coords[idx][1] + alpha * (coords[idx + 1][1] - coords[idx][1]);
  return [lat, lng];
}

/** Apple Maps / Google Maps style nurse puck / directional chevron. */
function createNurseIcon(heading: number | null, isWalking: boolean) {
  const rotation = heading != null ? Math.round(heading) : 0;

  if (isWalking && heading != null) {
    return L.divIcon({
      className: "nav-nurse-marker",
      html: `
        <div class="nav-puck-container">
          <div class="nav-puck-accuracy" style="width: 44px; height: 44px; animation: ping 3s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div class="nav-puck-body" style="transform: rotate(${rotation}deg); background: #2563EB;">
            <div class="nav-puck-chevron"></div>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  }

  // Stationary state: crisp blue circular puck with gentle breathing ring
  return L.divIcon({
    className: "nav-nurse-marker",
    html: `
      <div class="nav-puck-container">
        <div class="nav-puck-accuracy" style="width: 40px; height: 40px;"></div>
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 9999px; background: rgba(37,99,235,0.25); animation: ping 2.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div class="nav-puck-body">
          <div style="width: 10px; height: 10px; border-radius: 9999px; background: #ffffff;"></div>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/** Apple Maps style customer destination pin. */
function createDestIcon(name: string) {
  const safeName = (name || "Customer").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return L.divIcon({
    className: "nav-dest-marker",
    html: `
      <div style="position: relative; width: 42px; height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; pointer-events: auto;">
        <div style="width: 32px; height: 32px; border-radius: 9999px 9999px 9999px 0; transform: rotate(-45deg); background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
          <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v20M2 12h20"/>
            </svg>
          </div>
        </div>
        <div style="position: absolute; bottom: 2px; width: 8px; height: 8px; border-radius: 9999px; background: rgba(0,0,0,0.35); filter: blur(1.5px);"></div>
        <div style="position: absolute; bottom: -18px; background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(6px); color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.2); white-space: nowrap; max-width: 120px; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
          ${safeName}
        </div>
      </div>
    `,
    iconSize: [42, 50],
    iconAnchor: [21, 32],
    popupAnchor: [0, -32],
  });
}

/** Moving luminous pulse marker along the real road route. */
function createMovingPulseIcon() {
  return L.divIcon({
    className: "route-pulse-div-icon",
    html: `
      <div class="route-pulse-marker">
        <div class="route-pulse-halo"></div>
        <div class="route-pulse-core"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function AssignmentRouteMap({ assignment }: { assignment: StaffAssignment }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);
  const nurseMarkerRef = useRef<L.Marker | null>(null);
  const pulseMarkerRef = useRef<L.Marker | null>(null);
  const pulseMarker2Ref = useRef<L.Marker | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [geoState, setGeoState] = useState<GeoState>("locating");
  const [geoErrorMsg, setGeoErrorMsg] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [isWalking, setIsWalking] = useState(false);
  const [preference, setPreference] = useState<RoutePreference>("shortest");

  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Apple Maps navigation view states
  const [isNavLocked, setIsNavLocked] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // References for live GPS throttling and route recalculation
  const lastPingTimeRef = useRef<number>(0);
  const lastRoutedCoordRef = useRef<[number, number] | null>(null);
  const lastRouteTimeRef = useRef<number>(0);
  const inFlightRouteRef = useRef<boolean>(false);
  const prevCoordRef = useRef<[number, number] | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const dest: [number, number] | null =
    route?.dest_lat != null && route?.dest_lng != null
      ? [route.dest_lat, route.dest_lng]
      : assignment.dest_lat != null && assignment.dest_lng != null
        ? [assignment.dest_lat, assignment.dest_lng]
        : null;

  // 1. Fetch real road-following directions from Ola Maps backend
  const fetchDirections = useCallback(
    async (nurseLat: number, nurseLng: number, pref: RoutePreference) => {
      if (inFlightRouteRef.current) return;
      inFlightRouteRef.current = true;
      setLoadingRoute(true);

      try {
        const res = await staffPortalService.route(assignment.id, nurseLat, nurseLng, pref);
        if (res && res.geometry && res.geometry.length > 1) {
          setRoute(res);
          lastRoutedCoordRef.current = [nurseLat, nurseLng];
          lastRouteTimeRef.current = Date.now();
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoadingRoute(false);
        inFlightRouteRef.current = false;
      }
    },
    [assignment.id]
  );

  // 2. Smoothly follow the nurse while walking (lower-middle screen offset)
  const panToNurse = useCallback(
    (coords: [number, number], zoom = 16) => {
      const map = mapRef.current;
      if (!map) return;
      const size = map.getSize();
      if (size.y <= 0) {
        map.setView(coords, zoom, { animate: true });
        return;
      }
      // Offset so the nurse marker is positioned in lower-middle (around 68% down the viewport)
      // leaving ample space ahead to see the upcoming street route (Apple Maps style)
      const pt = map.project(coords, zoom);
      const targetPt = L.point(pt.x, pt.y - size.y * 0.18);
      const targetLatLng = map.unproject(targetPt, zoom);
      map.panTo(targetLatLng, { animate: true, duration: 0.8, easeLinearity: 0.25 });
    },
    []
  );

  // 3. Continuous GPS position handler
  const handlePositionUpdate = useCallback(
    (pos: GeolocationPosition) => {
      const now = Date.now();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = Math.round(pos.coords.accuracy);

      // Determine heading and walking state
      let currentHeading = pos.coords.heading;
      if (currentHeading == null || isNaN(currentHeading)) {
        if (prevCoordRef.current) {
          const distMoved = haversineMeters(prevCoordRef.current, [lat, lng]);
          if (distMoved > 2.5) {
            currentHeading = calculateBearing(prevCoordRef.current, [lat, lng]);
            setIsWalking(true);
          } else {
            setIsWalking(false);
          }
        }
      } else {
        setIsWalking(pos.coords.speed != null && pos.coords.speed > 0.5);
      }

      setOrigin([lat, lng]);
      setGpsAccuracy(acc);
      setGeoState("ready");
      setGeoErrorMsg(null);
      if (currentHeading != null && !isNaN(currentHeading)) {
        setHeading(currentHeading);
      }
      prevCoordRef.current = [lat, lng];

      // Throttled location ping to backend (at most once every 12 seconds)
      if (now - lastPingTimeRef.current > 12_000) {
        lastPingTimeRef.current = now;
        staffPortalService.pingLocation(lat, lng).catch(() => {});
      }

      // Smoothly update marker position and orientation
      if (nurseMarkerRef.current) {
        nurseMarkerRef.current.setLatLng([lat, lng]);
        nurseMarkerRef.current.setIcon(createNurseIcon(currentHeading ?? heading, isWalking));
      }

      // Follow camera naturally if navigation lock is active
      if (isNavLocked && mapRef.current) {
        panToNurse([lat, lng]);
      }

      // Check whether to recalculate directions
      const lastCoord = lastRoutedCoordRef.current;
      const movedMeters = lastCoord ? haversineMeters(lastCoord, [lat, lng]) : Infinity;
      const timeSinceLastRoute = now - lastRouteTimeRef.current;

      // Recalculate if first fix, or moved > 35 meters, or > 60s passed and moved > 15m
      if (!lastCoord || movedMeters > 35 || (timeSinceLastRoute > 60_000 && movedMeters > 15)) {
        fetchDirections(lat, lng, preference);
      }
    },
    [fetchDirections, preference, isNavLocked, panToNurse, heading, isWalking]
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

  // 4. Initialize Geolocation watch & immediate kickstart
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoState("denied");
      setGeoErrorMsg("Geolocation is not supported by your browser.");
      return;
    }

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

  // 5. Initialize Leaflet Map once with clean vector-style navigation tiles
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false, // Apple/Google Maps style: minimal clean interface without bulky controls
    }).setView(DEFAULT_CENTER, 14);

    // Try CartoDB Voyager tiles (clean, soft buildings, Apple Maps vector aesthetic)
    const baseTiles = L.tileLayer(NAVIGATION_TILE_URL, {
      attribution: NAVIGATION_ATTRIBUTION,
      subdomains: "abcd",
      maxZoom: 20,
    });

    // Fallback to OSM tile server if tile fails
    baseTiles.on("tileerror", () => {
      if (!map.hasLayer(baseTiles)) return;
      map.removeLayer(baseTiles);
      L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    });
    baseTiles.addTo(map);

    // Detect user manual pan / drag to unlock camera
    map.on("dragstart", () => {
      setIsNavLocked(false);
    });

    mapRef.current = map;

    const t = setTimeout(() => map.invalidateSize(), 300);

    return () => {
      clearTimeout(t);
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      nurseMarkerRef.current = null;
      pulseMarkerRef.current = null;
      pulseMarker2Ref.current = null;
    };
  }, []);

  // 6. Fit entire route and both markers to viewport
  const fitRouteBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setIsNavLocked(false);

    const pts: [number, number][] = [];
    if (origin) pts.push(origin);
    if (dest) pts.push(dest);

    if (route?.geometry && route.geometry.length > 1) {
      route.geometry.forEach(([lng, lat]) => pts.push([lat, lng]));
    }

    if (pts.length >= 2) {
      map.fitBounds(L.latLngBounds(pts).pad(0.18), { animate: true, duration: 0.8 });
    } else if (pts.length === 1) {
      map.setView(pts[0], 15, { animate: true });
    }
  }, [origin, dest, route?.geometry]);

  // 7. Render Normal Road Route (NO FULL-LINE GLOW) & Moving Travelling Glow Pulse
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear prior route layers and cancel running pulse animation
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];

    // Destination Marker
    if (dest) {
      const dm = L.marker(dest, {
        icon: createDestIcon(assignment.customer_name),
        zIndexOffset: 850,
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

    // Nurse Location Marker
    if (origin) {
      const nm = L.marker(origin, {
        icon: createNurseIcon(heading, isWalking),
        zIndexOffset: 1000,
      }).addTo(map);
      nm.bindPopup(
        `<div style="font-size: 12px; line-height: 1.4;">
          <strong>Your Live Location</strong><br/>
          GPS Accuracy: ±${gpsAccuracy ?? 10}m<br/>
          Status: Active Duty Navigation
        </div>`
      );
      nurseMarkerRef.current = nm;
      layersRef.current.push(nm);
    }

    // NORMAL CLEAN ROAD ROUTE (Apple / Google Maps Style — NO EXAGGERATED FULL-LINE GLOW)
    if (route?.geometry && route.geometry.length > 1) {
      // route.geometry is [[lng, lat], ...] from Ola Maps Directions API
      const latlngs = route.geometry.map(([lng, lat]) => [lat, lng]) as [number, number][];

      // Layer 1 (Casing): Subtle contrasting dark outline for high contrast against any map tiles
      const casing = L.polyline(latlngs, {
        color: "#1E3A8A",
        weight: 6.5,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
        className: "nav-route-casing",
        interactive: false,
      }).addTo(map);
      layersRef.current.push(casing);

      // Layer 2 (Core): Clean, thin, professional navigation royal blue line
      const roadLine = L.polyline(latlngs, {
        color: "#2563EB",
        weight: 4.5,
        opacity: 1.0,
        lineCap: "round",
        lineJoin: "round",
        className: "nav-route-line",
        interactive: false,
      }).addTo(map);
      layersRef.current.push(roadLine);

      // 8. MOVING GLOW PULSE ALONG THE ROUTE (Travelling Signal)
      const { cumulative, total } = computeRouteDistances(latlngs);

      if (total > 10) {
        // Primary moving pulse
        const startPos = latlngs[0];
        const pulseMarker = L.marker(startPos, {
          icon: createMovingPulseIcon(),
          zIndexOffset: 950,
          interactive: false,
        }).addTo(map);
        pulseMarkerRef.current = pulseMarker;
        layersRef.current.push(pulseMarker);

        // Secondary subtle pulse (50% phase offset)
        const pulseMarker2 = L.marker(startPos, {
          icon: createMovingPulseIcon(),
          zIndexOffset: 940,
          interactive: false,
        }).addTo(map);
        pulseMarker2Ref.current = pulseMarker2;
        layersRef.current.push(pulseMarker2);

        // 60fps RequestAnimationFrame loop following every bend and turn of the road
        const durationMs = Math.max(4000, Math.min(12000, total * 4)); // smooth adaptive speed
        let startTime = performance.now();

        const stepPulse = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress1 = (elapsed % durationMs) / durationMs;
          const progress2 = (progress1 + 0.5) % 1.0;

          const p1 = interpolateAlongRoute(latlngs, cumulative, total, progress1);
          const p2 = interpolateAlongRoute(latlngs, cumulative, total, progress2);

          pulseMarker.setLatLng(p1);
          pulseMarker2.setLatLng(p2);

          animFrameRef.current = requestAnimationFrame(stepPulse);
        };

        animFrameRef.current = requestAnimationFrame(stepPulse);
      }

      // Initial camera positioning
      if (isNavLocked && origin) {
        panToNurse(origin, 16);
      } else {
        fitRouteBounds();
      }
    } else if (origin) {
      if (isNavLocked) {
        panToNurse(origin, 15);
      }
    }
  }, [
    origin,
    dest,
    route,
    assignment.customer_name,
    assignment.place_name,
    assignment.place_type,
    assignment.address,
    gpsAccuracy,
    heading,
    isWalking,
    isNavLocked,
    panToNurse,
    fitRouteBounds,
  ]);

  // Recenter handler
  const handleRecenter = () => {
    setIsNavLocked(true);
    if (origin) {
      panToNurse(origin, 16);
    }
  };

  // Preference toggle (Shortest vs Fastest)
  const handleTogglePreference = (newPref: RoutePreference) => {
    if (newPref === preference) return;
    setPreference(newPref);
    if (origin) {
      fetchDirections(origin[0], origin[1], newPref);
    }
  };

  // External Navigation Handover
  const openInExternalMaps = () => {
    if (!dest) return;
    const o = origin ? `${origin[0]},${origin[1]}` : "";
    const isApple = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent);
    const url = isApple
      ? `maps://?saddr=${o}&daddr=${dest[0]},${dest[1]}`
      : `https://www.google.com/maps/dir/?api=1${
          o ? `&origin=${o}` : ""
        }&destination=${dest[0]},${dest[1]}`;
    window.open(url, "_blank", "noopener");
  };

  // Distance & Duration metrics
  const distanceDisplay = route?.readable_distance
    ? route.readable_distance
    : route?.distance_m != null
      ? `${(route.distance_m / 1000).toFixed(1)} km`
      : null;

  const durationMin = route?.duration_s != null ? Math.round(route.duration_s / 60) : null;
  const durationDisplay = route?.readable_duration
    ? route.readable_duration
    : durationMin != null
      ? `${durationMin} min`
      : null;

  // Clock arrival time in IST (e.g. "11:15 AM")
  const etaClockTime =
    route?.duration_s != null
      ? new Date(Date.now() + route.duration_s * 1000).toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : null;

  // Turn-by-Turn Instruction banner calculation
  const nextStep = route?.steps && route.steps.length > 0 ? route.steps[0] : null;
  const instructionText =
    nextStep?.instruction ||
    (route?.distance_m != null
      ? `Proceed along route towards ${assignment.place_name || assignment.customer_name}`
      : "Acquiring road guidance…");

  const instructionDist =
    nextStep?.distance_m != null
      ? nextStep.distance_m > 1000
        ? `${(nextStep.distance_m / 1000).toFixed(1)} km`
        : `${nextStep.distance_m} m`
      : distanceDisplay || "";

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-3xl border border-border/80 bg-neutral-950 font-sans shadow-2xl transition-all duration-300 ${
        isFullscreen ? "fixed inset-0 z-[9999] rounded-none border-none h-screen w-screen" : "h-[480px] sm:h-[540px] w-full"
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP NAVIGATION INSTRUCTION BANNER (APPLE MAPS STYLE)       */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute top-3 inset-x-3 sm:inset-x-6 z-[400] pointer-events-none">
        <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl bg-neutral-900/95 backdrop-blur-md px-4 py-3.5 text-white border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Maneuver Arrow Icon */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              {route?.distance_m != null && route.distance_m < 80 ? (
                <Flag className="h-6 w-6" />
              ) : nextStep?.maneuver?.includes("right") ? (
                <CornerUpRight className="h-6 w-6" />
              ) : (
                <Navigation2 className="h-6 w-6 rotate-45" />
              )}
            </div>

            {/* Instruction Text & Distance */}
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold tracking-tight text-white leading-tight">
                  {instructionDist}
                </span>
                {geoState === "locating" && (
                  <span className="text-xs text-blue-400 inline-flex items-center gap-1 font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" /> GPS Lock…
                  </span>
                )}
                {loadingRoute && (
                  <span className="text-xs text-blue-400 inline-flex items-center gap-1 font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" /> Routing…
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-neutral-300 font-medium">
                {instructionText}
              </p>
            </div>
          </div>

          {/* Right Status / Preference Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden sm:flex items-center bg-neutral-800/90 rounded-lg p-0.5 text-[11px] font-semibold border border-white/5">
              <button
                type="button"
                onClick={() => handleTogglePreference("shortest")}
                className={`px-2 py-1 rounded-md transition ${
                  preference === "shortest" ? "bg-blue-600 text-white shadow-xs" : "text-neutral-400 hover:text-white"
                }`}
              >
                Shortest
              </button>
              <button
                type="button"
                onClick={() => handleTogglePreference("fastest")}
                className={`px-2 py-1 rounded-md transition ${
                  preference === "fastest" ? "bg-blue-600 text-white shadow-xs" : "text-neutral-400 hover:text-white"
                }`}
              >
                Fastest
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsMuted(!isMuted);
                if (isMuted) playSynthesizedChime();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-800/80 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-white/5 transition"
              title={isMuted ? "Unmute sound" : "Mute sound"}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-blue-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. MAIN MAP VIEWPORT                                          */}
      {/* ------------------------------------------------------------- */}
      <div ref={containerRef} className="h-full w-full flex-1" style={{ zIndex: 0 }} />

      {/* ------------------------------------------------------------- */}
      {/* 3. FLOATING ACTION CONTROLS (APPLE MAPS RIGHT SIDE STACK)     */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute right-3 sm:right-5 top-24 z-[400] flex flex-col gap-2">
        {/* Recenter / Navigation Lock Button */}
        <button
          type="button"
          onClick={handleRecenter}
          className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-xl backdrop-blur-md border transition-all ${
            isNavLocked
              ? "bg-blue-600 text-white border-blue-500 shadow-blue-500/25 ring-2 ring-blue-400/40"
              : "bg-neutral-900/90 text-neutral-300 hover:text-white border-white/10 hover:bg-neutral-800"
          }`}
          title={isNavLocked ? "Locked to your walking position" : "Recenter navigation camera"}
        >
          <LocateFixed className="h-5 w-5" />
        </button>

        {/* Route Overview Fit Button */}
        <button
          type="button"
          onClick={fitRouteBounds}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900/90 text-neutral-300 hover:text-white hover:bg-neutral-800 shadow-xl backdrop-blur-md border border-white/10 transition"
          title="Fit whole route to screen"
        >
          <RouteIcon className="h-5 w-5" />
        </button>

        {/* Fullscreen Navigation Expand Toggle */}
        <button
          type="button"
          onClick={() => {
            setIsFullscreen(!isFullscreen);
            setTimeout(() => mapRef.current?.invalidateSize(), 300);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900/90 text-neutral-300 hover:text-white hover:bg-neutral-800 shadow-xl backdrop-blur-md border border-white/10 transition"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Navigation"}
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </button>
      </div>

      {/* Recenter Pill Banner (When map is dragged away from nurse) */}
      {!isNavLocked && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-[400]">
          <button
            type="button"
            onClick={handleRecenter}
            className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xl hover:bg-blue-700 transition-all border border-blue-400/40 animate-bounce"
          >
            <Navigation className="h-3.5 w-3.5" />
            Resume Navigation
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. APPLE MAPS STRIPPED-DOWN BOTTOM PANEL                      */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute bottom-3 inset-x-3 sm:inset-x-6 z-[400] pointer-events-none">
        <div className="pointer-events-auto rounded-3xl bg-neutral-900/95 backdrop-blur-xl border border-white/10 p-4 text-white shadow-2xl">
          {/* Top Metric Row: Big Arrival, Duration, Distance */}
          <div className="flex items-baseline justify-between border-b border-white/10 pb-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {etaClockTime || "--:--"}
              </span>
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider ml-1">
                arrival
              </span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-400">
                {durationDisplay || "--"}
              </span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-200">
                {distanceDisplay || "--"}
              </span>
            </div>
          </div>

          {/* Bottom Destination Row & Actions */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {assignment.customer_name}
              </p>
              <p className="truncate text-xs text-neutral-400">
                {assignment.place_name || assignment.place_type} · {assignment.address || "Confirmed map pin"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openInExternalMaps}
                disabled={!dest}
                className="h-9 rounded-xl border-white/15 bg-neutral-800 text-xs font-semibold text-white hover:bg-neutral-700 hover:text-white gap-1.5"
              >
                <Compass className="h-4 w-4 text-blue-400" />
                Apple/Google Maps
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Button>

              {isFullscreen && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsFullscreen(false)}
                  className="h-9 rounded-xl text-xs font-bold px-3.5"
                >
                  Exit
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error notices if GPS or route fails */}
      {geoErrorMsg && (
        <div className="absolute top-20 left-4 right-4 z-[410] rounded-xl bg-destructive/90 backdrop-blur-md p-3 text-xs text-white shadow-xl flex items-center justify-between gap-2 border border-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{geoErrorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (origin) fetchDirections(origin[0], origin[1], preference);
            }}
            className="text-[11px] font-bold underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
