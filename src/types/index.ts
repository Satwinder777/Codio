// Codio (CodeNest) Domain Types

export type RoomVisibility = 'public' | 'unlisted' | 'private';
export type RoomAccessMode = 'editor' | 'viewer';
export type MemberRole = 'owner' | 'editor' | 'viewer';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  public_id: string;
  owner_id: string | null;
  title: string;
  visibility: RoomVisibility;
  default_access_mode: RoomAccessMode;
  is_closed: boolean;
  closed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentSnapshot {
  id: string;
  room_id: string;
  file_name: string;
  language: string;
  content_snapshot: string;
  yjs_state?: string | null; // Base64 encoded uint8array if saved
  revision: number;
  created_at: string;
  updated_at: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
  profile?: Profile;
}

export interface RoomDetails {
  room: Room;
  document: DocumentSnapshot;
  role: MemberRole;
  isOwner: boolean;
  canEdit: boolean;
  members?: RoomMember[];
}

export interface CollaboratorUser {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  cursor?: {
    lineNumber: number;
    column: number;
  };
}

export interface PeerPresence {
  clientId: string;
  user: CollaboratorUser;
  lastActive: number;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'offline';
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface SupportedLanguage {
  id: string;
  name: string;
  extension: string;
  monacoId: string;
  sampleCode: string;
}
