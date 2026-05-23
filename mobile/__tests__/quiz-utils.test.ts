import {
  getQuizField,
  shuffleOptions,
  computeXp,
  computeStars,
  computeResultMessage,
  computeNextReview,
} from '../lib/quiz-utils'
import type { Quiz, QuizAnswer } from '../lib/types'

const makeQuiz = (overrides: Partial<Quiz> = {}): Quiz => ({
  id: 'quiz-1',
  case_id: 'case-1',
  step: 1,
  theme: 'rhythm',
  question: 'Default question',
  question_fr: 'Question en français',
  question_en: null,
  question_de: null,
  question_it: null,
  correct: 'Default correct',
  correct_fr: 'Bonne réponse FR',
  correct_en: null,
  correct_de: null,
  correct_it: null,
  distractors: ['Wrong 1', 'Wrong 2', 'Wrong 3'],
  distractors_fr: ['Mauvaise 1', 'Mauvaise 2', 'Mauvaise 3'],
  distractors_en: null,
  distractors_de: null,
  distractors_it: null,
  explanation_correct: null,
  explanation_correct_fr: null,
  explanation_correct_en: null,
  explanation_correct_de: null,
  explanation_correct_it: null,
  explanation_wrong: null,
  explanation_wrong_fr: null,
  explanation_wrong_fr_en: null,
  key_finding: null,
  key_finding_fr: null,
  key_finding_en: null,
  key_finding_de: null,
  key_finding_it: null,
  validated: true,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

const makeAnswer = (is_correct: boolean): QuizAnswer => ({
  quiz_id: 'quiz-1',
  step: 1,
  theme: 'rhythm',
  correct_answer: 'Bonne réponse',
  given_answer: is_correct ? 'Bonne réponse' : 'Mauvaise réponse',
  is_correct,
  time_ms: 1000,
})

describe('getQuizField', () => {
  it('returns question_fr when available', () => {
    const quiz = makeQuiz()
    expect(getQuizField(quiz, 'question', 'fr')).toBe('Question en français')
  })

  it('falls back to question when question_fr is null', () => {
    const quiz = makeQuiz({ question_fr: null })
    expect(getQuizField(quiz, 'question', 'fr')).toBe('Default question')
  })
})

describe('shuffleOptions', () => {
  it('returns array of 4 elements', () => {
    const quiz = makeQuiz()
    const options = shuffleOptions(quiz, 'fr')
    expect(options).toHaveLength(4)
  })

  it('includes correct_fr in the options', () => {
    const quiz = makeQuiz()
    const options = shuffleOptions(quiz, 'fr')
    expect(options).toContain('Bonne réponse FR')
  })

  it('includes all distractors in the options', () => {
    const quiz = makeQuiz()
    const options = shuffleOptions(quiz, 'fr')
    expect(options).toContain('Mauvaise 1')
    expect(options).toContain('Mauvaise 2')
    expect(options).toContain('Mauvaise 3')
  })
})

describe('computeXp', () => {
  it('returns 150 for 4 correct answers (4*25 + 50 bonus)', () => {
    const answers = [makeAnswer(true), makeAnswer(true), makeAnswer(true), makeAnswer(true)]
    expect(computeXp(answers)).toBe(150)
  })

  it('returns 75 for 3 correct + 1 wrong (no bonus)', () => {
    const answers = [makeAnswer(true), makeAnswer(true), makeAnswer(true), makeAnswer(false)]
    expect(computeXp(answers)).toBe(75)
  })
})

describe('computeStars', () => {
  it('returns 3 for 4/4 correct', () => {
    const answers = [makeAnswer(true), makeAnswer(true), makeAnswer(true), makeAnswer(true)]
    expect(computeStars(answers)).toBe(3)
  })

  it('returns 2 for 3/4 correct', () => {
    const answers = [makeAnswer(true), makeAnswer(true), makeAnswer(true), makeAnswer(false)]
    expect(computeStars(answers)).toBe(2)
  })

  it('returns 1 for 1/4 correct', () => {
    const answers = [makeAnswer(true), makeAnswer(false), makeAnswer(false), makeAnswer(false)]
    expect(computeStars(answers)).toBe(1)
  })
})

describe('computeResultMessage', () => {
  it('returns Parfait ! for 4/4', () => {
    const answers = [makeAnswer(true), makeAnswer(true), makeAnswer(true), makeAnswer(true)]
    expect(computeResultMessage(answers)).toBe('Parfait !')
  })

  it('returns Excellent ! for 3/4', () => {
    const answers = [makeAnswer(true), makeAnswer(true), makeAnswer(true), makeAnswer(false)]
    expect(computeResultMessage(answers)).toBe('Excellent !')
  })
})

describe('computeNextReview', () => {
  it('increases interval and ease_factor when correct', () => {
    const result = computeNextReview(true, 2.5, 1)
    expect(result.intervalDays).toBeGreaterThan(1)
    expect(result.easeFactor).toBeGreaterThan(2.5)
  })

  it('resets interval to 1 and decreases ease_factor when wrong', () => {
    const result = computeNextReview(false, 2.5, 5)
    expect(result.intervalDays).toBe(1)
    expect(result.easeFactor).toBeLessThan(2.5)
  })

  it('returns a nextReviewAt ISO string', () => {
    const result = computeNextReview(true, 2.5, 1)
    expect(typeof result.nextReviewAt).toBe('string')
    expect(() => new Date(result.nextReviewAt)).not.toThrow()
  })
})
