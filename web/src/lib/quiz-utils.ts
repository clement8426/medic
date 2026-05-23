import type { Quiz, Lang, QuizAnswer, UserProgress } from './types'

export function getQuizField<K extends string>(
  quiz: Quiz,
  field: K,
  lang: Lang = 'fr'
): string {
  const key = `${field}_${lang}` as keyof Quiz
  const fallback = field as keyof Quiz
  return (quiz[key] as string) || (quiz[fallback] as string) || ''
}

export function getDistractors(quiz: Quiz, lang: Lang = 'fr'): string[] {
  const key = `distractors_${lang}` as keyof Quiz
  const fallback = 'distractors' as keyof Quiz
  return (quiz[key] as string[]) || (quiz[fallback] as string[]) || []
}

export function shuffleOptions(quiz: Quiz, lang: Lang = 'fr'): string[] {
  const correct = getQuizField(quiz, 'correct', lang)
  const distractors = getDistractors(quiz, lang)
  const all = [correct, ...distractors]
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  return all
}

export function computeXp(answers: QuizAnswer[]): number {
  const correct = answers.filter(a => a.is_correct).length
  const total   = answers.length
  const base    = correct * 25
  const bonus   = correct === total ? 50 : 0
  return base + bonus
}

export function computeStars(answers: QuizAnswer[]): 1 | 2 | 3 {
  const pct = answers.filter(a => a.is_correct).length / answers.length
  if (pct === 1) return 3
  if (pct >= 0.75) return 2
  return 1
}

export function computeResultMessage(answers: QuizAnswer[]): string {
  const pct = answers.filter(a => a.is_correct).length / answers.length
  if (pct === 1) return 'Parfait !'
  if (pct >= 0.75) return 'Excellent !'
  if (pct >= 0.5) return 'Bien joué !'
  return 'Continue !'
}

// Simplified SM-2 SRS algorithm
export function computeNextReview(
  correct: boolean,
  easeFactor: number,
  intervalDays: number
): { nextReviewAt: string; easeFactor: number; intervalDays: number } {
  let newEaseFactor = easeFactor
  let newInterval   = intervalDays

  if (correct) {
    newInterval   = Math.max(1, Math.round(intervalDays * easeFactor))
    newEaseFactor = Math.min(3.0, easeFactor + 0.1)
  } else {
    newInterval   = 1
    newEaseFactor = Math.max(1.3, easeFactor - 0.2)
  }

  const next = new Date()
  next.setDate(next.getDate() + newInterval)

  return {
    nextReviewAt: next.toISOString(),
    easeFactor:   newEaseFactor,
    intervalDays: newInterval,
  }
}

// ── Cooldown (24h lock after wrong answer) ───────────────────────────────────

const COOLDOWN_MS = 24 * 60 * 60 * 1000

export function getQuizCooldown(progress: UserProgress | undefined): {
  blocked: boolean
  remainingMs: number
  remainingText: string
} {
  if (!progress) return { blocked: false, remainingMs: 0, remainingText: '' }
  if (progress.answered_correctly) return { blocked: false, remainingMs: 0, remainingText: '' }

  const lastWrong = new Date(progress.updated_at).getTime()
  const unlockAt = lastWrong + COOLDOWN_MS
  const now = Date.now()
  const remainingMs = Math.max(0, unlockAt - now)

  if (remainingMs === 0) {
    return { blocked: false, remainingMs: 0, remainingText: '' }
  }

  const hours = Math.floor(remainingMs / (1000 * 60 * 60))
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))
  const remainingText = hours > 0
    ? `${hours}h ${minutes}min`
    : `${minutes} min`

  return { blocked: true, remainingMs, remainingText }
}

export function formatCountdown(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0 || hours > 0) parts.push(`${minutes.toString().padStart(2, '0')}min`)
  parts.push(`${seconds.toString().padStart(2, '0')}s`)
  return parts.join(' ')
}
