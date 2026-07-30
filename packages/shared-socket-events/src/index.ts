import type { Coordinates, MessageView, SpotView, UserSummary } from "@krasun/shared-types";

export interface ServerToClientEvents {
  "presence:online": (user: UserSummary) => void;
  "presence:offline": (payload: { userId: string; lastSeenAt: string }) => void;
  "group:member-updated": (payload: { groupId: string }) => void;
  "chat:message-created": (message: MessageView) => void;
  "chat:typing-updated": (payload: { conversationId: string; userId: string; displayName: string; typing: boolean }) => void;
  "map:location-updated": (payload: { userId: string; state: "LIVE" | "FROZEN" | "HIDDEN" | "OFFLINE"; coordinates: Coordinates | null; updatedAt: string }) => void;
  "map:avatar-updated": (payload: { userId: string; type: string; value: string | null }) => void;
  "spot:created": (spot: SpotView) => void;
  "spot:updated": (spot: SpotView) => void;
  "spot:deleted": (payload: { id: string; ownerId: string }) => void;
  "server:error": (payload: { message: string; code?: string }) => void;
}

export interface ClientToServerEvents {
  "group:join": (payload: { groupId: string }) => void;
  "group:leave": (payload: { groupId: string }) => void;
  "chat:join": (payload: { conversationId: string }) => void;
  "chat:leave": (payload: { conversationId: string }) => void;
  "chat:message-send": (payload: { conversationId: string; text: string }) => void;
  "chat:typing-start": (payload: { conversationId: string }) => void;
  "chat:typing-stop": (payload: { conversationId: string }) => void;
  "map:location-update": (payload: Coordinates & { timestamp?: number }) => void;
  "map:location-freeze": () => void;
  "map:location-hide": () => void;
  "map:avatar-update": (payload: { type: "DEFAULT" | "EMOJI" | "PHOTO" | "GIF" | "VIDEO"; value?: string | null }) => void;
  "spot:create": (payload: { title: string; description: string; visibility: "PUBLIC" | "PRIVATE"; latitude: number; longitude: number }) => void;
  "spot:update": (payload: { id: string; title?: string; description?: string; visibility?: "PUBLIC" | "PRIVATE" }) => void;
  "spot:delete": (payload: { id: string }) => void;
}

export interface SocketData { userId: string; locationSharing: boolean; }
