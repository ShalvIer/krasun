import { Boxes, Map, MessageCircle, Settings, UserRound, Users, Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

const links = [
  { label: "Chat", to: "/chat", icon: MessageCircle },
  { label: "Map", to: "/groups/current/map", icon: Map },
  { label: "Groups", to: "/groups", icon: Users },
  { label: "Profile", to: "/profile", icon: UserRound },
  { label: "Settings", to: "/settings", icon: Settings }
];

export function AppShell() {
  const { user } = useAuth();
  const params = useParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentGroupId = params.groupId || localStorage.getItem("krasun:last-group") || "current";
  const resolved = links.map((item) => item.label === "Map" ? { ...item, to: `/groups/${currentGroupId}/map` } : item);
  return (
    <div className="app-shell">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="brand"><span className="brand-mark"><Boxes size={20} /></span><span>Krasun</span><button className="close-menu" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button></div>
        <nav>{resolved.map(({ label, to, icon: Icon }) => <NavLink key={label} to={to} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><Icon size={20} /><span>{label}</span></NavLink>)}</nav>
        <div className="sidebar-user"><span className="avatar small">{(user?.displayName || "K")[0]?.toUpperCase()}</span><div><strong>{user?.displayName}</strong><small>@{user?.username}</small></div></div>
      </aside>
      <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></button>
      <section className="app-content"><Outlet /></section>
      <nav className="bottom-nav">{resolved.slice(0, 4).map(({ label, to, icon: Icon }) => <NavLink key={label} to={to} className={({ isActive }) => isActive ? "active" : ""}><Icon size={21} /><span>{label}</span></NavLink>)}</nav>
      {menuOpen && <button className="menu-backdrop" onClick={() => setMenuOpen(false)} aria-label="Close menu" />}
    </div>
  );
}
