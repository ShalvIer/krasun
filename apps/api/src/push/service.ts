import webPush from "web-push";
import type { MessageType } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { messagePushBody } from "./policy.js";

export const pushEnabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (pushEnabled) {
  webPush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}

export async function sendMessagePush(input: { conversationId: string; senderId: string; type: MessageType; text: string | null }) {
  if (!pushEnabled) return;
  const conversation = await prisma.conversation.findUnique({
    where: { id: input.conversationId },
    include: {
      group: { select: { name: true } },
      participants: {
        where: { userId: { not: input.senderId } },
        include: { user: { include: { pushSubscriptions: true } } }
      }
    }
  });
  const sender = await prisma.user.findUnique({ where: { id: input.senderId }, select: { displayName: true, username: true } });
  if (!conversation || !sender) return;

  const senderName = sender.displayName || sender.username || "Krasun";
  const title = conversation.type === "GROUP" ? `${senderName} · ${conversation.group?.name || "Group"}` : senderName;
  const url = conversation.type === "GROUP" && conversation.groupId
    ? `/groups/${conversation.groupId}/chat`
    : `/chat/direct/${conversation.id}`;
  const payload = JSON.stringify({
    title,
    body: messagePushBody(input.type, input.text),
    url,
    tag: `conversation:${conversation.id}`
  });

  const subscriptions = conversation.participants.flatMap((participant) => participant.user.pushSubscriptions);
  await Promise.allSettled(subscriptions.map(async (subscription) => {
    try {
      await webPush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth }
      }, payload, { TTL: 60 * 60 * 24, urgency: "high" });
      await prisma.pushSubscription.update({ where: { id: subscription.id }, data: { lastSuccessAt: new Date() } });
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
        return;
      }
      console.warn("Web Push delivery failed", { subscriptionId: subscription.id, statusCode });
    }
  }));
}
