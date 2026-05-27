export type Lang = 'fr' | 'en' | 'de' | 'it'

export interface Module {
  id: string
  slug: string
  name_fr: string
  name_en: string
  name_de: string
  name_it: string
  description_fr: string
  description_en: string
  color: string
  icon: string
  active: boolean
  sort_order: number
  difficulty_max: number
  category: 'clinical' | 'classic'
  created_at: string
}

export interface ModuleQuiz {
  id: string
  module_id: string
  question_number: number
  theme: string | null
  question_fr: string
  question_en: string | null
  question_de: string | null
  question_it: string | null
  correct_fr: string
  distractors_fr: string[]
  explanation_correct_fr: string | null
  explanation_wrong_fr: string | null
  validated: boolean
}

export interface Case {
  id: string
  module_id: string
  case_number: number
  ecg_id: number | null
  age: number
  sex: string
  weight_kg: number | null
  height_cm: number | null
  image_url: string
  image_urls: string[] | null
  focus_urls: Record<string, string> | null
  report_fr: string
  report_de: string | null
  scp_codes: Record<string, number> | null
  data_fr: Record<string, unknown>
  difficulty: number
  validated: boolean
  tags: string[]
  created_at: string
}

export interface Quiz {
  id: string
  case_id: string
  step: number
  theme: string
  // Legacy fields (fallback)
  question: string | null
  correct: string | null
  distractors: string[] | null
  explanation_correct: string | null
  explanation_wrong: string | null
  key_finding: string | null
  // Multilingual
  question_fr: string | null
  question_en: string | null
  question_de: string | null
  question_it: string | null
  correct_fr: string | null
  correct_en: string | null
  correct_de: string | null
  correct_it: string | null
  distractors_fr: string[] | null
  distractors_en: string[] | null
  distractors_de: string[] | null
  distractors_it: string[] | null
  explanation_correct_fr: string | null
  explanation_correct_en: string | null
  explanation_correct_de: string | null
  explanation_correct_it: string | null
  explanation_wrong_fr: string | null
  explanation_wrong_fr_en: string | null
  key_finding_fr: string | null
  key_finding_en: string | null
  key_finding_de: string | null
  key_finding_it: string | null
  validated: boolean
  created_at: string
}

export interface UserProgress {
  id: string
  user_id: string
  case_id: string
  quiz_id: string
  module_id?: string
  answered_correctly: boolean
  answer_given: string
  time_ms: number
  attempts: number
  next_review_at: string | null
  ease_factor: number
  interval_days: number
  created_at: string
  updated_at: string
}

export interface ModuleQuizProgress {
  id: string
  user_id: string
  module_id: string
  quiz_id: string
  answered_correctly: boolean
  ease_factor: number
  interval_days: number
  next_review_at: string | null
  created_at: string
  updated_at: string
}

export interface UserModuleStats {
  id: string
  user_id: string
  module_id: string
  cases_completed: number
  total_quizzes_answered: number
  correct_rate: number
  current_streak: number
  longest_streak: number
  last_activity_at: string
  xp: number
  level: number
}

export type ProfTitle = 'medecin' | 'infirmier' | 'sage_femme' | 'aide_soignant' | 'etudiant' | 'autre'

export interface Profile {
  id: string
  pseudo: string
  title: ProfTitle | null
  gender: 'homme' | 'femme' | 'autre' | null
  institution: string | null
  show_email: boolean
  is_anonymous: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type ReportReason = 'wrong_answer' | 'bad_translation' | 'unclear_question' | 'wrong_options' | 'wrong_difficulty' | 'other'
export type ReportStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed'

export interface AdminReport {
  id: string
  reporter_id: string
  reporter_email: string
  case_id: string
  case_number: number
  module_name: string
  module_slug: string
  quiz_id: string | null
  quiz_step: number | null
  quiz_theme: string | null
  quiz_question: string | null
  reason: ReportReason
  details: string | null
  status: ReportStatus
  admin_note: string | null
  created_at: string
}

export interface UserSearchResult {
  user_id: string
  email: string
  pseudo: string
  show_email: boolean
  total_xp: number
  max_streak: number
  cases_completed: number
}

export interface FriendWithStats {
  friendship_id: string
  friend_id: string
  email: string
  pseudo: string
  show_email: boolean
  status: 'pending' | 'accepted' | 'declined'
  is_requester: boolean
  total_xp: number
  max_streak: number
  cases_completed: number
}

export type FeedbackType = 'bug' | 'suggestion' | 'content' | 'other'
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed'

export interface AdminFeedback {
  id: string
  reporter_id: string | null
  reporter_email: string | null
  page_url: string | null
  type: FeedbackType
  message: string
  platform: 'web' | 'mobile'
  status: FeedbackStatus
  admin_note: string | null
  created_at: string
}

export function getModuleName(mod: Module, lang: Lang): string {
  return (mod[`name_${lang}` as keyof Module] as string) || mod.name_en || mod.name_fr
}

export function getModuleDesc(mod: Module, lang: Lang): string {
  return (mod[`description_${lang}` as keyof Module] as string) || mod.description_en || mod.description_fr
}

// UI-only types
export interface QuizAnswer {
  quiz_id: string
  step: number
  theme: string
  correct_answer: string
  given_answer: string | null
  is_correct: boolean
  time_ms: number
}

export interface SessionResult {
  case_id: string
  case_label: string
  answers: QuizAnswer[]
  total_xp: number
  started_at: number
}
