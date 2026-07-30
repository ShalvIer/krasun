import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, BrowserRouter, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "../features/auth/AuthContext";
import { SocketProvider } from "../services/socket";
import { LocationProvider } from "../features/location/LocationProvider";
import { AppShell } from "./AppShell";
import { LoginPage } from "../features/auth/LoginPage";
import { OnboardingPage } from "../features/auth/OnboardingPage";
import { GroupsPage } from "../features/groups/GroupsPage";
import { DashboardPage } from "../features/groups/DashboardPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { SettingsPage } from "../features/profile/SettingsPage";
import { GroupSettingsPage } from "../features/groups/GroupSettingsPage";

const ChatPage = lazy(() => import("../features/chat/ChatPage").then((module) => ({ default: module.ChatPage })));
const MapPage = lazy(() => import("../features/map/MapPage").then((module) => ({ default: module.MapPage })));

function Deferred({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="center-screen"><span className="loader" /><p>Opening view…</p></div>}>{children}</Suspense>;
}

function Protected() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="center-screen"><span className="loader" /><p>Restoring secure session…</p></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!user.onboardingCompleted && location.pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
  if (user.onboardingCompleted && location.pathname === "/onboarding") return <Navigate to="/groups" replace />;
  return <SocketProvider><LocationProvider><Routes>
    <Route path="/onboarding" element={<OnboardingPage />} />
    <Route element={<AppShell />}>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/groups" element={<GroupsPage />} />
      <Route path="/groups/:groupId" element={<DashboardPage />} />
      <Route path="/groups/:groupId/chat" element={<Deferred><ChatPage /></Deferred>} />
      <Route path="/groups/:groupId/map" element={<Deferred><MapPage /></Deferred>} />
      <Route path="/groups/:groupId/members" element={<GroupSettingsPage />} />
      <Route path="/groups/:groupId/settings" element={<GroupSettingsPage />} />
      <Route path="/chat" element={<Deferred><ChatPage /></Deferred>} />
      <Route path="/chat/direct/:conversationId" element={<Deferred><ChatPage /></Deferred>} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/profile/:username" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Route>
  </Routes></LocationProvider></SocketProvider>;
}

function RootRoutes() {
  const { user } = useAuth();
  return <Routes>
    <Route path="/login" element={user ? <Navigate to={user.onboardingCompleted ? "/groups" : "/onboarding"} replace /> : <LoginPage />} />
    <Route path="*" element={<Protected />} />
  </Routes>;
}

export function App() { return <BrowserRouter><AuthProvider><RootRoutes /></AuthProvider></BrowserRouter>; }
