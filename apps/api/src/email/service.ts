import { Prisma, type MessageType } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import type { KrasunServer } from "../sockets/helpers.js";
import { inactiveRecipientIds, messageEmailPreferenceEnabled, messageEmailPreview, messageEmailSubject, MESSAGE_EMAIL_PREFERENCE_KEY } from "./policy.js";

export const messageEmailConfigured = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);

interface MessageEmailInput {
  io?: KrasunServer;
  messageId: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  text: string | null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function activeConversationUserIds(io: KrasunServer | undefined, conversationId: string) {
  if (!io) return new Set<string>();
  const sockets = await io.in(`conversation:${conversationId}`).fetchSockets();
  return new Set(sockets.map((socket) => socket.data.userId));
}

async function reserveNotification(messageId: string, recipientId: string) {
  try {
    return await prisma.messageEmailNotification.create({ data: { messageId, recipientId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null;
    throw error;
  }
}

async function sendWithResend(input: { recipient: string; subject: string; preview: string; senderName: string; chatUrl: string; settingsUrl: string; idempotencyKey: string }) {
  const safeSender = escapeHtml(input.senderName);
  const safePreview = escapeHtml(input.preview);
  const safeChatUrl = escapeHtml(input.chatUrl);
  const safeSettingsUrl = escapeHtml(input.settingsUrl);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
      "User-Agent": "krasun/1.0"
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.recipient],
      subject: input.subject,
      text: `${input.senderName}: ${input.preview}\n\nОткрыть чат: ${input.chatUrl}\nНастройки уведомлений: ${input.settingsUrl}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h2 style="margin-bottom:8px">Новое сообщение в Krasun</h2><p style="color:#5d6675;margin-top:0">От ${safeSender}</p><div style="padding:16px 18px;border-radius:14px;background:#f3f6fa;font-size:16px;line-height:1.5">${safePreview}</div><p style="margin:24px 0"><a href="${safeChatUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2f81f7;color:#fff;text-decoration:none;font-weight:700">Открыть чат</a></p><p style="font-size:12px;color:#7a8493">Письмо отправлено, потому что вы включили email-уведомления и не находились в этом чате. <a href="${safeSettingsUrl}">Изменить настройки</a>.</p></div>`,
      headers: { "List-Unsubscribe": `<${input.settingsUrl}>` }
    })
  });

  const body = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok) throw new Error(`Resend ${response.status}: ${body.message || "delivery failed"}`);
  return body.id ?? null;
}

export async function sendMessageEmailNotifications(input: MessageEmailInput) {
  if (!messageEmailConfigured) return;

  const [conversation, sender, activeUserIds] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id: input.conversationId },
      include: {
        group: { select: { name: true } },
        participants: {
          where: { userId: { not: input.senderId } },
          include: {
            user: {
              select: {
                id: true,
                primaryEmail: true,
                alternateEmail: true,
                alternateEmailVerifiedAt: true,
                preferences: { where: { key: MESSAGE_EMAIL_PREFERENCE_KEY }, select: { value: true } }
              }
            }
          }
        }
      }
    }),
    prisma.user.findUnique({ where: { id: input.senderId }, select: { displayName: true, username: true } }),
    activeConversationUserIds(input.io, input.conversationId)
  ]);
  if (!conversation || !sender) return;

  const optedIn = conversation.participants.filter(({ user }) => messageEmailPreferenceEnabled(user.preferences[0]?.value));
  const inactiveIds = new Set(inactiveRecipientIds(optedIn.map(({ userId }) => userId), activeUserIds));
  const senderName = sender.displayName || sender.username || "Krasun";
  const subject = messageEmailSubject({ conversationType: conversation.type, groupName: conversation.group?.name, senderName });
  const preview = messageEmailPreview(input.type, input.text);
  const relativeChatUrl = conversation.type === "GROUP" && conversation.groupId
    ? `/groups/${conversation.groupId}/chat`
    : `/chat/direct/${conversation.id}`;
  const chatUrl = new URL(relativeChatUrl, env.WEB_URL).toString();
  const settingsUrl = new URL("/settings#email-notifications", env.WEB_URL).toString();

  for (const participant of optedIn) {
    const { user } = participant;
    if (!inactiveIds.has(user.id)) continue;
    const notification = await reserveNotification(input.messageId, user.id);
    if (!notification) continue;
    const recipient = user.alternateEmailVerifiedAt && user.alternateEmail ? user.alternateEmail : user.primaryEmail;

    try {
      const providerMessageId = await sendWithResend({
        recipient,
        subject,
        preview,
        senderName,
        chatUrl,
        settingsUrl,
        idempotencyKey: `message/${input.messageId}/recipient/${user.id}`
      });
      await prisma.messageEmailNotification.update({
        where: { id: notification.id },
        data: { status: "SENT", providerMessageId, sentAt: new Date(), lastError: null }
      });
    } catch (error) {
      const lastError = (error instanceof Error ? error.message : "Email delivery failed").slice(0, 1000);
      await prisma.messageEmailNotification.update({ where: { id: notification.id }, data: { status: "FAILED", lastError } });
      console.warn("Message email delivery failed", { notificationId: notification.id, recipientId: user.id });
    }
  }
}

export function queueMessageEmailNotifications(input: MessageEmailInput) {
  void sendMessageEmailNotifications(input).catch(() => {
    console.warn("Message email notification task failed", { messageId: input.messageId, conversationId: input.conversationId });
  });
}
