export type Id = string;
export type GroupRole = "OWNER" | "ADMIN" | "MEMBER";
export type GroupJoinMode = "OPEN" | "APPROVAL_REQUIRED" | "INVITE_ONLY";
export type ConversationType = "DIRECT" | "GROUP";
export type MessageType = "TEXT" | "AUDIO" | "PHOTO" | "SPOT" | "LOCATION" | "MEETING" | "VIDEO" | "FILE" | "SYSTEM";
export type LocationState = "LIVE" | "FROZEN" | "HIDDEN" | "OFFLINE";
export type MapAvatarType = "DEFAULT" | "EMOJI" | "PHOTO" | "GIF" | "VIDEO";
export type SpotVisibility = "PUBLIC" | "PRIVATE";
export type TravelMode = "WALKING" | "DRIVING";

export interface SessionUser {
  id: Id;
  username: string | null;
  displayName: string | null;
  primaryEmail: string;
  profileAvatarPath: string | null;
  onboardingCompleted: boolean;
}

export interface Coordinates { latitude: number; longitude: number; accuracy?: number; }

export interface UserSummary {
  id: Id;
  username: string;
  displayName: string;
  profileAvatarPath: string | null;
  lastSeenAt: string;
  locationState?: LocationState;
  location?: Coordinates | null;
  mapAvatar?: { type: MapAvatarType; value: string | null } | null;
  status?: { text: string; emoji: string | null; expiresAt: string } | null;
}

export interface GroupSummary {
  id: Id;
  name: string;
  description: string | null;
  avatarPath: string | null;
  inviteCode: string;
  joinMode: GroupJoinMode;
  role: GroupRole;
  primaryConversationId: string | null;
  memberCount: number;
}

export interface ConversationSummary {
  id: Id;
  type: ConversationType;
  title: string;
  groupId: string | null;
  participants: UserSummary[];
  lastMessage: MessageView | null;
  unreadCount: number;
}

export interface AttachmentView {
  id: Id;
  mediaType: string;
  originalName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  duration: number | null;
}

export interface MessageView {
  id: Id;
  conversationId: Id;
  sender: UserSummary | null;
  type: MessageType;
  text: string | null;
  payload: Record<string, unknown> | null;
  attachments: AttachmentView[];
  createdAt: string;
  spotAvailable?: boolean;
}

export interface SpotView {
  id: Id;
  ownerId: Id;
  owner: UserSummary;
  title: string;
  description: string;
  visibility: SpotVisibility;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface RoutePreview {
  geometry: { type: "LineString"; coordinates: number[][] };
  distanceMeters: number;
  durationSeconds: number;
  mode: TravelMode;
  destinationSnapshot: Coordinates;
}
