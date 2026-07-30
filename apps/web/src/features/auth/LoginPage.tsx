import { useEffect, useRef, useState } from "react";
import { Boxes, MapPinned, MessageCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "./AuthContext";

export function LoginPage() {
  const { loginGoogle, loginDev } = useAuth();
  const googleButton = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const devEnabled = import.meta.env.VITE_ENABLE_DEV_LOGIN === "true";

  useEffect(() => {
    if (!clientId) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      if (!window.google || !googleButton.current) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => { setBusy(true); loginGoogle(credential).catch((issue: Error) => setError(issue.message)).finally(() => setBusy(false)); } });
      window.google.accounts.id.renderButton(googleButton.current, { theme: "filled_black", size: "large", shape: "pill", width: 320, text: "continue_with" });
    };
    document.head.appendChild(script);
    return () => script.remove();
  }, [clientId, loginGoogle]);

  async function demoLogin() {
    setBusy(true); setError("");
    try { await loginDev("andron.demo@krasun.local", "Andron Demo"); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Login failed"); }
    finally { setBusy(false); }
  }

  return <main className="login-page">
    <section className="login-visual">
      <div className="brand hero-brand"><span className="brand-mark"><Boxes /></span><span>Krasun</span></div>
      <div className="hero-copy"><p className="eyebrow">Your people, in one place</p><h1>Talk. Meet. <span>Move together.</span></h1><p>Krasun unifies private group chat with a realtime social map—without turning your location into public content.</p></div>
      <div className="feature-row"><span><MessageCircle /> Persistent chat</span><span><MapPinned /> Shared map</span><span><ShieldCheck /> Group privacy</span></div>
      <div className="map-orbit" aria-hidden="true"><span className="pulse p1" /><span className="pulse p2" /><span className="pulse p3" /><div className="route-line" /></div>
    </section>
    <section className="login-panel"><div className="login-card"><span className="mobile-logo"><Boxes /> Krasun</span><p className="eyebrow">Welcome</p><h2>Continue to your circle</h2><p className="muted">Sign in with a verified Google account. Your long-lived session stays in a secure HTTP-only cookie.</p>
      {clientId ? <div ref={googleButton} className="google-button" /> : <div className="config-note"><strong>Google OAuth needs one key</strong><span>Add <code>VITE_GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_ID</code> to enable production sign-in.</span></div>}
      {devEnabled && <button className="button secondary wide" disabled={busy} onClick={demoLogin}>{busy ? "Opening…" : "Continue with local demo"}</button>}
      {error && <p className="error-banner">{error}</p>}<small className="legal">By continuing, you agree to use location sharing only with people you trust.</small></div></section>
  </main>;
}
