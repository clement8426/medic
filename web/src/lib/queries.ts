import { supabase } from './supabase'
import type { Module, Case, Quiz, ModuleQuiz, UserProgress, UserModuleStats, UserSearchResult, FriendWithStats, AdminReport, ReportReason, AdminFeedback, FeedbackType, Profile } from './types'

// ── Profiles ──────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data
}

export async function upsertProfile(userId: string, profile: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    ...profile,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

// ── Modules ──────────────────────────────────────────────────────────────────

export async function getActiveModules(): Promise<Module[]> {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('active', true)
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

export async function getModuleBySlug(slug: string): Promise<Module | null> {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) return null
  return data
}

// ── Cases ─────────────────────────────────────────────────────────────────────

export async function getCasesByModule(moduleId: string): Promise<Case[]> {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('module_id', moduleId)
    .order('case_number')
  if (error) throw error
  return data ?? []
}

export async function getCaseById(id: string): Promise<Case | null> {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

// ── Module Quizzes (classic modules) ─────────────────────────────────────────

export async function getModuleQuizzes(moduleId: string): Promise<ModuleQuiz[]> {
  const { data, error } = await supabase
    .from('module_quizzes')
    .select('*')
    .eq('module_id', moduleId)
    .order('question_number')
  if (error) throw error
  return data ?? []
}

export async function getModuleQuizCounts(moduleIds: string[]): Promise<Record<string, number>> {
  if (moduleIds.length === 0) return {}
  const { data } = await supabase
    .from('module_quizzes')
    .select('module_id')
    .in('module_id', moduleIds)
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.module_id) counts[row.module_id] = (counts[row.module_id] ?? 0) + 1
  }
  return counts
}

// ── Quizzes ───────────────────────────────────────────────────────────────────

export async function getQuizzesByCase(caseId: string): Promise<Quiz[]> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('case_id', caseId)
    .order('step')
  if (error) throw error
  return data ?? []
}

// ── User progress ─────────────────────────────────────────────────────────────

export async function saveQuizAnswer(
  userId: string,
  payload: {
    case_id: string
    quiz_id: string
    answered_correctly: boolean
    answer_given: string
    time_ms: number
    next_review_at: string
    ease_factor: number
    interval_days: number
  }
): Promise<void> {
  await supabase.from('user_progress').upsert(
    {
      user_id: userId,
      ...payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,quiz_id' }
  )
}

export async function getUserProgress(userId: string, caseIds: string[]): Promise<UserProgress[]> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .in('case_id', caseIds)
  if (error) return []
  return data ?? []
}

export async function getUserModuleStats(
  userId: string,
  moduleId: string
): Promise<UserModuleStats | null> {
  const { data } = await supabase
    .from('user_module_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('module_id', moduleId)
    .single()
  return data
}

export async function getQuizProgress(
  userId: string,
  quizIds: string[]
): Promise<UserProgress[]> {
  if (quizIds.length === 0) return []
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .in('quiz_id', quizIds)
  if (error) return []
  return data ?? []
}

export async function getReviewQueue(userId: string): Promise<UserProgress[]> {
  const { data } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at')
  return data ?? []
}

export async function saveSessionStats(
  userId: string,
  moduleId: string,
  xpGained: number,
  answers: { is_correct: boolean }[]
): Promise<void> {
  const correct = answers.filter(a => a.is_correct).length
  const total = answers.length
  const now = new Date()
  const todayStr = now.toDateString()
  const yesterdayStr = new Date(now.getTime() - 86400000).toDateString()
  const nowStr = now.toISOString()

  // Streak global : vérifier la dernière activité toutes modules confondus
  const { data: latestActivity } = await supabase
    .from('user_module_stats')
    .select('last_activity_at, current_streak')
    .eq('user_id', userId)
    .not('last_activity_at', 'is', null)
    .order('last_activity_at', { ascending: false })
    .limit(1)

  const lastDay = latestActivity?.[0]?.last_activity_at
    ? new Date(latestActivity[0].last_activity_at).toDateString()
    : null
  const prevStreak = latestActivity?.[0]?.current_streak ?? 0
  const newStreak = lastDay === todayStr ? prevStreak
    : lastDay === yesterdayStr ? prevStreak + 1
    : 1

  const { data: existing } = await supabase
    .from('user_module_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('module_id', moduleId)
    .single()

  if (existing) {
    const newTotal = (existing.total_quizzes_answered ?? 0) + total
    const prevCorrect = Math.round((existing.correct_rate ?? 0) * (existing.total_quizzes_answered ?? 0))
    const newRate = newTotal > 0 ? (prevCorrect + correct) / newTotal : 0
    const newXp = (existing.xp ?? 0) + xpGained
    await supabase.from('user_module_stats').update({
      cases_completed: (existing.cases_completed ?? 0) + 1,
      total_quizzes_answered: newTotal,
      correct_rate: newRate,
      xp: newXp,
      level: Math.floor(newXp / 100) + 1,
      current_streak: newStreak,
      longest_streak: Math.max(existing.longest_streak ?? 0, newStreak),
      last_activity_at: nowStr,
    }).eq('user_id', userId).eq('module_id', moduleId)
  } else {
    const rate = total > 0 ? correct / total : 0
    await supabase.from('user_module_stats').insert({
      user_id: userId,
      module_id: moduleId,
      cases_completed: 1,
      total_quizzes_answered: total,
      correct_rate: rate,
      xp: xpGained,
      level: 1,
      current_streak: newStreak,
      longest_streak: newStreak,
      last_activity_at: nowStr,
    })
  }
}

export async function getUserAllModuleStats(userId: string): Promise<UserModuleStats[]> {
  const { data } = await supabase
    .from('user_module_stats')
    .select('*')
    .eq('user_id', userId)
  return data ?? []
}

// ── Reports ──────────────────────────────────────────────────────────────────

export async function submitReport(payload: {
  reporter_id: string
  case_id: string
  quiz_id: string | null
  reason: ReportReason
  details?: string
}): Promise<void> {
  const { error } = await supabase.from('quiz_reports').insert(payload)
  if (error) throw error
}

export async function getAdminReports(): Promise<AdminReport[]> {
  const { data, error } = await supabase.rpc('get_admin_reports')
  if (error) throw error
  return (data ?? []) as AdminReport[]
}

export async function updateReportStatus(
  id: string,
  status: string,
  admin_note?: string
): Promise<void> {
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (admin_note !== undefined) update.admin_note = admin_note
  const { error } = await supabase.from('quiz_reports').update(update).eq('id', id)
  if (error) throw error
}

export async function checkIsAdmin(): Promise<boolean> {
  const { data } = await supabase.rpc('is_admin')
  return data === true
}

// ── Friends ───────────────────────────────────────────────────────────────────

export async function searchUsersByEmail(email: string): Promise<UserSearchResult[]> {
  const { data, error } = await supabase.rpc('search_users_by_email', { search_email: email })
  if (error) throw error
  return (data ?? []) as UserSearchResult[]
}

export async function getFriendsWithStats(userId: string): Promise<FriendWithStats[]> {
  const { data, error } = await supabase.rpc('get_friends_with_stats', { p_user_id: userId })
  if (error) throw error
  return (data ?? []) as FriendWithStats[]
}

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<void> {
  const { error } = await supabase.from('friendships').insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
  })
  if (error) throw error
}

export async function respondToFriendRequest(friendshipId: string, status: 'accepted' | 'declined'): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', friendshipId)
  if (error) throw error
}

// ── User Feedback ─────────────────────────────────────────────────────────────

export async function submitFeedback(payload: {
  reporter_id: string | null
  page_url: string
  type: FeedbackType
  message: string
  platform: 'web' | 'mobile'
}): Promise<void> {
  const { error } = await supabase.from('user_feedback').insert(payload)
  if (error) throw error
}

export async function getAdminFeedback(): Promise<AdminFeedback[]> {
  const { data, error } = await supabase.rpc('get_admin_feedback')
  if (error) throw error
  return (data ?? []) as AdminFeedback[]
}

export async function updateFeedbackStatus(
  id: string,
  status: string,
  admin_note?: string
): Promise<void> {
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (admin_note !== undefined) update.admin_note = admin_note
  const { error } = await supabase.from('user_feedback').update(update).eq('id', id)
  if (error) throw error
}

export async function getCaseCountsByModule(moduleIds: string[]): Promise<Record<string, number>> {
  if (moduleIds.length === 0) return {}
  const { data } = await supabase
    .from('cases')
    .select('module_id, quizzes!inner(id)')
    .in('module_id', moduleIds)
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.module_id) counts[row.module_id] = (counts[row.module_id] ?? 0) + 1
  }
  return counts
}
