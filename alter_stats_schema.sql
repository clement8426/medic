-- ─────────────────────────────────────────────────────────────────────────────
-- Ensure user_module_stats has all required columns
-- Safe to run multiple times (IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_module_stats
  ADD COLUMN IF NOT EXISTS xp               integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level            integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_streak   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS correct_rate     float8  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_quizzes_answered integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cases_completed  integer NOT NULL DEFAULT 0;

-- RLS: allow users to read and write their own rows
ALTER TABLE public.user_module_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ums_select" ON public.user_module_stats;
CREATE POLICY "ums_select" ON public.user_module_stats
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ums_insert" ON public.user_module_stats;
CREATE POLICY "ums_insert" ON public.user_module_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ums_update" ON public.user_module_stats;
CREATE POLICY "ums_update" ON public.user_module_stats
  FOR UPDATE USING (auth.uid() = user_id);
