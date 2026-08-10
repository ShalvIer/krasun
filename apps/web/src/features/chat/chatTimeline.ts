import type { MessageReplyPreview, MessageType } from "@krasun/shared-types";

export function calendarDayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function daySeparatorLabel(value: string | Date, now = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.round((start.getTime() - target.getTime()) / 86_400_000);
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "long", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

const typeLabels: Record<MessageType, string> = {
  TEXT: "Message",
  AUDIO: "Voice message",
  PHOTO: "Photo",
  SPOT: "Shared spot",
  LOCATION: "Location",
  MEETING: "Meeting point",
  VIDEO: "Video",
  FILE: "File",
  SYSTEM: "System message"
};

export function replyPreviewText(message: Pick<MessageReplyPreview, "type" | "text">) {
  if (message.type === "TEXT" || message.type === "SYSTEM") return message.text?.trim() || typeLabels[message.type];
  return typeLabels[message.type];
}
