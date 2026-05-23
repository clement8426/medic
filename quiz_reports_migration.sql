-- ─────────────────────────────────────────────────────────────────────────────
-- Quiz reports (signalements) + admin users
-- Run in Supabase Dashboard > SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Admin users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;
CREATE POLICY "admin_users_select" ON public.admin_users
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- 2. Quiz reports table
CREATE TABLE IF NOT EXISTS public.quiz_reports (
  id          uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id     uuid      NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  quiz_id     uuid      REFERENCES public.quizzes(id) ON DELETE SET NULL,
  reason      text      NOT NULL CHECK (reason IN (
                'wrong_answer', 'bad_translation', 'unclear_question',
                'wrong_options', 'wrong_difficulty', 'other'
              )),
  details     text,
  status      text      NOT NULL DEFAULT 'open' CHECK (status IN (
                'open', 'in_progress', 'resolved', 'dismissed'
              )),
  admin_note  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert" ON public.quiz_reports;
CREATE POLICY "reports_insert" ON public.quiz_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_select" ON public.quiz_reports;
CREATE POLICY "reports_select" ON public.quiz_reports
  FOR SELECT USING (
    auth.uid() = reporter_id OR
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "reports_update" ON public.quiz_reports;
CREATE POLICY "reports_update" ON public.quiz_reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- 3. RPC: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid());
$$;

-- 4. RPC: get all reports with full context (admin only)
CREATE OR REPLACE FUNCTION public.get_admin_reports()
RETURNS TABLE (
  id             uuid,
  reporter_id    uuid,
  reporter_email text,
  case_id        uuid,
  case_number    integer,
  module_name    text,
  module_slug    text,
  quiz_id        uuid,
  quiz_step      integer,
  quiz_theme     text,
  quiz_question  text,
  reason         text,
  details        text,
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
    r.id,
    r.reporter_id,
    u.email::text,
    r.case_id,
    c.case_number,
    m.name_fr::text,
    m.slug::text,
    r.quiz_id,
    q.step,
    q.theme::text,
    COALESCE(q.question_fr, q.question)::text,
    r.reason,
    r.details,
    r.status,
    r.admin_note,
    r.created_at
  FROM quiz_reports r
  LEFT JOIN auth.users  u ON u.id = r.reporter_id
  LEFT JOIN cases       c ON c.id = r.case_id
  LEFT JOIN modules     m ON m.id = c.module_id
  LEFT JOIN quizzes     q ON q.id = r.quiz_id
  ORDER BY
    CASE r.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
    r.created_at DESC;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- After running this script, add yourself as admin:
-- INSERT INTO public.admin_users (user_id)
-- VALUES ('paste-your-auth-user-id-here');
-- ─────────────────────────────────────────────────────────────────────────────
