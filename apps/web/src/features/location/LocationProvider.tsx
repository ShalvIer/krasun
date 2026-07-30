import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Coordinates, LocationState } from "@krasun/shared-types";
import { useSocket } from "../../services/socket";
import { useAuth } from "../auth/AuthContext";
import { setLocationSharingPreference, shouldResumeLocationSharing } from "./locationSharingPreference";

interface LocationValue {
  state: LocationState;
  coordinates: Coordinates | null;
  error: string;
  start(): void;
  freeze(): void;
  hide(): void;
}
const LocationContext = createContext<LocationValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();
  const { user } = useAuth();
  const userId = user!.id;
  const [state, setState] = useState<LocationState>(() => shouldResumeLocationSharing(userId) ? "LIVE" : "OFFLINE");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [error, setError] = useState("");
  const watchRef = useRef<number | null>(null);

  const stopWatch = useCallback(() => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }, []);
  const publish = useCallback((next: Coordinates) => { setCoordinates(next); setState("LIVE"); socket.emit("map:location-update", { ...next, timestamp: Date.now() }); }, [socket]);
  const start = useCallback(() => {
    setError(""); stopWatch();
    if (!navigator.geolocation) {
      setLocationSharingPreference(userId, false);
      setState("OFFLINE");
      setError("Geolocation is unavailable on this device.");
      return;
    }
    setLocationSharingPreference(userId, true);
    setState("LIVE");
    watchRef.current = navigator.geolocation.watchPosition(
      (position) => publish({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }),
      (issue) => {
        stopWatch();
        setLocationSharingPreference(userId, false);
        setState("OFFLINE");
        setError(issue.code === issue.PERMISSION_DENIED ? "Location permission denied." : issue.message);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }, [publish, stopWatch, userId]);
  useEffect(() => {
    if (shouldResumeLocationSharing(userId)) start();
    return () => stopWatch();
  }, [start, stopWatch, userId]);
  const freeze = useCallback(() => {
    if (!coordinates) { setError("Share your location first."); return; }
    stopWatch();
    setLocationSharingPreference(userId, false);
    setState("FROZEN");
    socket.emit("map:location-freeze");
  }, [coordinates, socket, stopWatch, userId]);
  const hide = useCallback(() => {
    stopWatch();
    setLocationSharingPreference(userId, false);
    setState("HIDDEN");
    socket.emit("map:location-hide");
  }, [socket, stopWatch, userId]);
  const value = useMemo(() => ({ state, coordinates, error, start, freeze, hide }), [state, coordinates, error, start, freeze, hide]);
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationSharing() { const context = useContext(LocationContext); if (!context) throw new Error("LocationProvider is missing"); return context; }
