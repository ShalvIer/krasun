import type { MessageType } from "@prisma/client";

export const MESSAGE_EMAIL_PREFERENCE_KEY = "notifications.email.messages";

export function messageEmailPreferenceEnabled(value: unknown) {
  return value === true;
}

export function messageEmailPreview(type: MessageType, text: string | null) {
  if (type === "TEXT") return (text || "Новое сообщение").slice(0, 180);
  const labels: Partial<Record<MessageType, string>> = {
    AUDIO: "Аудиосообщение",
    PHOTO: "Фото",
    VIDEO: "Видео",
    FILE: "Файл",
    SPOT: "Новая точка на карте",
    LOCATION: "Геолокация",
    MEETING: "Обновление встречи",
    SYSTEM: "Обновление чата"
  };
  return labels[type] ?? "Новое сообщение";
}

export function messageEmailSubject(input: { conversationType: "DIRECT" | "GROUP"; groupName?: string | null; senderName: string }) {
  return input.conversationType === "GROUP"
    ? `Новое сообщение в группе ${input.groupName || "Krasun"}`
    : `Новое сообщение от ${input.senderName}`;
}

export function inactiveRecipientIds(recipientIds: string[], activeUserIds: ReadonlySet<string>) {
  return recipientIds.filter((userId) => !activeUserIds.has(userId));
}
