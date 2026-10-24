-- Codio (CodeNest) RLS Policies & Access Control Verification
-- File: supabase/tests/rls_policies.test.sql

BEGIN;

-- Test setup: create test users in auth.users
INSERT INTO auth.users (id, email)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'owner@codio.dev'),
  ('22222222-2222-2222-2222-222222222222', 'editor@codio.dev'),
  ('33333333-3333-3333-3333-333333333333', 'viewer@codio.dev'),
  ('44444444-4444-4444-4444-444444444444', 'stranger@codio.dev')
ON CONFLICT (id) DO NOTHING;

-- Create test rooms:
-- 1. Public active room
INSERT INTO public.rooms (id, public_id, owner_id, title, visibility, default_access_mode)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pub-room-1', '11111111-1111-1111-1111-111111111111', 'Public Active Room', 'public', 'editor');

-- 2. Private room
INSERT INTO public.rooms (id, public_id, owner_id, title, visibility, default_access_mode)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'priv-room-1', '11111111-1111-1111-1111-111111111111', 'Private Room', 'private', 'viewer');

-- Add members to private room
INSERT INTO public.room_members (room_id, user_id, role)
VALUES 
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'editor'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'viewer');

-- 3. Expired room
INSERT INTO public.rooms (id, public_id, owner_id, title, visibility, expires_at)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'exp-room-1', '11111111-1111-1111-1111-111111111111', 'Expired Room', 'public', now() - interval '1 hour');

-- 4. Closed room
INSERT INTO public.rooms (id, public_id, owner_id, title, visibility, is_closed, closed_at)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'closed-room-1', '11111111-1111-1111-1111-111111111111', 'Closed Room', 'public', true, now());

-- Documents
INSERT INTO public.documents (id, room_id, file_name, language, content_snapshot)
VALUES 
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'main.ts', 'typescript', 'console.log("public");'),
  ('20000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'secret.ts', 'typescript', 'console.log("private");');

-- ====================================================================
-- ASSERTIONS ON HELPER FUNCTIONS
-- ====================================================================

-- 1. Owner can edit
DO $$
BEGIN
  ASSERT public.can_edit_room('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111') = true, 'Test 1 Failed: Owner should edit public room';
  ASSERT public.can_edit_room('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111') = true, 'Test 2 Failed: Owner should edit private room';
END $$;

-- 2. Member editor can edit private room
DO $$
BEGIN
  ASSERT public.can_edit_room('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222') = true, 'Test 3 Failed: Editor member should edit private room';
END $$;

-- 3. Member viewer CANNOT edit private room
DO $$
BEGIN
  ASSERT public.can_edit_room('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333') = false, 'Test 4 Failed: Viewer member must not edit private room';
END $$;

-- 4. Stranger CANNOT edit private room
DO $$
BEGIN
  ASSERT public.can_edit_room('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444') = false, 'Test 5 Failed: Non-member must not edit private room';
  ASSERT public.can_edit_room('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL) = false, 'Test 6 Failed: Anon must not edit private room';
END $$;

-- 5. Expired or closed rooms reject editing for all
DO $$
BEGIN
  ASSERT public.can_edit_room('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111') = false, 'Test 7 Failed: Expired room must reject edit';
  ASSERT public.can_edit_room('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111') = false, 'Test 8 Failed: Closed room must reject edit';
END $$;

ROLLBACK;
