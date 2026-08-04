import type { MessageType } from "@prisma/client";

export function messagePushBody(type: MessageType, text: string | null) {
  if (type === "TEXT") return (text || "New message").slice(0, 180);
  const labels: Partial<Record<MessageType, string>> = {
    AUDIO: "Voice message",
    PHOTO: "Photo",
    VIDEO: "Video",
    FILE: "File",
    SPOT: "Shared a spot",
    LOCATION: "Shared a location",
    MEETING: "Meeting update",
    SYSTEM: "Conversation update"
  };
  return labels[type] ?? "New message";
}
