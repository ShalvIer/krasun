import { useEffect, useState } from "react";
import { AtSign, Clock, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../../services/api";
import { useAuth } from "../auth/AuthContext";
import { activeStatus, locationLabel } from "./status";
import { MapAvatarEditor, MapAvatarView, type MapAvatarData } from "./MapAvatar";

interface Profile {
  id: string; username: string; displayName: string; primaryEmail?: string; alternateEmail?: string | null; alternateEmailVerifiedAt?: string | null; profileAvatarPath: string | null; lastSeenAt: string;
  location?: { state: string } | null; mapAvatar?: MapAvatarData | null; status?: { text: string; emoji: string | null; expiresAt: string } | null;
}
export function ProfilePage() {
  const { username } = useParams(); const { user } = useAuth(); const navigate = useNavigate(); const [profile, setProfile] = useState<Profile | null>(null); const [error, setError] = useState("");
  useEffect(() => { apiFetch<{ profile: Profile }>(username ? `/api/profiles/${username}` : "/api/profiles/me").then((data) => setProfile(data.profile)).catch((issue: Error) => setError(issue.message)); }, [username]);
  async function message() { if (!profile) return; const data = await apiFetch<{ conversation: { id: string } }>("/api/conversations/direct", { method: "POST", body: JSON.stringify({ userId: profile.id }) }); navigate(`/chat/direct/${data.conversation.id}`); }
  function updateMapAvatar(mapAvatar: MapAvatarData) { setProfile((current) => current ? { ...current, mapAvatar } : current); }
  if (error) return <main className="page"><div className="error-banner">{error}</div></main>;
  if (!profile) return <div className="center-screen"><span className="loader" /></div>;
  const status = activeStatus(profile.status);
  return <main className="page profile-page"><section className="profile-hero"><div className="profile-cover" /><div className="profile-main"><span className="avatar profile-xl">{profile.displayName?.[0]?.toUpperCase()}</span><div><p className="eyebrow">Krasun profile</p><h1>{profile.displayName}</h1><span className="username"><AtSign />{profile.username}</span></div>{profile.id !== user?.id && <button className="button primary" onClick={() => void message()}><MessageCircle /> Message</button>}</div></section><div className="profile-grid"><section className="panel"><div className="panel-title"><MapPin /><div><h2>Map presence</h2><p>{locationLabel(profile.location?.state)}</p></div></div><div className="state-card"><MapAvatarView avatar={profile.mapAvatar} fallback={profile.displayName} /><div><strong>{profile.location?.state || "OFFLINE"}</strong><small>Last seen {new Date(profile.lastSeenAt).toLocaleString()}</small></div></div><div className="detail-row"><span>Map avatar</span><strong>{profile.mapAvatar?.type || "DEFAULT"}</strong></div></section><section className="panel"><div className="panel-title"><Clock /><div><h2>Active status</h2><p>Expires automatically after the selected duration.</p></div></div>{status ? <div className="status-card"><span>{status.emoji || "●"}</span><div><strong>{status.text}</strong><small>until {new Date(status.expiresAt).toLocaleString()}</small></div></div> : <p className="muted empty-line">No active status.</p>}<div className="detail-row"><span>Visibility</span><strong>Shared-group members</strong></div></section>{profile.id === user?.id && <section className="panel"><div className="panel-title"><MapPin /><div><h2>Map avatar</h2><p>Choose how you appear to group members on the map.</p></div></div><MapAvatarEditor avatar={profile.mapAvatar} fallback={profile.displayName} onSaved={updateMapAvatar} /></section>}{profile.id === user?.id && <section className="panel"><div className="panel-title"><ShieldCheck /><div><h2>Account identity</h2><p>Primary login and verified contact groundwork.</p></div></div><div className="detail-row"><span>Primary Google email</span><strong>{profile.primaryEmail}</strong></div><div className="detail-row"><span>Alternate email</span><strong>{profile.alternateEmail || "Not set"}</strong></div></section>}</div></main>;
}
