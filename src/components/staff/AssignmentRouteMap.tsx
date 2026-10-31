import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  // SpeechSynthesis TTS Voice Guidance references
  const lastSpokenRef = useRef<string>("");
  const lastSpokenTimeRef = useRef<number>(0);

  const speakAloud = useCallback(
    (text: string) => {
      if (isMuted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const clean = text.replace(/[^\w\s.,-]/gi, " ").replace(/\s+/g, " ").trim();
      if (!clean || clean.length < 3) return;

      const now = Date.now();
      if (lastSpokenRef.current === clean && now - lastSpokenTimeRef.current < 12_000) {
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = "en-IN";
        utterance.rate = 0.95; // clean, steady pacing
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        lastSpokenRef.current = clean;
        lastSpokenTimeRef.current = now;
        window.speechSynthesis.speak(utterance);
      } catch {}
    },
    [isMuted]
  );

  const dest: [number, number] | null = useMemo(() => {
    if (route?.dest_lat != null && route?.dest_lng != null) {
      return [route.dest_lat, route.dest_lng];
    }
    if (assignment.dest_lat != null && assignment.dest_lng != null) {
      return [assignment.dest_lat, assignment.dest_lng];
    }
    const anyA = assignment as any;
    if (anyA.customer_lat != null && anyA.customer_lng != null) {
      return [anyA.customer_lat, anyA.customer_lng];
    }
    return DEFAULT_CENTER;
  }, [route?.dest_lat, route?.dest_lng, assignment]);

  // 1. Fetch real road-following directions (Instant synchronous baseline -> Ola Maps -> OSRM)
  const fetchDirections = useCallback(
    async (nurseLat: number, nurseLng: number, pref: RoutePreference) => {
      if (inFlightRouteRef.current) return;
      inFlightRouteRef.current = true;
      setLoadingRoute(true);

      const targetLat = dest ? dest[0] : DEFAULT_CENTER[0];
      const targetLng = dest ? dest[1] : DEFAULT_CENTER[1];

      // Instant synchronous Haversine calculation: metrics NEVER show blank --:--
      const baseDistM = Math.max(50, Math.round(haversineMeters([nurseLat, nurseLng], [targetLat, targetLng])));
      const baseDurS = Math.max(60, Math.round(baseDistM / 6.5)); // ~23 km/h average speed
      const baseReadableDist = baseDistM < 1000 ? `${baseDistM} m` : `${(baseDistM / 1000).toFixed(1)} km`;
      const baseReadableDur = `${Math.max(1, Math.round(baseDurS / 60))} min`;

      setRoute((prev) => {
        if (prev && prev.geometry && prev.geometry.length > 2) {
          return {
            ...prev,
            distance_m: baseDistM,
            duration_s: baseDurS,
            readable_distance: baseReadableDist,
            readable_duration: baseReadableDur,
          };
        }
        return {
          distance_m: baseDistM,
          duration_s: baseDurS,
          readable_distance: baseReadableDist,
          readable_duration: baseReadableDur,
          geometry: [
            [nurseLng, nurseLat],
            [targetLng, targetLat],
          ],
          dest_lat: targetLat,
          dest_lng: targetLng,
          preference: pref,
          steps: [
            {
              instruction: `Proceed along route towards ${assignment.place_name || assignment.customer_name}`,
              distance_m: baseDistM,
              maneuver: "straight",
            },
          ],
        };
      });

      try {
        // Step 1: Try backend Ola Maps routing with 4s timeout
        try {
          const res = await Promise.race([
            staffPortalService.route(assignment.id, nurseLat, nurseLng, pref),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4000)),
          ]).catch(() => null);

          if (res && res.geometry && res.geometry.length > 1) {
            setRoute(res);
            lastRoutedCoordRef.current = [nurseLat, nurseLng];
            lastRouteTimeRef.current = Date.now();
            return;
          }
        } catch {}

        // Step 2: Fallback to OSRM road router with 4s timeout
        try {
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${nurseLng},${nurseLat};${targetLng},${targetLat}?overview=full&geometries=geojson&steps=true`;
          const resp = await fetch(osrmUrl, { signal: AbortSignal.timeout(4000) });
          if (resp.ok) {
            const data = await resp.json();
            if (data?.routes?.[0]) {
              const r = data.routes[0];
              const distM = Math.round(r.distance);
              const durS = Math.round(r.duration);
              const geom = (r.geometry?.coordinates ?? [[nurseLng, nurseLat], [targetLng, targetLat]]) as [number, number][];
              const steps = (r.legs?.[0]?.steps ?? []).map((s: any) => ({
                instruction:
                  s.maneuver?.instruction ||
                  (s.name ? `Head on ${s.name}` : "Proceed along road"),
                distance_m: Math.round(s.distance),
                maneuver: s.maneuver?.modifier || s.maneuver?.type || "straight",
              }));

              setRoute({
                distance_m: distM,
                duration_s: durS,
                readable_distance: distM < 1000 ? `${distM} m` : `${(distM / 1000).toFixed(1)} km`,
                readable_duration: `${Math.max(1, Math.round(durS / 60))} min`,
                geometry: geom,
                dest_lat: targetLat,
                dest_lng: targetLng,
                preference: pref,
                steps: steps.length > 0 ? steps : undefined,
              });
              lastRoutedCoordRef.current = [nurseLat, nurseLng];
              lastRouteTimeRef.current = Date.now();
              return;
            }
          }
        } catch {}

        // Baseline is already set above, so mark coordinates timestamp
        lastRoutedCoordRef.current = [nurseLat, nurseLng];
        lastRouteTimeRef.current = Date.now();
      } catch {
        // Safe failover
      } finally {
        setLoadingRoute(false);
        inFlightRouteRef.current = false;
      }
    },
    [assignment.id, assignment.place_name, assignment.customer_name, dest]
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

  const handlePositionError = useCallback(
    (err: GeolocationPositionError) => {
      if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
        // Fallback: try standard accuracy (cell/WiFi network) if high-accuracy GPS timed out indoors
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            handlePositionUpdate,
            () => {
              setGeoState("unavailable");
              setGeoErrorMsg("GPS unavailable indoors. Showing route from branch office.");
              fetchDirections(DEFAULT_CENTER[0], DEFAULT_CENTER[1], preference);
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
          );
          return;
        }
      }

      switch (err.code) {
        case err.PERMISSION_DENIED:
          setGeoState("denied");
          setGeoErrorMsg("Location permission denied. Showing route from branch office.");
          fetchDirections(DEFAULT_CENTER[0], DEFAULT_CENTER[1], preference);
          break;
        case err.POSITION_UNAVAILABLE:
          setGeoState("unavailable");
          setGeoErrorMsg("GPS signal unavailable. Showing route from branch office.");
          fetchDirections(DEFAULT_CENTER[0], DEFAULT_CENTER[1], preference);
          break;
        case err.TIMEOUT:
          setGeoState("timeout");
          setGeoErrorMsg("GPS lock timed out. Showing route from branch office.");
          fetchDirections(DEFAULT_CENTER[0], DEFAULT_CENTER[1], preference);
          break;
        default:
          setGeoState("unavailable");
          setGeoErrorMsg("Unable to determine GPS location.");
          fetchDirections(DEFAULT_CENTER[0], DEFAULT_CENTER[1], preference);
      }
    },
    [fetchDirections, handlePositionUpdate, preference]
  );

  // 4. Initialize Geolocation watch & immediate kickstart
  useEffect(() => {
    // Immediate baseline route calculation so metrics NEVER show --:--
    const initLat = origin ? origin[0] : DEFAULT_CENTER[0];
    const initLng = origin ? origin[1] : DEFAULT_CENTER[1];
    fetchDirections(initLat, initLng, preference);

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
      timeout: 8_000,
      maximumAge: 10_000,
    });

    // Continuous watch
    const watchId = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 12_000,
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

    // Clean vector-style navigation tiles (high clarity, watermark-free)
    const baseTiles = L.tileLayer(NAVIGATION_TILE_URL, {
      attribution: NAVIGATION_ATTRIBUTION,
      subdomains: "abc",
      maxZoom: 19,
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

  // Distance & Duration metrics formatting
  const formatDistance = (meters?: number | null, readable?: string | null): string => {
    if (meters != null && !isNaN(meters)) {
      if (meters < 1000) return `${Math.round(meters)} m`;
      return `${(meters / 1000).toFixed(1)} km`;
    }
    if (readable) {
      if (readable.includes("km") || readable.includes("m")) return readable;
      const num = parseFloat(readable);
      return isNaN(num) ? readable : `${num.toFixed(1)} km`;
    }
    return "--";
  };

  const formatDurationCompact = (seconds?: number | null, readable?: string | null): string => {
    if (seconds != null && !isNaN(seconds)) {
      const totalMin = Math.round(seconds / 60);
      if (totalMin < 60) return `${totalMin} min`;
      const hours = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      if (mins === 0) return `${hours} hr`;
      return `${hours} hr ${mins} min`;
    }
    if (readable) {
      return readable
        .replace(/hours?/gi, "hr")
        .replace(/minutes?/gi, "min")
        .replace(/seconds?/gi, "s")
        .trim();
    }
    return "--";
  };

  const distanceDisplay = formatDistance(route?.distance_m, route?.readable_distance);
  const durationDisplay = formatDurationCompact(route?.duration_s, route?.readable_duration);

  // Clock arrival time in IST with separate AM/PM to prevent line breaks
  const etaParts = useMemo(() => {
    if (route?.duration_s == null) return { time: "--:--", period: "" };
    const date = new Date(Date.now() + route.duration_s * 1000);
    const str = date.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const match = str.match(/^([\d:]+)\s*([a-zA-Z]+)?$/);
    if (match) {
      return { time: match[1], period: (match[2] || "").toUpperCase() };
    }
    return { time: str, period: "" };
  }, [route?.duration_s]);

  // Turn-by-Turn Instruction banner calculation
  const nextStep = route?.steps && route.steps.length > 0 ? route.steps[0] : null;
  const instructionText =
    nextStep?.instruction ||
    (route?.distance_m != null
      ? `Proceed along route towards ${assignment.place_name || assignment.customer_name}`
      : "Acquiring road guidance…");

  const instructionDist =
    nextStep?.distance_m != null
      ? formatDistance(nextStep.distance_m)
      : distanceDisplay;

  // Auto-speak turn-by-turn voice directions automatically (NO NEED to touch speaker button)
  useEffect(() => {
    if (!route || isMuted) return;
    if (instructionText && !instructionText.includes("Acquiring road guidance")) {
      const phrase = instructionDist ? `${instructionDist}, ${instructionText}` : instructionText;
      speakAloud(phrase);
    }
  }, [route?.distance_m, instructionText, instructionDist, isMuted, speakAloud]);

  // Clean up any ongoing speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-3xl border border-border/80 bg-neutral-950 font-sans shadow-2xl transition-all duration-300 ${
        isFullscreen ? "fixed inset-0 z-[9999] rounded-none border-none h-screen w-screen" : "h-[500px] sm:h-[560px] w-full"
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP NAVIGATION INSTRUCTION BANNER (APPLE MAPS STYLE)       */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute top-2.5 sm:top-3 inset-x-2.5 sm:inset-x-5 z-[400] pointer-events-none">
        <div className="pointer-events-auto flex items-center justify-between gap-2.5 rounded-2xl bg-neutral-900/95 backdrop-blur-md px-3.5 py-3 text-white border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3 min-w-0">
            {/* Maneuver Arrow Icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              {route?.distance_m != null && route.distance_m < 80 ? (
                <Flag className="h-5 w-5" />
              ) : nextStep?.maneuver?.includes("right") ? (
                <CornerUpRight className="h-5 w-5" />
              ) : (
                <Navigation2 className="h-5 w-5 rotate-45" />
              )}
            </div>

            {/* Instruction Text & Distance */}
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-white leading-tight whitespace-nowrap">
                  {instructionDist}
                </span>
                {geoState === "locating" && (
                  <span className="text-[11px] text-blue-400 inline-flex items-center gap-1 font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" /> GPS Lock…
                  </span>
                )}
                {loadingRoute && (
                  <span className="text-[11px] text-blue-400 inline-flex items-center gap-1 font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" /> Routing…
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-neutral-300 font-medium mt-0.5">
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
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (nextMuted) {
                  if (typeof window !== "undefined" && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                  }
                } else {
                  playSynthesizedChime();
                  speakAloud(`Voice navigation active. Following route to ${assignment.customer_name}.`);
                }
              }}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-neutral-800/80 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-white/5 transition"
              title={isMuted ? "Unmute voice navigation" : "Voice navigation active (click to mute)"}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-neutral-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-emerald-400 animate-pulse" />
              )}
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
      <div className="absolute right-2.5 sm:right-4 top-20 z-[400] flex flex-col gap-2">
        {/* Recenter / Navigation Lock Button */}
        <button
          type="button"
          onClick={handleRecenter}
          className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl shadow-xl backdrop-blur-md border transition-all ${
            isNavLocked
              ? "bg-blue-600 text-white border-blue-500 shadow-blue-500/25 ring-2 ring-blue-400/40"
              : "bg-neutral-900/90 text-neutral-300 hover:text-white border-white/10 hover:bg-neutral-800"
          }`}
          title={isNavLocked ? "Locked to your walking position" : "Recenter navigation camera"}
        >
          <LocateFixed className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* Route Overview Fit Button */}
        <button
          type="button"
          onClick={fitRouteBounds}
          className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-neutral-900/90 text-neutral-300 hover:text-white hover:bg-neutral-800 shadow-xl backdrop-blur-md border border-white/10 transition"
          title="Fit whole route to screen"
        >
          <RouteIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* Fullscreen Navigation Expand Toggle */}
        <button
          type="button"
          onClick={() => {
            setIsFullscreen(!isFullscreen);
            setTimeout(() => mapRef.current?.invalidateSize(), 300);
          }}
          className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-neutral-900/90 text-neutral-300 hover:text-white hover:bg-neutral-800 shadow-xl backdrop-blur-md border border-white/10 transition"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Navigation"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. APPLE MAPS STRIPPED-DOWN BOTTOM PANEL & RECENTER          */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute bottom-2.5 sm:bottom-3 inset-x-2.5 sm:inset-x-5 z-[400] flex flex-col items-center gap-2 pointer-events-none">
        {/* Resume Navigation Floating Pill — Natural Flex Stack Above Card */}
        {!isNavLocked && (
          <button
            type="button"
            onClick={handleRecenter}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xl hover:bg-blue-500 transition-all border border-blue-400/40 animate-pulse active:scale-95 cursor-pointer"
          >
            <Navigation className="h-3.5 w-3.5 fill-current" />
            <span>Resume Navigation</span>
          </button>
        )}

        {/* Main Bottom Information Card */}
        <div className="pointer-events-auto w-full rounded-2xl sm:rounded-3xl bg-neutral-900/95 backdrop-blur-xl border border-white/10 p-3 sm:p-4 text-white shadow-2xl">
          {/* Top Metric Row: 3 Equal-Width Columns, Zero Overlap */}
          <div className="grid grid-cols-3 divide-x divide-white/10 text-center pb-2.5 mb-2.5 border-b border-white/10">
            {/* Col 1: Arrival Time */}
            <div className="flex flex-col items-center justify-center px-1 min-w-0">
              <div className="flex items-baseline gap-0.5 whitespace-nowrap">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {etaParts.time}
                </span>
                {etaParts.period && (
                  <span className="text-[11px] font-bold text-neutral-400 uppercase">
                    {etaParts.period}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mt-0.5 whitespace-nowrap">
                Arrival
              </span>
            </div>

            {/* Col 2: Duration */}
            <div className="flex flex-col items-center justify-center px-1 min-w-0">
              <span className="text-base sm:text-lg font-black text-emerald-400 tracking-tight whitespace-nowrap">
                {durationDisplay}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mt-0.5 whitespace-nowrap">
                Duration
              </span>
            </div>

            {/* Col 3: Distance */}
            <div className="flex flex-col items-center justify-center px-1 min-w-0">
              <span className="text-base sm:text-lg font-black text-neutral-100 tracking-tight whitespace-nowrap">
                {distanceDisplay}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mt-0.5 whitespace-nowrap">
                Distance
              </span>
            </div>
          </div>

          {/* Bottom Destination Row & Actions */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs sm:text-sm font-bold text-white">
                {assignment.customer_name}
              </p>
              <p className="truncate text-[11px] text-neutral-400 mt-0.5">
                {assignment.place_name || (assignment.place_type === "home" ? "Home" : assignment.place_type)} · {assignment.address || "Confirmed map pin"}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={openInExternalMaps}
                disabled={!dest}
                className="h-8 px-2.5 rounded-xl border-white/15 bg-neutral-800 text-xs font-semibold text-white hover:bg-neutral-700 hover:text-white gap-1.5"
              >
                <Compass className="h-3.5 w-3.5 text-blue-400" />
                <span>Maps</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Button>

              {isFullscreen && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsFullscreen(false)}
                  className="h-8 rounded-xl text-xs font-bold px-3"
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
