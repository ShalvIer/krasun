import { useEffect, useRef, useState } from "react";
import { Check, Mic, Square, Trash2 } from "lucide-react";

export function AudioRecorder({ onReady }: { onReady(blob: Blob): void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => { if (!recording) return; const id = window.setInterval(() => setSeconds((value) => value + 1), 1000); return () => window.clearInterval(id); }, [recording]);
  useEffect(() => () => stream.current?.getTracks().forEach((track) => track.stop()), []);

  async function start() {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      recorder.current = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
      chunks.current = [];
      recorder.current.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      recorder.current.start(); setRecording(true); setSeconds(0); setError("");
    } catch { setError("Microphone permission is required for audio messages."); }
  }
  function stop(send: boolean) {
    const active = recorder.current; if (!active) return;
    active.onstop = () => { if (send) onReady(new Blob(chunks.current, { type: active.mimeType || "audio/webm" })); stream.current?.getTracks().forEach((track) => track.stop()); setRecording(false); setSeconds(0); };
    active.stop();
  }
  if (!recording) return <><button className="icon-button" type="button" onClick={() => void start()} aria-label="Record audio"><Mic /></button>{error && <span className="composer-error">{error}</span>}</>;
  return <div className="recording"><span className="recording-dot" /><strong>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</strong><button type="button" onClick={() => stop(false)} aria-label="Cancel recording"><Trash2 /></button><button type="button" onClick={() => stop(true)} aria-label="Send recording"><Check /></button><Square size={13} /></div>;
}
