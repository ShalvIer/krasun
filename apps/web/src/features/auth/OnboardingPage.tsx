import { useState } from "react";
import { AtSign, Boxes, Mail, UserRound } from "lucide-react";
import { useAuth } from "./AuthContext";

export function OnboardingPage() {
  const { user, completeOnboarding } = useAuth();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [alternateEmail, setAlternateEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { await completeOnboarding({ username, displayName, alternateEmail }); } catch (issue) { setError(issue instanceof Error ? issue.message : "Could not save profile"); } finally { setBusy(false); } }
  return <main className="onboarding-page"><form className="onboarding-card" onSubmit={submit}><div className="brand"><span className="brand-mark"><Boxes /></span>Krasun</div><p className="eyebrow">One last step</p><h1>Create your Krasun profile</h1><p className="muted">This identity is shared by Chat and Map. Your Google email remains your primary sign-in identity.</p>
    <label><span><AtSign size={16} /> Username</span><input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="andron" minLength={3} maxLength={24} required /></label>
    <label><span><UserRound size={16} /> Display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Andron" maxLength={60} /></label>
    <label><span><Mail size={16} /> Recovery/contact email <em>optional</em></span><input type="email" value={alternateEmail} onChange={(event) => setAlternateEmail(event.target.value)} placeholder="you@example.com" /></label>
    <div className="primary-email"><small>Google account</small><strong>{user?.primaryEmail}</strong></div>{error && <p className="error-banner">{error}</p>}<button className="button primary wide" disabled={busy || username.length < 3}>{busy ? "Saving…" : "Enter Krasun"}</button></form></main>;
}
