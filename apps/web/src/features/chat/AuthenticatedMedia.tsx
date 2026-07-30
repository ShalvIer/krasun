import { useEffect, useState } from "react";
import { authenticatedMediaUrl } from "../../services/api";

export function AuthenticatedMedia({ path, type, alt = "Shared photo", onOpen }: { path: string; type: "image" | "audio"; alt?: string; onOpen?(url: string): void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let current = "";
    setUrl("");
    setError("");
    void authenticatedMediaUrl(path)
      .then((value) => {
        current = value;
        if (active) setUrl(value);
      })
      .catch((issue: Error) => {
        if (active) setError(issue.message || "Media could not be loaded");
      });
    return () => {
      active = false;
      if (current) URL.revokeObjectURL(current);
    };
  }, [path, attempt]);

  if (error) return <span className="media-error">{error}. <button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></span>;
  if (!url) return <span className="media-skeleton">Loading media…</span>;
  return type === "audio" ? <audio controls preload="metadata" src={url} /> : <button className="photo-message" onClick={() => onOpen?.(url)}><img src={url} alt={alt} /></button>;
}
