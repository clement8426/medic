-- ─────────────────────────────────────────────────────────────────────────────
-- user_feedback — retours généraux utilisateurs (toutes pages)
-- Run in Supabase Dashboard > SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_feedback (
  id          uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid      REFERENCES auth.users(id) ON DELETE SET NULL,
  page_url    text,
  type        text      NOT NULL DEFAULT 'other'
              CHECK (type IN ('bug', 'suggestion', 'content', 'other')),
  message     text      NOT NULL,
  platform    text      NOT NULL DEFAULT 'web'
              CHECK (platform IN ('web', 'mobile')),
  status      text      NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
  admin_note  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_insert" ON public.user_feedback;
CREATE POLICY "feedback_insert" ON public.user_feedback
  FOR INSERT WITH CHECK (auth.uid() = reporter_id OR reporter_id IS NULL);

DROP POLICY IF EXISTS "feedback_select" ON public.user_feedback;
CREATE POLICY "feedback_select" ON public.user_feedback
  FOR SELECT USING (
    auth.uid() = reporter_id OR
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "feedback_update" ON public.user_feedback;
CREATE POLICY "feedback_update" ON public.user_feedback
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- RPC: admin — get all feedback with reporter email
CREATE OR REPLACE FUNCTION public.get_admin_feedback()
RETURNS TABLE (
  id             uuid,
  reporter_id    uuid,
  reporter_email text,
  page_url       text,
  type           text,
  message        text,
  platform       text,
  status         text,
  admin_note     text,
  created_at     timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.reporter_id,
    u.email::text,
    f.page_url,
    f.type,
    f.message,
    f.platform,
    f.status,
    f.admin_note,
    f.created_at
  FROM user_feedback f
  LEFT JOIN auth.users u ON u.id = f.reporter_id
  ORDER BY
    CASE f.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
    f.created_at DESC;
END;
$$;
