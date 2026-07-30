import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Image, Info, MessageCircle, Search, Send, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import type { ConversationSummary, MessageView } from "@krasun/shared-types";
import { apiFetch } from "../../services/api";
import { useAuth } from "../auth/AuthContext";
import { useSocket } from "../../services/socket";
import { useConversations } from "./useConversations";
import { AudioRecorder } from "./AudioRecorder";
import { MessageCard } from "./MessageCard";

export function ChatPage() {
  const { conversationId, groupId } = useParams();
  const { user } = useAuth(); const socket = useSocket(); const navigate = useNavigate();
  const { conversations, loading } = useConversations();
  const selected = conversations.find((item) => item.id === conversationId) ?? conversations.find((item) => item.groupId === groupId) ?? conversations[0];
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [text, setText] = useState(""); const [typing, setTyping] = useState(""); const [filter, setFilter] = useState(""); const [photo, setPhoto] = useState(""); const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null); const messagesRef = useRef<HTMLDivElement>(null); const typingTimer = useRef<number | undefined>(undefined); const stickToBottom = useRef(true);
  const filtered = useMemo(() => conversations.filter((item) => item.title.toLowerCase().includes(filter.toLowerCase())), [conversations, filter]);

  useEffect(() => {
    if (!selected) return;
    stickToBottom.current = true;
    if (!conversationId && selected.type === "DIRECT") navigate(`/chat/direct/${selected.id}`, { replace: true });
    socket.emit("chat:join", { conversationId: selected.id });
    apiFetch<{ messages: MessageView[] }>(`/api/conversations/${selected.id}/messages`).then((data) => setMessages(data.messages));
    const onMessage = (message: MessageView) => { if (message.conversationId === selected.id) setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]); };
    const onTyping = (payload: { conversationId: string; displayName: string; typing: boolean }) => { if (payload.conversationId === selected.id) setTyping(payload.typing ? `${payload.displayName} is typing…` : ""); };
    const onSpotDeleted = ({ id }: { id: string }) => setMessages((current) => current.map((message) => message.type === "SPOT" && message.payload?.spotId === id ? { ...message, spotAvailable: false } : message));
    socket.on("chat:message-created", onMessage); socket.on("chat:typing-updated", onTyping); socket.on("spot:deleted", onSpotDeleted);
    return () => { socket.emit("chat:leave", { conversationId: selected.id }); socket.off("chat:message-created", onMessage); socket.off("chat:typing-updated", onTyping); socket.off("spot:deleted", onSpotDeleted); };
  }, [selected?.id, socket]);
  useEffect(() => { const element = messagesRef.current; if (stickToBottom.current && element) element.scrollTo({ top: element.scrollHeight, behavior: "smooth" }); }, [messages, typing]);

  function trackScroll() { const element = messagesRef.current; if (element) stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120; }

  function chooseConversation(item: ConversationSummary) { navigate(item.type === "GROUP" && item.groupId ? `/groups/${item.groupId}/chat` : `/chat/direct/${item.id}`); }
  function updateText(value: string) { setText(value); if (!selected) return; socket.emit("chat:typing-start", { conversationId: selected.id }); window.clearTimeout(typingTimer.current); typingTimer.current = window.setTimeout(() => socket.emit("chat:typing-stop", { conversationId: selected.id }), 1600); }
  function sendText(event: React.FormEvent) { event.preventDefault(); if (!selected || !text.trim()) return; stickToBottom.current = true; socket.emit("chat:message-send", { conversationId: selected.id, text: text.trim() }); socket.emit("chat:typing-stop", { conversationId: selected.id }); setText(""); }
  async function upload(file: File, type: "AUDIO" | "PHOTO") { if (!selected) return; stickToBottom.current = true; setUploading(true); const body = new FormData(); body.append("file", file); body.append("conversationId", selected.id); body.append("type", type); try { const data = await apiFetch<{ message: MessageView }>("/api/uploads/message", { method: "POST", body }); setMessages((current) => current.some((message) => message.id === data.message.id) ? current : [...current, data.message]); } finally { setUploading(false); } }

  return <main className={selected ? "chat-layout conversation-open" : "chat-layout"}><aside className="conversation-sidebar"><header><div><p className="eyebrow">Messages</p><h1>Chat</h1></div><button className="icon-button"><MessageCircle /></button></header><div className="search-box"><Search /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search conversations" /></div>{loading ? <span className="loader" /> : <div className="conversation-list"><p className="section-label">Direct messages</p>{filtered.filter((item) => item.type === "DIRECT").map((item) => <ConversationRow key={item.id} item={item} selected={selected?.id === item.id} onClick={() => chooseConversation(item)} />)}<p className="section-label">Groups</p>{filtered.filter((item) => item.type === "GROUP").map((item) => <ConversationRow key={item.id} item={item} selected={selected?.id === item.id} onClick={() => chooseConversation(item)} />)}</div>}</aside>
    {selected ? <section className="message-view"><header className="message-header"><button className="back-chat" onClick={() => navigate("/chat")}><ArrowLeft /></button><span className="avatar">{selected.title[0]?.toUpperCase()}</span><div><h2>{selected.title}</h2><span>{selected.type === "GROUP" ? `${selected.participants.length} members` : "Direct message"}</span></div><button className="icon-button"><Info /></button></header><div ref={messagesRef} className="messages" onScroll={trackScroll}><div className="history-start"><span><Users /></span><h3>{selected.title}</h3><p>This is the beginning of this persistent conversation.</p></div>{messages.map((message) => <MessageCard key={message.id} message={message} mine={message.sender?.id === user?.id} onPhotoOpen={setPhoto} />)}{typing && <div className="typing-indicator"><i /><i /><i /><span>{typing}</span></div>}<div /></div><form className="composer" onSubmit={sendText}><AudioRecorder onReady={(blob) => void upload(new File([blob], `voice-${Date.now()}.webm`, { type: blob.type }), "AUDIO")} /><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, "PHOTO"); }} /><button type="button" className="icon-button" onClick={() => fileRef.current?.click()} aria-label="Send photo"><Image /></button><input value={text} onChange={(event) => updateText(event.target.value)} placeholder={`Message ${selected.title}`} maxLength={4000} /><button className="send-button" disabled={!text.trim() || uploading} aria-label="Send message"><Send /></button></form></section> : <section className="no-conversation"><MessageCircle /><h2>Choose a conversation</h2><p>Your group chats and direct messages share one realtime connection.</p></section>}
    {photo && <div className="photo-preview" onClick={() => setPhoto("")}><button>×</button><img src={photo} alt="Shared photo preview" /></div>}
  </main>;
}

function ConversationRow({ item, selected, onClick }: { item: ConversationSummary; selected: boolean; onClick(): void }) { return <button className={selected ? "conversation-row active" : "conversation-row"} onClick={onClick}><span className="avatar">{item.title[0]?.toUpperCase()}</span><span><strong>{item.title}</strong><small>{item.lastMessage?.type === "TEXT" ? item.lastMessage.text : item.lastMessage ? `${item.lastMessage.type.toLowerCase()} message` : "No messages yet"}</small></span>{item.lastMessage && <time>{new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>}</button>; }
