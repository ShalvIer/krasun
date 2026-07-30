import { MapPin, Navigation } from "lucide-react";
import { Link } from "react-router-dom";
import type { MessageView } from "@krasun/shared-types";
import { AuthenticatedMedia } from "./AuthenticatedMedia";

function payloadString(payload: Record<string, unknown> | null, key: string) { const value = payload?.[key]; return typeof value === "string" ? value : ""; }
function payloadNumber(payload: Record<string, unknown> | null, key: string) { const value = payload?.[key]; return typeof value === "number" ? value : undefined; }

export function MessageCard({ message, mine, onPhotoOpen }: { message: MessageView; mine: boolean; onPhotoOpen(url: string): void }) {
  const mapHref = `/groups/${payloadString(message.payload, "groupId") || localStorage.getItem("krasun:last-group") || "current"}/map?lat=${payloadNumber(message.payload, "latitude") ?? ""}&lng=${payloadNumber(message.payload, "longitude") ?? ""}&spotId=${payloadString(message.payload, "spotId")}`;
  return <article className={mine ? "message mine" : "message"}><div className="message-author">{!mine && <strong>{message.sender?.displayName || "System"}</strong>}<time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>
    {message.type === "TEXT" && <p>{message.text}</p>}
    {message.type === "SYSTEM" && <p className="system-message">{message.text}</p>}
    {message.type === "AUDIO" && message.attachments[0] && <AuthenticatedMedia path={message.attachments[0].url} type="audio" />}
    {message.type === "PHOTO" && message.attachments[0] && <AuthenticatedMedia path={message.attachments[0].url} type="image" onOpen={onPhotoOpen} />}
    {message.type === "SPOT" && (message.spotAvailable === false ? <div className="map-card unavailable"><MapPin /><div><strong>Spot unavailable</strong><span>The original spot was deleted.</span></div></div> : <div className="map-card"><span className="map-card-icon"><MapPin /></span><div><strong>{payloadString(message.payload, "title") || "Shared spot"}</strong><span>{payloadString(message.payload, "description") || "Open this place on the group map."}</span><Link to={mapHref}>Open on Map <Navigation size={14} /></Link></div></div>)}
    {message.type === "LOCATION" && <div className="map-card"><span className="map-card-icon"><Navigation /></span><div><strong>{payloadString(message.payload, "label") || `${message.sender?.displayName}'s location`}</strong><span>Coordinate snapshot · {payloadString(message.payload, "approximate") === "true" ? "approximate" : "exact"}</span><Link to={mapHref}>Open on Map <Navigation size={14} /></Link></div></div>}
    {["MEETING", "VIDEO", "FILE"].includes(message.type) && <div className="placeholder-card">{message.type} messages are reserved for a future release.</div>}
  </article>;
}
