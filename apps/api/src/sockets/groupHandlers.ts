import type { KrasunServer, KrasunSocket } from "./helpers.js";
import { requireMembership } from "../groups/service.js";

export function registerGroupHandlers(_io: KrasunServer, socket: KrasunSocket) {
  socket.on("group:join", ({ groupId }) => { void requireMembership(socket.data.userId, groupId).then(() => socket.join(`group:${groupId}`)).catch(() => socket.emit("server:error", { message: "Group access denied", code: "GROUP_FORBIDDEN" })); });
  socket.on("group:leave", ({ groupId }) => socket.leave(`group:${groupId}`));
}
