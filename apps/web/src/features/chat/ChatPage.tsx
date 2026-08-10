import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Image, Info, MessageCircle, Search, Send, Users, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import type { ConversationSummary, MessageReactionView, MessageView } from "@krasun/shared-types";
import { apiFetch } from "../../services/api";
import { useAuth } from "../auth/AuthContext";
import { useSocket } from "../../services/socket";
import { useConversations } from "./useConversations";
import { AudioRecorder } from "./AudioRecorder";
import { MessageCard } from "./MessageCard";
import { calendarDayKey, daySeparatorLabel, replyPreviewText } from "./chatTimeline";

export function ChatPage() {
  const { conversationId, groupId } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const { conversations, loading } = useConversations();
  const selected = conversations.find((item) => item.id === conversationId) ?? conversations.find((item) => item.groupId === groupId);
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState("");
  const [filter, setFilter] = useState("");
  const [photo, setPhoto] = useState("");
  const [uploading, setUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageView | null>(null);
  const [chatError, setChatError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | undefined>(undefined);
  const stickToBottom = useRef(true);
  const filtered = useMemo(() => conversations.filter((item) => item.title.toLowerCase().includes(filter.toLowerCase())), [conversations, filter]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    stickToBottom.current = true;
    setMessages([]);
    setReplyingTo(null);
    setChatError("");
    socket.emit("chat:join", { conversationId: selected.id });
    void apiFetch<{ messages: MessageView[] }>(`/api/conversations/${selected.id}/messages`).then((data) => {
      if (cancelled) return;
      setMessages(data.messages);
      void markRead(selected.id);
    });

    const onMessage = (message: MessageView) => {
      if (message.conversationId !== selected.id) return;
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      if (document.visibilityState === "visible") void markRead(selected.id);
    };
    const onReaction = (payload: { conversationId: string; messageId: string; reactions: MessageReactionView[] }) => {
      if (payload.conversationId !== selected.id) return;
      setMessages((current) => current.map((message) => message.id === payload.messageId ? { ...message, reactions: payload.reactions } : message));
    };
    const onTyping = (payload: { conversationId: string; displayName: string; typing: boolean }) => {
      if (payload.conversationId === selected.id) setTyping(payload.typing ? `${payload.displayName} is typing…` : "");
    };
    const onSpotDeleted = ({ id }: { id: string }) => setMessages((current) => current.map((message) => message.type === "SPOT" && message.payload?.spotId === id ? { ...message, spotAvailable: false } : message));
    socket.on("chat:message-created", onMessage);
    socket.on("chat:reaction-updated", onReaction);
    socket.on("chat:typing-updated", onTyping);
    socket.on("spot:deleted", onSpotDeleted);
    return () => {
      cancelled = true;
      socket.emit("chat:leave", { conversationId: selected.id });
      socket.off("chat:message-created", onMessage);
      socket.off("chat:reaction-updated", onReaction);
      socket.off("chat:typing-updated", onTyping);
      socket.off("spot:deleted", onSpotDeleted);
    };
  }, [selected?.id, socket]);

  useEffect(() => {
    const element = messagesRef.current;
    if (stickToBottom.current && element) element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  function trackScroll() {
    const element = messagesRef.current;
    if (element) stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
  }

  async function markRead(id: string) {
    await apiFetch(`/api/conversations/${id}/read`, { method: "POST" }).catch(() => undefined);
    window.dispatchEvent(new Event("krasun:unread-changed"));
  }

  function chooseConversation(item: ConversationSummary) {
    navigate(item.type === "GROUP" && item.groupId ? `/groups/${item.groupId}/chat` : `/chat/direct/${item.id}`);
  }

  function updateText(value: string) {
    setText(value);
    if (!selected) return;
    socket.emit("chat:typing-start", { conversationId: selected.id });
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => socket.emit("chat:typing-stop", { conversationId: selected.id }), 1600);
  }

  function sendText(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !text.trim()) return;
    stickToBottom.current = true;
    socket.emit("chat:message-send", { conversationId: selected.id, text: text.trim(), replyToId: replyingTo?.id });
    socket.emit("chat:typing-stop", { conversationId: selected.id });
    setText("");
    setReplyingTo(null);
  }

  async function upload(file: File, type: "AUDIO" | "PHOTO") {
    if (!selected) return;
    stickToBottom.current = true;
    setUploading(true);
    setChatError("");
    const body = new FormData();
    body.append("file", file);
    body.append("conversationId", selected.id);
    body.append("type", type);
    if (replyingTo) body.append("replyToId", replyingTo.id);
    try {
      const data = await apiFetch<{ message: MessageView }>("/api/uploads/message", { method: "POST", body });
      setMessages((current) => current.some((message) => message.id === data.message.id) ? current : [...current, data.message]);
      setReplyingTo(null);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Message could not be sent");
    } finally {
      setUploading(false);
    }
  }

  async function toggleReaction(messageId: string, emoji: string) {
    if (!selected) return;
    setChatError("");
    try {
      const data = await apiFetch<{ reactions: MessageReactionView[] }>(`/api/conversations/${selected.id}/messages/${messageId}/reactions`, { method: "POST", body: JSON.stringify({ emoji }) });
      setMessages((current) => current.map((message) => message.id === messageId ? { ...message, reactions: data.reactions } : message));
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Reaction could not be saved");
    }
  }

  function beginReply(message: MessageView) {
    setReplyingTo(message);
    window.setTimeout(() => textRef.current?.focus(), 0);
  }

  function openReplyTarget(messageId: string) {
    const element = document.getElementById(`message-${messageId}`);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.classList.add("message-highlight");
    window.setTimeout(() => element.classList.remove("message-highlight"), 1200);
  }

  return <main className={selected ? "chat-layout conversation-open" : "chat-layout"}>
    <aside className="conversation-sidebar">
      <header><div><p className="eyebrow">Messages</p><h1>Chat</h1></div><button className="icon-button"><MessageCircle /></button></header>
      <div className="search-box"><Search /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search conversations" /></div>
      {loading ? <span className="loader" /> : <div className="conversation-list">
        <p className="section-label">Direct messages</p>
        {filtered.filter((item) => item.type === "DIRECT").map((item) => <ConversationRow key={item.id} item={item} selected={selected?.id === item.id} onClick={() => chooseConversation(item)} />)}
        <p className="section-label">Groups</p>
        {filtered.filter((item) => item.type === "GROUP").map((item) => <ConversationRow key={item.id} item={item} selected={selected?.id === item.id} onClick={() => chooseConversation(item)} />)}
      </div>}
    </aside>

    {selected ? <section className="message-view">
      <header className="message-header"><button className="back-chat" onClick={() => navigate("/chat")}><ArrowLeft /></button><span className="avatar">{selected.title[0]?.toUpperCase()}</span><div><h2>{selected.title}</h2><span>{selected.type === "GROUP" ? `${selected.participants.length} members` : "Direct message"}</span></div><button className="icon-button"><Info /></button></header>
      <div ref={messagesRef} className="messages" onScroll={trackScroll}>
        <div className="history-start"><span><Users /></span><h3>{selected.title}</h3><p>This is the beginning of this persistent conversation.</p></div>
        {messages.map((message, index) => <Fragment key={message.id}>
          {(index === 0 || calendarDayKey(messages[index - 1].createdAt) !== calendarDayKey(message.createdAt)) && <div className="day-separator"><span>{daySeparatorLabel(message.createdAt)}</span></div>}
          <MessageCard message={message} mine={message.sender?.id === user?.id} viewerId={user?.id || ""} onPhotoOpen={setPhoto} onReply={beginReply} onReplyOpen={openReplyTarget} onToggleReaction={(messageId, emoji) => void toggleReaction(messageId, emoji)} />
        </Fragment>)}
        {typing && <div className="typing-indicator"><i /><i /><i /><span>{typing}</span></div>}
        <div />
      </div>

      <div className="composer-shell">
        {replyingTo && <div className="composer-reply"><div><strong>Replying to {replyingTo.sender?.displayName || "message"}</strong><span>{replyPreviewText(replyingTo)}</span></div><button type="button" onClick={() => setReplyingTo(null)} aria-label="Cancel reply"><X /></button></div>}
        {chatError && <div className="chat-error">{chatError}<button type="button" onClick={() => setChatError("")}>×</button></div>}
        <form className="composer" onSubmit={sendText}>
          <AudioRecorder onReady={(blob) => void upload(new File([blob], `voice-${Date.now()}.webm`, { type: blob.type }), "AUDIO")} />
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, "PHOTO"); event.currentTarget.value = ""; }} />
          <button type="button" className="icon-button" onClick={() => fileRef.current?.click()} aria-label="Send photo"><Image /></button>
          <input ref={textRef} value={text} onChange={(event) => updateText(event.target.value)} placeholder={`Message ${selected.title}`} maxLength={4000} />
          <button className="send-button" disabled={!text.trim() || uploading} aria-label="Send message"><Send /></button>
        </form>
      </div>
    </section> : <section className="no-conversation"><MessageCircle /><h2>Choose a conversation</h2><p>Your group chats and direct messages share one realtime connection.</p></section>}

    {photo && <div className="photo-preview" onClick={() => setPhoto("")}><button>×</button><img src={photo} alt="Shared photo preview" /></div>}
  </main>;
}

function ConversationRow({ item, selected, onClick }: { item: ConversationSummary; selected: boolean; onClick(): void }) {
  return <button className={selected ? "conversation-row active" : "conversation-row"} onClick={onClick}>
    <span className="avatar">{item.title[0]?.toUpperCase()}</span>
    <span><strong>{item.title}</strong><small>{item.lastMessage?.type === "TEXT" ? item.lastMessage.text : item.lastMessage ? `${item.lastMessage.type.toLowerCase()} message` : "No messages yet"}</small></span>
    <span className="conversation-meta">{item.lastMessage && <time>{new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>}{item.unreadCount > 0 && <b>{Math.min(item.unreadCount, 99)}</b>}</span>
  </button>;
}
