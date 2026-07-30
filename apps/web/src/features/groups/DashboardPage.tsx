import { Link, useParams } from "react-router-dom";
import { Map, MessageCircle, Settings, Users } from "lucide-react";
import { useGroups } from "./useGroups";

export function DashboardPage() {
  const { groupId } = useParams(); const { groups, loading } = useGroups();
  const group = groups.find((item) => item.id === groupId) ?? groups[0];
  if (loading) return <div className="center-screen"><span className="loader" /></div>;
  if (!group) return <main className="page"><div className="empty-state"><h1>No groups yet</h1><Link className="button primary" to="/groups">Create your first group</Link></div></main>;
  localStorage.setItem("krasun:last-group", group.id);
  return <main className="page dashboard"><header className="dashboard-hero"><span className="group-avatar large">{group.name[0]?.toUpperCase()}</span><div><p className="eyebrow">{group.role} · {group.memberCount} members</p><h1>{group.name}</h1><p>{group.description || "Your shared conversation and realtime map."}</p></div></header><div className="dashboard-grid"><Link to={`/groups/${group.id}/chat`}><MessageCircle /><div><h2>Open Chat</h2><p>Messages, voice notes, photos and map cards.</p></div></Link><Link to={`/groups/${group.id}/map`}><Map /><div><h2>Open Map</h2><p>Live people, statuses, spots and route previews.</p></div></Link><Link to={`/groups/${group.id}/members`}><Users /><div><h2>Members</h2><p>Profiles, roles and shared-group visibility.</p></div></Link><Link to={`/groups/${group.id}/settings`}><Settings /><div><h2>Group settings</h2><p>Invite code, join mode and pending requests.</p></div></Link></div></main>;
}
