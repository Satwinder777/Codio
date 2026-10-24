-- Fix infinite recursion in RLS policies for rooms and room_members
-- Migration: 20261024000002_fix_rls_recursion.sql

-- 1. Helper function with SECURITY DEFINER to bypass RLS recursion
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

-- 2. Recreate room_members SELECT policy without self-referential subquery
DROP POLICY IF EXISTS "Members viewable by room participants" ON public.room_members;
CREATE POLICY "Members viewable by room participants"
  ON public.room_members FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    public.is_room_owner(room_members.room_id, auth.uid())
  );

-- 3. Recreate rooms SELECT policy using is_room_member
DROP POLICY IF EXISTS "Select active public or unlisted rooms, or private if member" ON public.rooms;
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
