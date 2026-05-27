-- =============================================================================
-- MEDIQ — user_progress schema fix
-- Run in Supabase Dashboard → SQL Editor → Run
-- =============================================================================

-- Add all columns that saveQuizAnswer expects (safe, idempotent)
ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS case_id            uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS answered_correctly boolean,
  ADD COLUMN IF NOT EXISTS answer_given       text,
  ADD COLUMN IF NOT EXISTS time_ms            integer,
  ADD COLUMN IF NOT EXISTS attempts           integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ease_factor        float8  NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS interval_days      integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS next_review_at     timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at         timestamptz NOT NULL DEFAULT now();

-- Ensure the upsert conflict key exists
CREATE UNIQUE INDEX IF NOT EXISTS user_progress_user_quiz_idx
  ON public.user_progress (user_id, quiz_id);

-- Ensure RLS allows users to read/write their own rows
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "up_select" ON public.user_progress;
CREATE POLICY "up_select" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "up_insert" ON public.user_progress;
CREATE POLICY "up_insert" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "up_update" ON public.user_progress;
CREATE POLICY "up_update" ON public.user_progress
  FOR UPDATE USING (auth.uid() = user_id);
