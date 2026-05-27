'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { supabase } from '@/lib/supabase'
import { getModuleBySlug, getModuleQuizzes, getModuleQuizProgress, saveModuleQuizAnswer, saveClassicQuizSession, getUserSidebarStats } from '@/lib/queries'
import { computeNextReview } from '@/lib/quiz-utils'
import { ModuleIcon } from '@/components/ui/ModuleIcon'
import type { Module, ModuleQuiz, ModuleQuizProgress } from '@/lib/types'
import { getModuleName } from '@/lib/types'
import { useI18n } from '@/lib/i18n'

const SESSION_SIZE = 20
const MAX_REQUEUES = 2

type QueueItem = { q: ModuleQuiz; opts: string[]; requeued: number }
type OptionState = 'idle' | 'selected' | 'correct' | 'wrong'

function shuffleArr(arr: string[]): string[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQueue(
  questions: ModuleQuiz[],
  progressMap: Map<string, ModuleQuizProgress>,
  forceAll = false
): QueueItem[] {
  const now = new Date()
  const due: QueueItem[] = []
  const newQ: QueueItem[] = []
  const mastered: QueueItem[] = []

  for (const q of questions) {
    const prog = progressMap.get(q.id)
    const opts = shuffleArr([q.correct_fr, ...q.distractors_fr])
    const item: QueueItem = { q, opts, requeued: 0 }
    if (!prog) {
      newQ.push(item)
    } else if (!prog.next_review_at || new Date(prog.next_review_at) <= now) {
      due.push(item)
    } else {
      mastered.push(item)
    }
  }

  for (let i = newQ.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newQ[i], newQ[j]] = [newQ[j], newQ[i]]
  }

  if (forceAll) {
    for (let i = mastered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[mastered[i], mastered[j]] = [mastered[j], mastered[i]]
    }
    return [...due, ...newQ, ...mastered].slice(0, SESSION_SIZE)
  }
  return [...due, ...newQ].slice(0, SESSION_SIZE)
}

export default function ClassicQuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const { lang, t } = useI18n()

  const [mod, setMod] = useState<Module | null>(null)
  const [allQuestions, setAllQuestions] = useState<ModuleQuiz[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [modId, setModId] = useState('')
  const [userInitials, setUserInitials] = useState('?')
  const [noContent, setNoContent] = useState(false)
  const [allMastered, setAllMastered] = useState(false)

  const [queue, setQueue] = useState<QueueItem[]>([])
  const [qIdx, setQIdx] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [done, setDone] = useState(false)
  const [progressMap, setProgressMap] = useState<Map<string, ModuleQuizProgress>>(new Map())
  const [userXp, setUserXp] = useState(0)
  const [userStreak, setUserStreak] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        if (user.email) setUserInitials(user.email.slice(0, 2).toUpperCase())
        getUserSidebarStats(user.id).then(({ xp, streak }) => { setUserXp(xp); setUserStreak(streak) })
      }
      const m = await getModuleBySlug(slug)
      if (!m) { setLoading(false); return }
      setMod(m)
      setModId(m.id)

      const [questions, progress] = await Promise.all([
        getModuleQuizzes(m.id),
        user ? getModuleQuizProgress(user.id, m.id) : Promise.resolve([]),
      ])

      if (questions.length === 0) { setNoContent(true); setLoading(false); return }
      setAllQuestions(questions)

      const pMap = new Map<string, ModuleQuizProgress>()
      for (const p of progress) pMap.set(p.quiz_id, p)
      setProgressMap(pMap)

      const q = buildQueue(questions, pMap)
      if (q.length === 0) { setAllMastered(true); setLoading(false); return }
      setQueue(q)
      setSessionTotal(q.length)
      setLoading(false)
    }
    load()
  }, [slug])

  function startForceSession() {
    const q = buildQueue(allQuestions, progressMap, true)
    setQueue(q)
    setSessionTotal(q.length)
    setQIdx(0)
    setSelected(null)
    setRevealed(false)
    setCorrectCount(0)
    setDone(false)
    setAllMastered(false)
  }

  function restart() {
    const q = buildQueue(allQuestions, progressMap)
    if (q.length === 0) { setAllMastered(true); return }
    setQueue(q)
    setSessionTotal(q.length)
    setQIdx(0)
    setSelected(null)
    setRevealed(false)
    setCorrectCount(0)
    setDone(false)
  }

  const current = queue[qIdx]

  function getState(opt: string): OptionState {
    if (!revealed) return opt === selected ? 'selected' : 'idle'
    if (opt === current?.q.correct_fr) return 'correct'
    if (opt === selected) return 'wrong'
    return 'idle'
  }

  function handleValidate() {
    if (!selected || revealed) return
    setRevealed(true)
  }

  async function handleNext() {
    if (!current || !selected) return
    const isCorrect = selected === current.q.correct_fr

    if (userId && modId) {
      const prog = progressMap.get(current.q.id)
      const srs = computeNextReview(isCorrect, prog?.ease_factor ?? 2.5, prog?.interval_days ?? 1)
      saveModuleQuizAnswer(userId, modId, current.q.id, isCorrect, srs.easeFactor, srs.intervalDays, srs.nextReviewAt)
        .catch(() => {})
      setProgressMap(prev => {
        const next = new Map(prev)
        next.set(current.q.id, {
          ...(prev.get(current.q.id) ?? { id: '', user_id: userId, created_at: new Date().toISOString() }),
          quiz_id: current.q.id,
          module_id: modId,
          answered_correctly: isCorrect,
          ease_factor: srs.easeFactor,
          interval_days: srs.intervalDays,
          next_review_at: srs.nextReviewAt,
          updated_at: new Date().toISOString(),
        } as ModuleQuizProgress)
        return next
      })
    }

    const newCorrect = isCorrect ? correctCount + 1 : correctCount
    if (isCorrect) setCorrectCount(newCorrect)

    let newQueue = queue
    if (!isCorrect && current.requeued < MAX_REQUEUES) {
      newQueue = [...queue]
      const insertAt = Math.min(qIdx + 3, newQueue.length)
      newQueue.splice(insertAt, 0, { ...current, requeued: current.requeued + 1 })
      setQueue(newQueue)
    }

    const nextIdx = qIdx + 1
    if (nextIdx >= newQueue.length) {
      if (userId && modId) {
        await saveClassicQuizSession(userId, modId, sessionTotal, newCorrect)
      }
      setDone(true)
    } else {
      setQIdx(nextIdx)
      setSelected(null)
      setRevealed(false)
    }
  }

  const optionBg = (state: OptionState) => {
    if (state === 'correct') return { background: '#f0fdf4', border: '2px solid #22c55e' }
    if (state === 'wrong')   return { background: '#fef2f2', border: '2px solid #ef4444' }
    if (state === 'selected') return { background: '#e0f2f1', border: '2px solid #0F766E' }
    return { background: 'white', border: '2px solid #e4e4e7' }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f7f8' }}>
      <Sidebar xp={userXp} streak={userStreak} initials={userInitials} />
      <main style={{ flex: 1, overflowY: 'auto' }}>

        {/* Topbar */}
        <div style={{ background: 'white', borderBottom: '1px solid #e4e4e7', padding: '16px 32px', position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: '#f4f4f5', border: 'none', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            {t.back}
          </button>
          {mod && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#0891b222,#6366f122)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ModuleIcon icon={mod.icon} size={18} color="#0891b2" strokeWidth={1.75} />
              </div>
              <span style={{ fontWeight: 900, fontSize: 16, color: '#09090b' }}>{getModuleName(mod, lang)}</span>
              <span style={{ background: '#f0f9ff', color: '#0c4a6e', border: '1px solid #bae6fd', borderRadius: 99, padding: '3px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.classic}</span>
            </div>
          )}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 80, color: '#71717a', fontWeight: 700 }}>Chargement…</div>}

        {/* No content */}
        {!loading && noContent && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
            <div style={{ fontWeight: 900, fontSize: 20, color: '#09090b', marginBottom: 8 }}>Questions bientôt disponibles</div>
            <div style={{ fontSize: 14, color: '#71717a' }}>Ce module est en cours de préparation.</div>
          </div>
        )}

        {/* All mastered */}
        {!loading && allMastered && (
          <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
            <div style={{ background: 'linear-gradient(160deg,#0F766E,#134e4a)', borderRadius: 28, padding: '40px 32px', color: 'white', marginBottom: 24 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🎓</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Tout est maîtrisé !</div>
              <div style={{ fontSize: 14, color: 'rgba(167,243,208,0.8)', lineHeight: 1.6 }}>
                Aucune question à réviser pour l'instant.<br />Reviens plus tard selon ton planning SRS.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={startForceSession} style={{ background: '#0891b2', color: 'white', border: 'none', borderRadius: 14, padding: '14px 28px', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
                Revoir quand même
              </button>
              <button onClick={() => router.push('/dashboard')} style={{ background: '#f4f4f5', color: '#09090b', border: 'none', borderRadius: 14, padding: '14px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                Tableau de bord
              </button>
            </div>
          </div>
        )}

        {/* Session done */}
        {done && !allMastered && (
          <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
            <div style={{ background: 'linear-gradient(160deg,#0F766E,#134e4a)', borderRadius: 28, padding: '40px 32px', color: 'white', marginBottom: 24 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>
                {correctCount / sessionTotal >= 0.8 ? '🏆' : correctCount / sessionTotal >= 0.5 ? '👍' : '📚'}
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>{correctCount} / {sessionTotal}</div>
              <div style={{ fontSize: 15, color: 'rgba(167,243,208,0.8)' }}>
                {correctCount / sessionTotal >= 0.8 ? 'Excellent !' : correctCount / sessionTotal >= 0.5 ? 'Bien joué !' : 'Continue à réviser !'}
              </div>
              <div style={{ marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>+{correctCount * 2} XP gagnés</div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={restart} style={{ background: '#0F766E', color: 'white', border: 'none', borderRadius: 14, padding: '14px 28px', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
                Nouvelle session
              </button>
              <button onClick={() => router.push('/dashboard')} style={{ background: '#f4f4f5', color: '#09090b', border: 'none', borderRadius: 14, padding: '14px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                Tableau de bord
              </button>
            </div>
          </div>
        )}

        {/* Quiz */}
        {!loading && !done && !allMastered && !noContent && current && (
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>

            {/* Progress bar: correct / sessionTotal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 6, background: '#e4e4e7', borderRadius: 99 }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, Math.round((correctCount / sessionTotal) * 100))}%`,
                  background: 'linear-gradient(135deg,#22c55e,#0891b2)',
                  borderRadius: 99, transition: 'width 0.3s',
                }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#71717a', whiteSpace: 'nowrap' }}>
                {correctCount} / {sessionTotal} ✓
              </span>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {current.requeued > 0 && (
                <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                  ↩ Réessai {current.requeued}/{MAX_REQUEUES}
                </span>
              )}
              {current.q.theme && (
                <span style={{ background: '#f0f9ff', color: '#0c4a6e', border: '1px solid #bae6fd', borderRadius: 10, padding: '4px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {current.q.theme}
                </span>
              )}
            </div>

            {/* Question card */}
            <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e4e4e7', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '28px 28px 24px', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#09090b', lineHeight: 1.5, marginBottom: 24 }}>
                {current.q.question_fr}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {current.opts.map((opt, i) => {
                  const state = getState(opt)
                  return (
                    <button
                      key={i}
                      onClick={() => { if (!revealed) setSelected(opt) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 16px', borderRadius: 14,
                        cursor: revealed ? 'default' : 'pointer',
                        textAlign: 'left', width: '100%', transition: 'all 0.15s',
                        ...optionBg(state),
                      }}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: 13,
                        background: state === 'correct' ? '#22c55e' : state === 'wrong' ? '#ef4444' : state === 'selected' ? '#0F766E' : '#f4f4f5',
                        color: state !== 'idle' ? 'white' : '#71717a',
                      }}>
                        {state === 'correct' ? '✓' : state === 'wrong' ? '✗' : String.fromCharCode(65 + i)}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: state === 'correct' ? 700 : 600, color: state === 'correct' ? '#166534' : state === 'wrong' ? '#991b1b' : '#09090b' }}>
                        {opt}
                      </span>
                    </button>
                  )
                })}
              </div>

              {revealed && current.q.explanation_correct_fr && (
                <div style={{
                  marginTop: 18, padding: '14px 18px', borderRadius: 14,
                  background: selected === current.q.correct_fr ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${selected === current.q.correct_fr ? '#86efac' : '#fde68a'}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: selected === current.q.correct_fr ? '#166534' : '#92400e', marginBottom: 6 }}>
                    {selected === current.q.correct_fr ? '✓ Correct !' : `✗ Bonne réponse : ${current.q.correct_fr}`}
                  </div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>
                    {current.q.explanation_correct_fr}
                  </p>
                  {selected !== current.q.correct_fr && current.requeued < MAX_REQUEUES && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#c2410c', fontWeight: 700 }}>
                      ↩ Cette question reviendra dans la session
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={revealed ? handleNext : handleValidate}
              disabled={!selected && !revealed}
              style={{
                width: '100%', padding: '16px', borderRadius: 16, border: 'none',
                fontWeight: 900, fontSize: 15, cursor: 'pointer',
                background: !selected && !revealed ? '#e4e4e7' : 'linear-gradient(135deg,#0891b2,#6366f1)',
                color: !selected && !revealed ? '#a1a1aa' : 'white',
                transition: 'opacity 0.15s',
              }}
            >
              {revealed ? 'Question suivante →' : 'Valider'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
