-- Codio (CodeNest) Database Schema Migration
-- Migration: 20261024000001_initial_schema.sql
-- Description: Core tables, constraints, functions, and Row-Level Security (RLS) policies.

-- Enable pgcrypto for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. PROFILES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Auto-create profile trigger on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Coder'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 2. ROOMS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id TEXT NOT NULL UNIQUE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Room',
  visibility TEXT NOT NULL DEFAULT 'unlisted' CHECK (visibility IN ('public', 'unlisted', 'private')),
  default_access_mode TEXT NOT NULL DEFAULT 'editor' CHECK (default_access_mode IN ('editor', 'viewer')),
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rooms_public_id ON public.rooms(public_id);
CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON public.rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_visibility ON public.rooms(visibility);

-- ====================================================================
-- 3. ROOM MEMBERS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_members_room ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON public.room_members(user_id);

-- ====================================================================
-- 4. DOCUMENTS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL DEFAULT 'main',
  language TEXT NOT NULL DEFAULT 'typescript',
  content_snapshot TEXT DEFAULT '',
  yjs_state BYTEA,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(room_id, file_name)
);

CREATE INDEX IF NOT EXISTS idx_documents_room_id ON public.documents(room_id);

-- ====================================================================
-- 5. ROOM INVITATIONS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.room_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  permission TEXT NOT NULL DEFAULT 'editor' CHECK (permission IN ('editor', 'viewer')),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_room_invitations_token ON public.room_invitations(token_hash);

-- ====================================================================
-- 6. ROOM EVENTS TABLE (Audit / Lifecycle)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.room_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_room_events_room_id ON public.room_events(room_id);

-- ====================================================================
-- HELPER FUNCTIONS FOR SECURITY AND PERMISSION EVALUATION
-- ====================================================================

-- Check if a room is active (not closed and not expired)
CREATE OR REPLACE FUNCTION public.is_room_active(r public.rooms)
RETURNS BOOLEAN AS $$
BEGIN
  IF r.is_closed THEN
    RETURN false;
  END IF;
  IF r.expires_at IS NOT NULL AND r.expires_at <= timezone('utc'::text, now()) THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user is room owner
CREATE OR REPLACE FUNCTION public.is_room_owner(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.rooms
    WHERE id = p_room_id AND owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id AND user_id = p_user_id AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user is a member of the room (SECURITY DEFINER prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user has edit permission in room
CREATE OR REPLACE FUNCTION public.can_edit_room(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_room public.rooms;
  v_role TEXT;
BEGIN
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
  IF NOT FOUND OR NOT public.is_room_active(v_room) THEN
    RETURN false;
  END IF;

  -- Owner always has edit permission
  IF p_user_id IS NOT NULL AND v_room.owner_id = p_user_id THEN
    RETURN true;
  END IF;

  -- Check explicit member role
  IF p_user_id IS NOT NULL THEN
    SELECT role INTO v_role FROM public.room_members WHERE room_id = p_room_id AND user_id = p_user_id;
    IF FOUND THEN
      RETURN v_role IN ('owner', 'editor');
    END IF;
  END IF;

  -- If room is private, non-members cannot edit
  IF v_room.visibility = 'private' THEN
    RETURN false;
  END IF;

  -- For public/unlisted rooms, use default access mode
  RETURN v_room.default_access_mode = 'editor';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_events ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- PROFILES POLICIES
-- --------------------------------------------------------------------
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- --------------------------------------------------------------------
-- ROOMS POLICIES
-- --------------------------------------------------------------------
CREATE POLICY "Select active public or unlisted rooms, or private if member"
  ON public.rooms FOR SELECT
  USING (
    (
      (visibility IN ('public', 'unlisted'))
      AND (is_closed = false)
      AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now()))
    )
    OR
    (
      auth.uid() IS NOT NULL AND (
        owner_id = auth.uid() OR
        public.is_room_member(rooms.id, auth.uid())
      )
    )
  );

CREATE POLICY "Anyone can create a room"
  ON public.rooms FOR INSERT
  WITH CHECK (
    -- If owner_id is specified, must match authenticated user
    (owner_id IS NULL OR owner_id = auth.uid())
  );

CREATE POLICY "Room owner can update room"
  ON public.rooms FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.room_members
        WHERE room_members.room_id = rooms.id AND room_members.user_id = auth.uid() AND room_members.role = 'owner'
      )
    )
  );

CREATE POLICY "Room owner can delete room"
  ON public.rooms FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.room_members
        WHERE room_members.room_id = rooms.id AND room_members.user_id = auth.uid() AND room_members.role = 'owner'
      )
    )
  );

-- --------------------------------------------------------------------
-- DOCUMENTS POLICIES
-- --------------------------------------------------------------------
CREATE POLICY "Documents viewable if room is accessible"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = documents.room_id
      AND (
        (r.visibility IN ('public', 'unlisted') AND r.is_closed = false AND (r.expires_at IS NULL OR r.expires_at > timezone('utc'::text, now())))
        OR (auth.uid() IS NOT NULL AND (r.owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.room_members m WHERE m.room_id = r.id AND m.user_id = auth.uid()
        )))
      )
    )
  );

CREATE POLICY "Documents can be created if user can edit room"
  ON public.documents FOR INSERT
  WITH CHECK (
    public.can_edit_room(documents.room_id, auth.uid())
  );

CREATE POLICY "Documents can be updated if user can edit room"
  ON public.documents FOR UPDATE
  USING (
    public.can_edit_room(documents.room_id, auth.uid())
  );

CREATE POLICY "Documents can be deleted by room owner"
  ON public.documents FOR DELETE
  USING (
    public.is_room_owner(documents.room_id, auth.uid())
  );

-- --------------------------------------------------------------------
-- ROOM MEMBERS POLICIES
-- --------------------------------------------------------------------
CREATE POLICY "Members viewable by room participants"
  ON public.room_members FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    public.is_room_owner(room_members.room_id, auth.uid())
  );

CREATE POLICY "Only room owner can add/modify members"
  ON public.room_members FOR ALL
  USING (
    public.is_room_owner(room_members.room_id, auth.uid())
  );

-- --------------------------------------------------------------------
-- ROOM INVITATIONS POLICIES
-- --------------------------------------------------------------------
CREATE POLICY "Owner can manage room invitations"
  ON public.room_invitations FOR ALL
  USING (
    public.is_room_owner(room_invitations.room_id, auth.uid())
  );

-- --------------------------------------------------------------------
-- ROOM EVENTS POLICIES
-- --------------------------------------------------------------------
CREATE POLICY "Room events viewable by members and owner"
  ON public.room_events FOR SELECT
  USING (
    public.is_room_owner(room_events.room_id, auth.uid())
  );

CREATE POLICY "Allow system or active participants to record room events"
  ON public.room_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms r WHERE r.id = room_events.room_id
    )
  );
