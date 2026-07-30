import { useEffect, useRef, useState } from "react";
import type { MapAvatarType } from "@krasun/shared-types";
import { Image, Save } from "lucide-react";
import { apiFetch, authenticatedMediaUrl } from "../../services/api";

export interface MapAvatarData {
  type: MapAvatarType;
  value: string | null;
}

const mediaTypes: MapAvatarType[] = ["PHOTO", "GIF", "VIDEO"];
const avatarTypes: MapAvatarType[] = ["DEFAULT", "EMOJI", ...mediaTypes];
const emojis = ["☕", "🎧", "🚶", "🧊", "🍕", "🏠", "📚", "🔥", "🌙", "⚡"];

export function MapAvatarView({ avatar, fallback, className = "" }: { avatar?: MapAvatarData | null; fallback: string; className?: string }) {
  const [source, setSource] = useState("");
  const value = avatar?.value || "";
  const isMedia = Boolean(avatar && mediaTypes.includes(avatar.type) && value);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setSource("");
    if (!isMedia) return;
    if (!value.startsWith("/api/")) {
      setSource(value);
      return;
    }
    void authenticatedMediaUrl(value).then((url) => {
      objectUrl = url;
      if (active) setSource(url);
    }).catch(() => undefined);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isMedia, value]);

  const classes = `avatar map-avatar-view ${className}`.trim();
  if (avatar?.type === "EMOJI" && value) return <span className={`${classes} emoji`} aria-label="Map avatar">{value}</span>;
  if (source && avatar?.type === "VIDEO") return <span className={classes}><video src={source} autoPlay muted loop playsInline aria-label="Map avatar" /></span>;
  if (source) return <span className={classes}><img src={source} alt="Map avatar" /></span>;
  return <span className={classes}>{fallback.slice(0, 1).toUpperCase() || "K"}</span>;
}

export function MapAvatarEditor({ avatar, fallback, onSaved }: { avatar?: MapAvatarData | null; fallback: string; onSaved(avatar: MapAvatarData): void }) {
  const [type, setType] = useState<MapAvatarType>(avatar?.type || "DEFAULT");
  const [emoji, setEmoji] = useState(avatar?.type === "EMOJI" && avatar.value ? avatar.value : "☕");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setType(avatar?.type || "DEFAULT");
    if (avatar?.type === "EMOJI" && avatar.value) setEmoji(avatar.value);
  }, [avatar?.type, avatar?.value]);

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      const data = await apiFetch<{ avatar: MapAvatarData }>("/api/map/avatar", { method: "PUT", body: JSON.stringify({ type, value: type === "EMOJI" ? emoji : null }) });
      onSaved(data.avatar);
      setNotice("Map avatar updated.");
    } catch (issue) {
      setNotice(issue instanceof Error ? issue.message : "Avatar could not be saved");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File) {
    setSaving(true);
    setNotice("");
    const body = new FormData();
    body.append("file", file);
    try {
      const data = await apiFetch<{ avatar: MapAvatarData }>("/api/uploads/avatar", { method: "POST", body });
      setType(data.avatar.type);
      onSaved(data.avatar);
      setNotice("Map avatar uploaded.");
    } catch (issue) {
      setNotice(issue instanceof Error ? issue.message : "Avatar could not be uploaded");
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const preview: MapAvatarData = type === "EMOJI" ? { type, value: emoji } : type === avatar?.type ? avatar : { type, value: null };
  return <div className="map-avatar-editor">
    <div className="map-avatar-preview"><MapAvatarView avatar={preview} fallback={fallback} className="profile-avatar" /><div><strong>Marker preview</strong><small>{type.toLowerCase()} avatar</small></div></div>
    <div className="avatar-type-grid">{avatarTypes.map((item) => <button type="button" key={item} className={type === item ? "active" : ""} onClick={() => { setType(item); setNotice(""); }}>{item}</button>)}</div>
    {type === "EMOJI" && <div className="emoji-grid">{emojis.map((item) => <button type="button" className={emoji === item ? "active" : ""} key={item} onClick={() => setEmoji(item)}>{item}</button>)}</div>}
    <input ref={fileRef} hidden type="file" accept={type === "VIDEO" ? "video/webm,video/mp4" : type === "GIF" ? "image/gif" : "image/jpeg,image/png,image/webp"} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
    {mediaTypes.includes(type) ? <button type="button" className="button primary wide" disabled={saving} onClick={() => fileRef.current?.click()}><Image /> {saving ? "Uploading…" : `Choose ${type.toLowerCase()} file`}</button> : <button type="button" className="button primary wide" disabled={saving} onClick={() => void save()}><Save /> {saving ? "Saving…" : "Save map avatar"}</button>}
    {notice && <p className="avatar-editor-notice" role="status">{notice}</p>}
  </div>;
}
