-- ─────────────────────────────────────────────────────────────────────────────
-- friendships table + RPCs
-- Run this in Supabase Dashboard > SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Table
CREATE TABLE IF NOT EXISTS public.friendships (
  id            uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id  uuid      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        text      NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id),
  UNIQUE (requester_id, addressee_id)
);

-- 2. RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friendships_select" ON public.friendships;
CREATE POLICY "friendships_select" ON public.friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "friendships_insert" ON public.friendships;
CREATE POLICY "friendships_insert" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "friendships_update" ON public.friendships;
CREATE POLICY "friendships_update" ON public.friendships
  FOR UPDATE USING (auth.uid() = addressee_id OR auth.uid() = requester_id);

-- 3. RPC: search users by email (SECURITY DEFINER to read auth.users)
CREATE OR REPLACE FUNCTION public.search_users_by_email(search_email text)
RETURNS TABLE (
  user_id        uuid,
  email          text,
  total_xp       bigint,
  max_streak     integer,
  cases_completed bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    COALESCE(SUM(s.xp), 0)::bigint,
    COALESCE(MAX(s.current_streak), 0)::integer,
    COALESCE(SUM(s.cases_completed), 0)::bigint
  FROM auth.users u
  LEFT JOIN public.user_module_stats s ON s.user_id = u.id
  WHERE u.email ILIKE '%' || search_email || '%'
    AND u.id != auth.uid()
  GROUP BY u.id, u.email
  LIMIT 10;
END;
$$;

-- 4. RPC: get friends with their aggregate stats
CREATE OR REPLACE FUNCTION public.get_friends_with_stats(p_user_id uuid)
RETURNS TABLE (
  friendship_id   uuid,
  friend_id       uuid,
  email           text,
  status          text,
  is_requester    boolean,
  total_xp        bigint,
  max_streak      integer,
  cases_completed bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END,
    u.email::text,
    f.status,
    (f.requester_id = p_user_id),
    COALESCE(SUM(s.xp), 0)::bigint,
    COALESCE(MAX(s.current_streak), 0)::integer,
    COALESCE(SUM(s.cases_completed), 0)::bigint
  FROM public.friendships f
  JOIN auth.users u
    ON u.id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
  LEFT JOIN public.user_module_stats s
    ON s.user_id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
  WHERE f.requester_id = p_user_id OR f.addressee_id = p_user_id
  GROUP BY f.id, f.requester_id, f.addressee_id, f.status, u.email;
END;
$$;
