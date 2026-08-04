import { Boxes, Map, MessageCircle, Settings, UserRound, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { apiFetch } from "../services/api";
import { useSocket } from "../services/socket";
import type { ConversationSummary } from "@krasun/shared-types";

const links = [
  { label: "Map", to: "/groups/current/map", icon: Map },
  { label: "Chat", to: "/chat", icon: MessageCircle },
  { label: "Groups", to: "/groups", icon: Users },
  { label: "Profile", to: "/profile", icon: UserRound },
  { label: "Settings", to: "/settings", icon: Settings }
];

export function AppShell() {
  const { user } = useAuth();
  const socket = useSocket();
  const params = useParams();
  const [unread, setUnread] = useState(0);
  const currentGroupId = params.groupId || localStorage.getItem("krasun:last-group") || "current";
  const resolved = links.map((item) => item.label === "Map" ? { ...item, to: `/groups/${currentGroupId}/map` } : item);
  const refreshUnread = useCallback(() => {
    void apiFetch<{ conversations: ConversationSummary[] }>("/api/conversations")
      .then(({ conversations }) => setUnread(conversations.reduce((total, conversation) => total + conversation.unreadCount, 0)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshUnread();
    const onMessage = () => refreshUnread();
    const onRead = () => refreshUnread();
    socket.on("chat:message-created", onMessage);
    window.addEventListener("krasun:unread-changed", onRead);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      socket.off("chat:message-created", onMessage);
      window.removeEventListener("krasun:unread-changed", onRead);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [refreshUnread, socket]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Boxes size={20} /></span><span>Krasun</span></div>
        <nav>{resolved.map(({ label, to, icon: Icon }) => <NavLink key={label} to={to} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><Icon size={20} /><span>{label}</span>{label === "Chat" && unread > 0 && <b className="nav-badge">{Math.min(unread, 99)}</b>}</NavLink>)}</nav>
        <div className="sidebar-user"><span className="avatar small">{(user?.displayName || "K")[0]?.toUpperCase()}</span><div><strong>{user?.displayName}</strong><small>@{user?.username}</small></div></div>
      </aside>
      <section className="app-content"><Outlet /></section>
      <nav className="bottom-nav" aria-label="Primary navigation">{resolved.slice(0, 4).map(({ label, to, icon: Icon }) => <NavLink key={label} to={to} className={({ isActive }) => isActive ? "active" : ""}><span className="bottom-nav-icon"><Icon size={21} />{label === "Chat" && unread > 0 && <b>{Math.min(unread, 99)}</b>}</span><span>{label}</span></NavLink>)}</nav>
    </div>
  );
}
