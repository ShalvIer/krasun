import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl, { type Map as MapboxMap, type Marker } from "mapbox-gl";
import { Crosshair, EyeOff, Lock, MapPin, MessageCircle, Navigation, Pause, Play, Plus, Route, Satellite, X } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Coordinates, RoutePreview, SpotView, TravelMode, UserSummary } from "@krasun/shared-types";
import { apiFetch, authenticatedMediaUrl } from "../../services/api";
import { useSocket } from "../../services/socket";
import { useLocationSharing } from "../location/LocationProvider";
import { useGroups } from "../groups/useGroups";
import { publicSpotsForUser, spotsBounds } from "./mapActions";
import { coordinatesFromSearch, DEFAULT_MAP_CENTER, ownMapLocation } from "./mapInitialView";
import { MarkerRenderCycle, uniqueById } from "./markerRenderCycle";
import { useAuth } from "../auth/AuthContext";
import { MapAvatarView } from "../profile/MapAvatar";

type MapUser = UserSummary & { role?: string };

export function MapPage() {
  const { groupId: routeGroupId } = useParams(); const [search] = useSearchParams(); const navigate = useNavigate(); const socket = useSocket(); const location = useLocationSharing(); const { groups } = useGroups(); const { user: sessionUser } = useAuth();
  const group = groups.find((item) => item.id === routeGroupId) ?? groups[0]; const groupId = group?.id;
  const mapNode = useRef<HTMLDivElement>(null); const mapRef = useRef<MapboxMap | null>(null); const markers = useRef<Map<string, Marker>>(new Map());
  const initialCenterApplied = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [users, setUsers] = useState<MapUser[]>([]); const [spots, setSpots] = useState<SpotView[]>([]); const [selectedUser, setSelectedUser] = useState<MapUser | null>(null); const [selectedSpot, setSelectedSpot] = useState<SpotView | null>(null); const [placing, setPlacing] = useState<Coordinates | null>(null); const [notice, setNotice] = useState(""); const [route, setRoute] = useState<RoutePreview | null>(null); const [mode, setMode] = useState<TravelMode>("WALKING");
  const mapToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  const loadState = useCallback(async () => {
    if (!groupId) return;
    const [state, spotData] = await Promise.all([apiFetch<{ users: Array<MapUser & { location?: { state?: string; latitude?: number; longitude?: number; accuracy?: number } }> }>(`/api/map/groups/${groupId}/state`), apiFetch<{ spots: SpotView[] }>("/api/spots")]);
    setUsers(state.users.map((user) => ({ ...user, locationState: user.location?.state as UserSummary["locationState"], location: user.location?.latitude !== undefined && user.location.longitude !== undefined ? { latitude: user.location.latitude, longitude: user.location.longitude, accuracy: user.location.accuracy } : null })));
    setSpots(spotData.spots);
  }, [groupId]);

  useEffect(() => { if (!groupId) return; localStorage.setItem("krasun:last-group", groupId); void loadState(); socket.emit("group:join", { groupId });
    const onLocation = (payload: { userId: string; state: UserSummary["locationState"]; coordinates: Coordinates | null }) => setUsers((current) => current.map((user) => user.id === payload.userId ? { ...user, locationState: payload.state, location: payload.coordinates } : user));
    const onAvatar = (payload: { userId: string; type: string; value: string | null }) => {
      const mapAvatar = { type: payload.type as NonNullable<UserSummary["mapAvatar"]>["type"], value: payload.value };
      setUsers((current) => current.map((user) => user.id === payload.userId ? { ...user, mapAvatar } : user));
      setSelectedUser((current) => current?.id === payload.userId ? { ...current, mapAvatar } : current);
    };
    const onCreated = (spot: SpotView) => setSpots((current) => current.some((item) => item.id === spot.id) ? current : [...current, spot]);
    const onUpdated = (spot: SpotView) => setSpots((current) => current.map((item) => item.id === spot.id ? spot : item));
    const onDeleted = ({ id }: { id: string }) => { setSpots((current) => current.filter((item) => item.id !== id)); setSelectedSpot((current) => current?.id === id ? null : current); };
    socket.on("map:location-updated", onLocation); socket.on("map:avatar-updated", onAvatar); socket.on("spot:created", onCreated); socket.on("spot:updated", onUpdated); socket.on("spot:deleted", onDeleted);
    return () => { socket.emit("group:leave", { groupId }); socket.off("map:location-updated", onLocation); socket.off("map:avatar-updated", onAvatar); socket.off("spot:created", onCreated); socket.off("spot:updated", onUpdated); socket.off("spot:deleted", onDeleted); };
  }, [groupId, socket, loadState]);

  useEffect(() => {
    if (!mapNode.current || !mapToken || mapRef.current) return;
    mapboxgl.accessToken = mapToken;
    initialCenterApplied.current = false;
    setMapReady(false);
    const queryCenter = coordinatesFromSearch(search);
    const ownLocation = ownMapLocation(users, sessionUser?.id, location.coordinates);
    const initialCenter = queryCenter ?? ownLocation ?? DEFAULT_MAP_CENTER;
    const map = new mapboxgl.Map({ container: mapNode.current, style: "mapbox://styles/mapbox/dark-v11", center: [initialCenter.longitude, initialCenter.latitude], zoom: queryCenter || ownLocation ? 14 : 12 });
    const onMapLoad = () => setMapReady(true);
    map.on("load", onMapLoad);
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("click", (event) => { if (map.getCanvas().dataset.placing === "true") { setPlacing({ latitude: event.lngLat.lat, longitude: event.lngLat.lng }); map.getCanvas().dataset.placing = "false"; } });
    mapRef.current = map;
    return () => { map.off("load", onMapLoad); markers.current.forEach((marker) => marker.remove()); markers.current.clear(); map.remove(); mapRef.current = null; };
  }, [mapToken, groupId]);

  useEffect(() => {
    if (initialCenterApplied.current || !mapReady || !mapRef.current || !sessionUser) return;
    if (coordinatesFromSearch(search)) { initialCenterApplied.current = true; return; }
    const ownLocation = ownMapLocation(users, sessionUser.id, location.coordinates);
    if (!ownLocation) return;
    centerMap(ownLocation, 16);
    initialCenterApplied.current = true;
  }, [users, sessionUser, search, mapReady, location.coordinates]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const renderCycle = new MarkerRenderCycle<Marker>();
    markers.current.forEach((marker) => marker.remove()); markers.current.clear();
    void Promise.all(uniqueById(users).filter((user) => user.location && user.locationState !== "HIDDEN").map(async (user) => {
      const element = document.createElement("button"); element.className = `map-user-marker state-${user.locationState?.toLowerCase()}`; element.title = `${user.displayName} · ${user.locationState}`;
      const avatar = user.mapAvatar; const value = avatar?.value || "";
      if (avatar?.type === "EMOJI") element.textContent = value;
      else if (["PHOTO", "GIF", "VIDEO"].includes(avatar?.type || "") && value) {
        let source = value;
        if (value.startsWith("/api/")) {
          try {
            source = await authenticatedMediaUrl(value);
            if (!renderCycle.retainBlobUrl(source)) return;
          } catch {
            source = "";
          }
        }
        if (!renderCycle.isActive()) return;
        if (source && avatar?.type === "VIDEO") { const video = document.createElement("video"); video.src = source; video.autoplay = true; video.muted = true; video.loop = true; video.playsInline = true; element.append(video); }
        else if (source) { const image = document.createElement("img"); image.src = source; image.alt = ""; element.append(image); }
        else element.textContent = user.displayName[0]?.toUpperCase() || "K";
      } else element.textContent = user.displayName[0]?.toUpperCase() || "K";
      element.onclick = (event) => {
        event.stopPropagation();
        centerMap(user.location!, 15);
        setSelectedUser(user);
        setSelectedSpot(null);
      };
      if (!renderCycle.isActive()) return;
      const marker = new mapboxgl.Marker({ element }).setLngLat([user.location!.longitude, user.location!.latitude]).addTo(map);
      if (renderCycle.retainMarker(marker)) markers.current.set(`user:${user.id}`, marker);
    }));
    uniqueById(spots).forEach((spot) => { const element = document.createElement("button"); element.className = `spot-marker ${spot.visibility.toLowerCase()}`; element.innerHTML = spot.visibility === "PRIVATE" ? "<span>◆</span>" : "<span>●</span>"; element.title = spot.title; element.onclick = (event) => { event.stopPropagation(); setSelectedSpot(spot); setSelectedUser(null); }; const marker = new mapboxgl.Marker({ element }).setLngLat([spot.longitude, spot.latitude]).addTo(map); if (renderCycle.retainMarker(marker)) markers.current.set(`spot:${spot.id}`, marker); });
    return () => {
      renderCycle.cancel();
      markers.current.clear();
    };
  }, [users, spots]);

  useEffect(() => { if (!search.get("spotId")) return; const spot = spots.find((item) => item.id === search.get("spotId")); if (spot) { setSelectedSpot(spot); mapRef.current?.flyTo({ center: [spot.longitude, spot.latitude], zoom: 15 }); } }, [spots, search]);

  function centerMap(coordinates: Coordinates, zoom = 15) {
    mapRef.current?.flyTo({
      center: [coordinates.longitude, coordinates.latitude],
      zoom,
      essential: true,
    });
  }

  function centerOnSelf() {
    const ownLocation = ownMapLocation(users, sessionUser?.id, location.coordinates);

    if (!ownLocation) {
      setNotice("No current or last-known location is available.");
      return;
    }

    centerMap(ownLocation, 16);
    setNotice("Centered on your location.");
  }

  function beginPlacing() { if (!mapRef.current) return; mapRef.current.getCanvas().dataset.placing = "true"; setNotice("Click the map to place your spot."); }
  async function saveSpot(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); if (!placing) return; socket.emit("spot:create", { title: String(form.get("title")), description: String(form.get("description")), visibility: form.get("visibility") as "PUBLIC" | "PRIVATE", ...placing }); setPlacing(null); setNotice("Spot created."); }
  async function showPublicSpots(user: MapUser) { try { const data = await apiFetch<{ spots: SpotView[] }>(`/api/spots/user/${user.id}/public`); const visible = publicSpotsForUser(data.spots, user.id); setSpots((current) => [...current.filter((item) => !visible.some((next) => next.id === item.id)), ...visible]); const bounds = spotsBounds(visible); if (!bounds) { setNotice(`${user.displayName} has no public spots visible to you.`); return; } mapRef.current?.fitBounds([[bounds.west, bounds.south], [bounds.east, bounds.north]], { padding: 100, maxZoom: 15 }); setNotice(`Showing ${visible.length} public spot${visible.length === 1 ? "" : "s"} by ${user.displayName}.`); } catch (issue) { setNotice(issue instanceof Error ? issue.message : "Could not load public spots"); } }
  async function messageUser(user: MapUser) { const data = await apiFetch<{ conversation: { id: string } }>("/api/conversations/direct", { method: "POST", body: JSON.stringify({ userId: user.id }) }); navigate(`/chat/direct/${data.conversation.id}`); }
  async function shareSpot() { if (!selectedSpot || !group?.primaryConversationId) return; await apiFetch(`/api/conversations/${group.primaryConversationId}/messages`, { method: "POST", body: JSON.stringify({ type: "SPOT", payload: { spotId: selectedSpot.id, title: selectedSpot.title, description: selectedSpot.description, latitude: selectedSpot.latitude, longitude: selectedSpot.longitude, ownerId: selectedSpot.ownerId, visibility: selectedSpot.visibility, groupId } }) }); setNotice("Spot shared to the group chat."); }
  async function shareLocation() { if (!location.coordinates || !group?.primaryConversationId) { setNotice("Share your location first."); return; } await apiFetch(`/api/conversations/${group.primaryConversationId}/messages`, { method: "POST", body: JSON.stringify({ type: "LOCATION", payload: { ...location.coordinates, sentAt: new Date().toISOString(), label: "Current location", approximate: false, groupId } }) }); setNotice("Location snapshot shared to chat."); }
  async function buildRoute(target: Coordinates, requestedMode: TravelMode) { const ownLocation = ownMapLocation(users, sessionUser?.id, location.coordinates); if (!ownLocation) { setNotice("No current or last-known location is available."); return; } try { setMode(requestedMode); const data = await apiFetch<{ route: RoutePreview }>("/api/map/route", { method: "POST", body: JSON.stringify({ from: ownLocation, to: target, mode: requestedMode }) }); setRoute(data.route); const map = mapRef.current; if (!map) return; const render = () => { if (map.getSource("route")) { (map.getSource("route") as mapboxgl.GeoJSONSource).setData(data.route.geometry); } else { map.addSource("route", { type: "geojson", data: data.route.geometry }); map.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#56c7ff", "line-width": 5, "line-opacity": 0.9 } }); } }; if (map.isStyleLoaded()) render(); else map.once("load", render); } catch (issue) { setNotice(issue instanceof Error ? issue.message : "Route failed"); } }
  function clearRoute() { setRoute(null); if (mapRef.current?.getLayer("route")) mapRef.current.removeLayer("route"); if (mapRef.current?.getSource("route")) mapRef.current.removeSource("route"); }

  if (!group) return <main className="map-page"><div className="map-empty"><MapPin /><h1>Choose or create a group first</h1><button className="button primary" onClick={() => navigate("/groups")}>Open groups</button></div></main>;
  return <main className="map-page"><div ref={mapNode} className={mapToken ? "map-canvas" : "map-canvas no-token"}>{!mapToken && <div className="map-config"><Satellite /><h2>Mapbox token required</h2><p>Add <code>VITE_MAPBOX_TOKEN</code>. All map, marker and route code is ready.</p></div>}</div><header className="map-header"><div><p className="eyebrow">Group map</p><h1>{group.name}</h1></div><span className={`location-pill ${location.state.toLowerCase()}`}>{location.state}</span></header><div className="map-tools"><button onClick={centerOnSelf}><Crosshair /> Me</button><button className={location.state === "LIVE" ? "active" : ""} aria-pressed={location.state === "LIVE"} onClick={location.start}>{location.state === "LIVE" ? <Pause /> : <Play />} {location.state === "LIVE" ? "Sharing" : "Share"}</button><button onClick={location.freeze}><Pause /> Freeze</button><button onClick={location.hide}><EyeOff /> Hide</button><button onClick={beginPlacing}><Plus /> Spot</button><button onClick={() => void shareLocation()}><MessageCircle /> Share</button></div>
    {(notice || location.error) && <div className="map-notice">{notice || location.error}<button onClick={() => setNotice("")}>×</button></div>}
    {selectedUser && <aside className="map-panel"><button className="panel-close" onClick={() => setSelectedUser(null)}><X /></button><MapAvatarView avatar={selectedUser.mapAvatar} fallback={selectedUser.displayName} className="profile-avatar" /><p className="eyebrow">{selectedUser.locationState}</p><h2>{selectedUser.displayName}</h2><p className="muted">@{selectedUser.username} · {selectedUser.status ? `${selectedUser.status.emoji || ""} ${selectedUser.status.text}` : "No active status"}</p><div className="stack-actions"><button className="button primary" onClick={() => void messageUser(selectedUser)}><MessageCircle /> Message</button><button className="button secondary" onClick={() => void showPublicSpots(selectedUser)}><MapPin /> Show Public Spots</button>{selectedUser.location && <><button className="button secondary" onClick={() => void buildRoute(selectedUser.location!, "WALKING")}><Route /> Walk to last coordinate</button><button className="button secondary" onClick={() => void buildRoute(selectedUser.location!, "DRIVING")}><Route /> Drive to last coordinate</button></>}</div></aside>}
    {selectedSpot && <aside className="map-panel"><button className="panel-close" onClick={() => setSelectedSpot(null)}><X /></button><span className={`spot-badge ${selectedSpot.visibility.toLowerCase()}`}>{selectedSpot.visibility === "PRIVATE" ? <Lock /> : <MapPin />}</span><p className="eyebrow">{selectedSpot.visibility} spot</p><h2>{selectedSpot.title}</h2><p className="muted">{selectedSpot.description || "No description"}</p><small>by {selectedSpot.owner.displayName}</small><div className="stack-actions"><button className="button primary" onClick={() => void buildRoute({ latitude: selectedSpot.latitude, longitude: selectedSpot.longitude }, "WALKING")}><Route /> Walking route</button><button className="button secondary" onClick={() => void buildRoute({ latitude: selectedSpot.latitude, longitude: selectedSpot.longitude }, "DRIVING")}><Route /> Driving route</button><button className="button secondary" onClick={() => void shareSpot()}><MessageCircle /> Share to Chat</button>{selectedSpot.ownerId === sessionUser?.id && <button className="button danger" onClick={() => socket.emit("spot:delete", { id: selectedSpot.id })}>Delete</button>}</div></aside>}
    {placing && <div className="modal-backdrop"><form className="modal-card" onSubmit={saveSpot}><button type="button" className="modal-close" onClick={() => setPlacing(null)}>×</button><p className="eyebrow">New spot</p><h2>Save this place</h2><label>Title<input name="title" required maxLength={100} autoFocus /></label><label>Description<textarea name="description" maxLength={1000} /></label><label>Visibility<select name="visibility"><option value="PUBLIC">Public to shared groups</option><option value="PRIVATE">Private — only me</option></select></label><button className="button primary wide">Save spot</button></form></div>}
    {route && <div className="route-card"><div><span><Route /></span><div><strong>{mode === "WALKING" ? "Walking" : "Driving"} route</strong><small>Destination uses the last known coordinate; no automatic rerouting.</small></div></div><div className="route-stats"><strong>{(route.distanceMeters / 1000).toFixed(1)} km</strong><strong>{Math.ceil(route.durationSeconds / 60)} min</strong></div><button className="route-clear" onClick={clearRoute}>Clear route</button></div>}
  </main>;
}
