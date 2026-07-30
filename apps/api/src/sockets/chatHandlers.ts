import { textMessageSchema } from "@krasun/shared-validation";
import type { KrasunServer, KrasunSocket } from "./helpers.js";
import { messageInclude, requireConversationAccess, serializeMessage } from "../conversations/service.js";
import { prisma } from "../lib/prisma.js";

const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function registerChatHandlers(io: KrasunServer, socket: KrasunSocket) {
  const userId = socket.data.userId;
  socket.on("chat:join", ({ conversationId }) => { void requireConversationAccess(userId, conversationId).then(() => socket.join(`conversation:${conversationId}`)).catch(() => socket.emit("server:error", { message: "Conversation access denied", code: "CONVERSATION_FORBIDDEN" })); });
  socket.on("chat:leave", ({ conversationId }) => socket.leave(`conversation:${conversationId}`));
  socket.on("chat:message-send", (raw) => {
    void (async () => {
      const input = textMessageSchema.parse(raw);
      await requireConversationAccess(userId, input.conversationId);
      const row = await prisma.message.create({ data: { conversationId: input.conversationId, senderId: userId, type: "TEXT", text: input.text }, include: messageInclude });
      await prisma.conversation.update({ where: { id: input.conversationId }, data: { updatedAt: new Date() } });
      io.to(`conversation:${input.conversationId}`).emit("chat:message-created", await serializeMessage(row));
    })().catch((error: unknown) => socket.emit("server:error", { message: error instanceof Error ? error.message : "Message failed" }));
  });

  const setTyping = async (conversationId: string, typing: boolean) => {
    await requireConversationAccess(userId, conversationId);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    socket.to(`conversation:${conversationId}`).emit("chat:typing-updated", { conversationId, userId, displayName: user.displayName ?? user.username ?? "Someone", typing });
  };
  socket.on("chat:typing-start", ({ conversationId }) => {
    void setTyping(conversationId, true).catch(() => undefined);
    const key = `${socket.id}:${conversationId}`;
    const previous = typingTimers.get(key); if (previous) clearTimeout(previous);
    typingTimers.set(key, setTimeout(() => { void setTyping(conversationId, false); typingTimers.delete(key); }, 2500));
  });
  socket.on("chat:typing-stop", ({ conversationId }) => { void setTyping(conversationId, false); });
}
