import { useState } from "react";
import { MapPin, Navigation, Reply, SmilePlus } from "lucide-react";
import { Link } from "react-router-dom";
import type { MessageView } from "@krasun/shared-types";
import { messageReactionEmojis } from "@krasun/shared-validation";
import { AuthenticatedMedia } from "./AuthenticatedMedia";
import { replyPreviewText } from "./chatTimeline";

function payloadString(payload: Record<string, unknown> | null, key: string) {
  const value = payload?.[key];
  return typeof value === "string" ? value : "";
}

function payloadNumber(payload: Record<string, unknown> | null, key: string) {
  const value = payload?.[key];
  return typeof value === "number" ? value : undefined;
}

interface MessageCardProps {
  message: MessageView;
  mine: boolean;
  viewerId: string;
  onPhotoOpen(url: string): void;
  onReply(message: MessageView): void;
  onReplyOpen(messageId: string): void;
  onToggleReaction(messageId: string, emoji: string): void;
}

export function MessageCard({ message, mine, viewerId, onPhotoOpen, onReply, onReplyOpen, onToggleReaction }: MessageCardProps) {
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const mapHref = `/groups/${payloadString(message.payload, "groupId") || localStorage.getItem("krasun:last-group") || "current"}/map?lat=${payloadNumber(message.payload, "latitude") ?? ""}&lng=${payloadNumber(message.payload, "longitude") ?? ""}&spotId=${payloadString(message.payload, "spotId")}`;

  function chooseReaction(emoji: string) {
    onToggleReaction(message.id, emoji);
    setReactionsOpen(false);
  }

  return <article id={`message-${message.id}`} className={mine ? "message mine" : "message"}>
    {message.replyTo && <button type="button" className="message-reply-preview" onClick={() => onReplyOpen(message.replyTo!.id)}>
      <strong>{message.replyTo.sender?.displayName || "Original message"}</strong>
      <span>{replyPreviewText(message.replyTo)}</span>
    </button>}

    <div className="message-author">
      {!mine && <strong>{message.sender?.displayName || "System"}</strong>}
      <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
    </div>

    {message.type === "TEXT" && <p>{message.text}</p>}
    {message.type === "SYSTEM" && <p className="system-message">{message.text}</p>}
    {message.type === "AUDIO" && message.attachments[0] && <AuthenticatedMedia path={message.attachments[0].url} type="audio" />}
    {message.type === "PHOTO" && message.attachments[0] && <AuthenticatedMedia path={message.attachments[0].url} type="image" onOpen={onPhotoOpen} />}
    {message.type === "SPOT" && (message.spotAvailable === false
      ? <div className="map-card unavailable"><MapPin /><div><strong>Spot unavailable</strong><span>The original spot was deleted.</span></div></div>
      : <div className="map-card"><span className="map-card-icon"><MapPin /></span><div><strong>{payloadString(message.payload, "title") || "Shared spot"}</strong><span>{payloadString(message.payload, "description") || "Open this place on the group map."}</span><Link to={mapHref}>Open on Map <Navigation size={14} /></Link></div></div>)}
    {message.type === "LOCATION" && <div className="map-card"><span className="map-card-icon"><Navigation /></span><div><strong>{payloadString(message.payload, "label") || `${message.sender?.displayName}'s location`}</strong><span>Coordinate snapshot</span><Link to={mapHref}>Open on Map <Navigation size={14} /></Link></div></div>}
    {["MEETING", "VIDEO", "FILE"].includes(message.type) && <div className="placeholder-card">{message.type} messages are reserved for a future release.</div>}

    {message.reactions.length > 0 && <div className="message-reactions">
      {message.reactions.map((reaction) => <button
        type="button"
        key={reaction.emoji}
        className={reaction.userIds.includes(viewerId) ? "active" : ""}
        aria-label={`${reaction.emoji}, ${reaction.count}`}
        onClick={() => chooseReaction(reaction.emoji)}
      ><span>{reaction.emoji}</span><b>{reaction.count}</b></button>)}
    </div>}

    {message.type !== "SYSTEM" && <div className="message-actions">
      <button type="button" onClick={() => onReply(message)} aria-label="Reply to message"><Reply /></button>
      <div className="reaction-picker-wrap">
        <button type="button" onClick={() => setReactionsOpen((open) => !open)} aria-label="React to message"><SmilePlus /></button>
        {reactionsOpen && <div className="reaction-picker" role="menu">
          {messageReactionEmojis.map((emoji) => <button type="button" key={emoji} onClick={() => chooseReaction(emoji)}>{emoji}</button>)}
        </div>}
      </div>
    </div>}
  </article>;
}
