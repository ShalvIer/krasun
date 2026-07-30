import { useEffect, useState } from "react";
import { Copy, Shield, UserCheck, Users } from "lucide-react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../../services/api";
import { useGroups } from "./useGroups";

interface Member { role: string; user: { id: string; displayName: string; username: string; lastSeenAt: string } }
interface JoinRequest { id: string; user: { displayName: string; username: string } }
export function GroupSettingsPage() {
  const { groupId = "" } = useParams(); const { groups, reload } = useGroups(); const group = groups.find((item) => item.id === groupId);
  const [members, setMembers] = useState<Member[]>([]); const [requests, setRequests] = useState<JoinRequest[]>([]);
  const load = () => { if (!groupId) return; void apiFetch<{ members: Member[] }>(`/api/groups/${groupId}/members`).then((data) => setMembers(data.members)); if (group?.role !== "MEMBER") void apiFetch<{ requests: JoinRequest[] }>(`/api/groups/${groupId}/requests`).then((data) => setRequests(data.requests)).catch(() => undefined); };
  useEffect(() => { void load(); }, [groupId, group?.role]);
  async function act(id: string, action: "approve" | "reject") { await apiFetch(`/api/groups/${groupId}/requests/${id}/${action}`, { method: "POST" }); load(); }
  async function regenerate() { await apiFetch(`/api/groups/${groupId}/invite/regenerate`, { method: "POST" }); reload(); }
  return <main className="page"><header className="page-header"><div><p className="eyebrow">Group controls</p><h1>{group?.name || "Members"}</h1><p>Membership drives access to chat, realtime locations and public spots.</p></div></header><div className="settings-grid"><section className="panel"><div className="panel-title"><Users /><div><h2>Members</h2><p>{members.length} active people</p></div></div><div className="member-list">{members.map(({ user, role }) => <div key={user.id}><span className="avatar">{user.displayName?.[0]}</span><span><strong>{user.displayName}</strong><small>@{user.username}</small></span><span className="role-pill">{role}</span></div>)}</div></section><section className="panel"><div className="panel-title"><Shield /><div><h2>Invite & access</h2><p>{group?.joinMode?.replaceAll("_", " ")}</p></div></div><div className="invite-code"><span>{group?.inviteCode}</span><button onClick={() => void navigator.clipboard.writeText(group?.inviteCode || "")}><Copy /></button></div>{group?.role === "OWNER" && <button className="button secondary wide" onClick={() => void regenerate()}>Regenerate invite</button>}<h3 className="subheading">Pending requests</h3>{requests.length === 0 ? <p className="muted">No pending requests.</p> : requests.map((request) => <div className="request-row" key={request.id}><UserCheck /><span>{request.user.displayName}<small>@{request.user.username}</small></span><button onClick={() => void act(request.id, "approve")}>Approve</button><button onClick={() => void act(request.id, "reject")}>Reject</button></div>)}</section></div></main>;
}
