'use client'
import { useEffect, useState, useMemo, use } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { supabase } from '@/lib/supabase'
import { getCaseById, getQuizzesByCase, saveQuizAnswer, getQuizProgress, saveSessionStats, submitReport } from '@/lib/queries'
import {
  shuffleOptions,
  getQuizField,
  computeNextReview,
  computeXp,
  getQuizCooldown,
  formatCountdown,
} from '@/lib/quiz-utils'
import { resolveImageUrl, resolveFocusUrl } from '@/lib/image-utils'
import type { Case, Quiz, QuizAnswer, UserProgress, ReportReason } from '@/lib/types'

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'wrong_answer',       label: 'Réponse incorrecte'      },
  { value: 'bad_translation',    label: 'Mauvaise traduction'      },
  { value: 'unclear_question',   label: 'Question ambiguë'         },
  { value: 'wrong_options',      label: 'Options incorrectes'      },
  { value: 'wrong_difficulty',   label: 'Difficulté erronée'       },
  { value: 'other',              label: 'Autre'                    },
]

function ReportModal({
  caseId, quizId, quizTheme, userId,
  onClose,
}: {
  caseId: string
  quizId: string | null
  quizTheme: string
  userId: string | null
  onClose: () => void
}) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (!reason || !userId) return
    setSubmitting(true)
    try {
      await submitReport({ reporter_id: userId, case_id: caseId, quiz_id: quizId, reason, details: details || undefined })
      setDone(true)
      setTimeout(onClose, 1800)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 22, padding: '28px 28px 24px',
          width: '100%', maxWidth: 460,
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        }}
      >
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✓</div>
            <div style={{ fontWeight: 900, fontSize: 16, color: '#0F766E' }}>Signalement envoyé</div>
            <div style={{ fontSize: 13, color: '#71717a', marginTop: 6 }}>Merci pour votre retour !</div>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 900, fontSize: 17, color: '#09090b', marginBottom: 4 }}>
              Signaler un problème
            </div>
            <div style={{ fontSize: 12, color: '#71717a', marginBottom: 20 }}>
              {quizTheme ? `Question — ${quizTheme.charAt(0).toUpperCase() + quizTheme.slice(1)}` : 'Cas complet'}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {REPORT_REASONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  style={{
                    padding: '7px 14px', borderRadius: 99, border: '2px solid',
                    borderColor: reason === r.value ? '#0F766E' : '#e4e4e7',
                    background: reason === r.value ? '#f0fdf4' : 'white',
                    color: reason === r.value ? '#0F766E' : '#71717a',
                    fontWeight: reason === r.value ? 900 : 600,
                    fontSize: 13, cursor: 'pointer', transition: 'all 0.12s',
                    fontFamily: 'inherit',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Détails supplémentaires (optionnel)…"
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '11px 14px', borderRadius: 12,
                border: '1px solid #e4e4e7', background: '#fafafa',
                fontSize: 13, color: '#09090b', resize: 'vertical',
                outline: 'none', fontFamily: 'inherit', marginBottom: 16,
              }}
            />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px', borderRadius: 12, border: '1px solid #e4e4e7',
                  background: 'white', color: '#71717a', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                style={{
                  padding: '10px 22px', borderRadius: 12, border: 'none',
                  background: reason ? '#0F766E' : '#e4e4e7',
                  color: reason ? 'white' : '#94a3b8',
                  fontWeight: 900, fontSize: 14, cursor: reason ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                }}
              >
                {submitting ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ECG viewer (inline mini version)
function EcgPanel({ caseData, moduleSlug }: { caseData: Case; moduleSlug: string }) {
  const [showFull, setShowFull] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const isEcg = moduleSlug === 'ecg'

  const fullUrl = resolveImageUrl(caseData.image_url, moduleSlug)
  const d2Url = resolveFocusUrl(caseData.focus_urls, 'd2_band', moduleSlug) || fullUrl
  const currentUrl = showFull ? fullUrl : d2Url

  return (
    <div style={{
      background: 'white',
      borderRadius: 22,
      border: '1px solid #e4e4e7',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      padding: 20,
      height: '100%',
    }}>
      <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 10 }}>
        {isEcg ? 'ECG' : 'IMAGE CLINIQUE'}
      </div>

      {isEcg && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {(['DII', '12 Dérivations'] as const).map((label, idx) => (
            <button
              key={label}
              onClick={() => setShowFull(idx === 1)}
              style={{
                padding: '5px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 12,
                background: (showFull ? idx === 1 : idx === 0)
                  ? 'linear-gradient(135deg,#0F766E,#0891b2)' : '#f4f4f5',
                color: (showFull ? idx === 1 : idx === 0) ? 'white' : '#71717a',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div style={{ background: '#0a0a0a', borderRadius: 12, overflow: 'hidden', position: 'relative', border: '1px solid #27272a' }}>
        {currentUrl ? (
          <img src={currentUrl} alt="ECG" style={{ width: '100%', height: showFull ? 'auto' : 140, objectFit: 'contain', display: 'block' }} />
        ) : (
          <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a' }}>
            Aucune image
          </div>
        )}
        <button
          onClick={() => setModalOpen(true)}
          style={{
            position: 'absolute', bottom: 8, right: 8,
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
            color: 'white', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >🔍</button>
      </div>

      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setModalOpen(false) }}
              style={{
                position: 'absolute', top: -38, right: 0,
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
                color: 'white', padding: '5px 12px', cursor: 'pointer', fontWeight: 700,
              }}
            >✕ Fermer</button>
            <img src={fullUrl} alt="ECG plein écran" style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }} />
          </div>
        </div>
      )}

      {/* Patient context */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f4f4f5' }}>
        <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 10 }}>
          PATIENT
        </div>
        <div style={{ display: 'flex', gap: 18, marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: '#09090b' }}>Cas #{caseData.case_number}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginTop: 1 }}>CAS</div>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: '#09090b' }}>{caseData.age} ans</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginTop: 1 }}>ÂGE</div>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: '#09090b' }}>{caseData.sex === 'Homme' ? '♂ H' : '♀ F'}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginTop: 1 }}>SEXE</div>
          </div>
          {caseData.weight_kg && (
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: '#09090b' }}>{caseData.weight_kg} kg</div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginTop: 1 }}>POIDS</div>
            </div>
          )}
        </div>
        {caseData.tags && caseData.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5, marginBottom: 10 }}>
            {caseData.tags.map(tag => (
              <span key={tag} style={{
                background: '#f0f9ff', color: '#0369a1',
                border: '1px solid #bae6fd',
                borderRadius: 8, padding: '2px 8px',
                fontSize: 11, fontWeight: 700,
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Rapport clinique */}
        {caseData.report_fr && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 8 }}>
              PRÉSENTATION CLINIQUE
            </div>
            <div style={{
              background: '#f0fdf4', borderRadius: 12,
              border: '1px solid #bbf7d0',
              padding: '11px 13px',
              fontSize: 12, color: '#166534', lineHeight: 1.6, fontWeight: 600,
            }}>
              {caseData.report_fr}
            </div>
          </div>
        )}

        {/* Données cliniques */}
        {caseData.data_fr && Object.keys(caseData.data_fr).length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 8 }}>
              DONNÉES CLINIQUES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
              {Object.entries(caseData.data_fr).map(([key, value]) => (
                <div key={key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 10px', borderRadius: 10,
                  background: '#f9fafb', border: '1px solid #f0f0f0',
                }}>
                  <span style={{ fontSize: 12, color: '#71717a', fontWeight: 700, textTransform: 'capitalize' as const }}>
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: 12, color: '#09090b', fontWeight: 900 }}>
                    {Array.isArray(value)
                      ? (value as unknown[]).join(', ')
                      : typeof value === 'object' && value !== null
                        ? JSON.stringify(value)
                        : String(value ?? '—')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Pre-shuffled options per quiz step
function useShuffledOptions(quizzes: Quiz[]): string[][] {
  return useMemo(() => {
    return quizzes.map(q => shuffleOptions(q, 'fr'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizzes.map(q => q.id).join(',')])
}

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: caseId } = use(params)
  const router = useRouter()

  const [caseData, setCaseData] = useState<Case | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [moduleSlug, setModuleSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userInitials, setUserInitials] = useState('?')
  const [userId, setUserId] = useState<string | null>(null)
  const [userXp] = useState(0)
  const [userStreak] = useState(0)

  // Quiz state
  const [stepIdx, setStepIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [stepStart, setStepStart] = useState(Date.now())
  const [progressMap, setProgressMap] = useState<Map<string, UserProgress>>(new Map())
  const [cooldownMs, setCooldownMs] = useState(0)
  const [reportOpen, setReportOpen] = useState(false)

  const shuffledOptions = useShuffledOptions(quizzes)

  useEffect(() => {
    async function load() {
      try {
        const c = await getCaseById(caseId)
        if (!c) { setError('Cas introuvable'); setLoading(false); return }
        setCaseData(c)

        const qs = await getQuizzesByCase(caseId)
        setQuizzes(qs)

        // Charger la progression utilisateur pour ce cas
        const user = await supabase.auth.getUser()
        const uid = user.data.user?.id
        if (uid && qs.length > 0) {
          const progress = await getQuizProgress(uid, qs.map(q => q.id))
          const map = new Map<string, UserProgress>()
          for (const p of progress) {
            map.set(p.quiz_id, p)
          }
          setProgressMap(map)
        }

        const { data: modData } = await supabase
          .from('modules')
          .select('slug')
          .eq('id', c.module_id)
          .single()
        if (modData) setModuleSlug(modData.slug)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    }
    load()
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user
      if (u) {
        setUserId(u.id)
        setUserInitials((u.email ?? '?').slice(0, 2).toUpperCase())
      }
    })
  }, [caseId])

  const quiz = quizzes[stepIdx]
  const options = shuffledOptions[stepIdx] ?? []
  const correctAnswer = quiz ? getQuizField(quiz, 'correct', 'fr') : ''
  const question = quiz ? getQuizField(quiz, 'question', 'fr') : ''
  const explanationCorrect = quiz ? getQuizField(quiz, 'explanation_correct', 'fr') : ''
  const explanationWrong = quiz ? getQuizField(quiz, 'explanation_wrong', 'fr') : ''
  const keyFinding = quiz ? getQuizField(quiz, 'key_finding', 'fr') : ''

  const isCorrect = selected === correctAnswer

  // Timer de compte à rebours pour le cooldown
  useEffect(() => {
    if (!quiz) return
    const prog = progressMap.get(quiz.id)
    const cd = getQuizCooldown(prog)
    if (cd.blocked) {
      setCooldownMs(cd.remainingMs)
      const interval = setInterval(() => {
        setCooldownMs(prev => {
          const next = prev - 1000
          if (next <= 0) {
            clearInterval(interval)
            return 0
          }
          return next
        })
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setCooldownMs(0)
    }
  }, [quiz?.id, progressMap])

  function handleSelect(opt: string) {
    if (revealed || cooldownMs > 0) return
    setSelected(opt)
  }

  function handleValidate() {
    if (!selected || !quiz || cooldownMs > 0) return
    setRevealed(true)
  }

  async function handleNext() {
    if (!quiz || !caseData) return

    const timeMs = Date.now() - stepStart
    const answer: QuizAnswer = {
      quiz_id: quiz.id,
      step: quiz.step,
      theme: quiz.theme,
      correct_answer: correctAnswer,
      given_answer: selected,
      is_correct: isCorrect,
      time_ms: timeMs,
    }
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)

    // Save to DB if logged in
    if (userId) {
      const { nextReviewAt, easeFactor, intervalDays } = computeNextReview(isCorrect, 2.5, 1)
      await saveQuizAnswer(userId, {
        case_id: caseId,
        quiz_id: quiz.id,
        answered_correctly: isCorrect,
        answer_given: selected ?? '',
        time_ms: timeMs,
        next_review_at: nextReviewAt,
        ease_factor: easeFactor,
        interval_days: intervalDays,
      }).catch(() => {})
    }

    if (stepIdx < quizzes.length - 1) {
      setStepIdx(s => s + 1)
      setSelected(null)
      setRevealed(false)
      setStepStart(Date.now())
    } else {
      // Save session and navigate to recap
      if (userId && caseData.module_id) {
        try {
          await saveSessionStats(userId, caseData.module_id, computeXp(newAnswers), newAnswers)
        } catch (err) {
          console.error('[saveSessionStats]', err)
        }
      }
      const sessionData = {
        case_id: caseId,
        case_label: `Cas #${caseData.case_number}`,
        answers: newAnswers,
        total_xp: 0,
        started_at: stepStart,
        case_age: caseData.age,
        case_sex: caseData.sex,
        module_slug: moduleSlug,
        report_fr: caseData.report_fr,
        image_url: caseData.image_url,
        focus_urls: caseData.focus_urls,
      }
      sessionStorage.setItem(`mediq_session_${caseId}`, JSON.stringify(sessionData))
      router.push(`/session/recap?case_id=${caseId}`)
    }
  }

  function getButtonStyle(opt: string): React.CSSProperties {
    const base: React.CSSProperties = {
      width: '100%',
      textAlign: 'left',
      padding: '13px 16px',
      borderRadius: 14,
      fontSize: 14,
      fontWeight: 700,
      cursor: revealed ? 'default' : 'pointer',
      border: '2px solid',
      transition: 'all 0.15s',
      lineHeight: 1.4,
    }
    if (!revealed) {
      if (opt === selected) {
        return { ...base, background: '#f0fdf4', borderColor: '#0F766E', color: '#0F766E' }
      }
      return { ...base, background: 'white', borderColor: '#e4e4e7', color: '#09090b' }
    }
    // Revealed
    if (opt === correctAnswer) {
      return { ...base, background: '#f0fdf4', borderColor: '#22c55e', color: '#166534' }
    }
    if (opt === selected && opt !== correctAnswer) {
      return { ...base, background: '#fef2f2', borderColor: '#ef4444', color: '#991b1b' }
    }
    return { ...base, background: '#f9fafb', borderColor: '#e4e4e7', color: '#94a3b8' }
  }

  const totalSteps = quizzes.length || 4

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f7f8' }}>
      {reportOpen && quiz && (
        <ReportModal
          caseId={caseId}
          quizId={quiz.id}
          quizTheme={quiz.theme}
          userId={userId}
          onClose={() => setReportOpen(false)}
        />
      )}
      <Sidebar xp={userXp} streak={userStreak} initials={userInitials} />

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {/* Topbar */}
        <div style={{
          background: 'white',
          borderBottom: '1px solid #e4e4e7',
          padding: '14px 28px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <button
            onClick={() => router.push(`/case/${caseId}`)}
            style={{
              background: '#f4f4f5', border: 'none', borderRadius: 10,
              padding: '7px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#09090b',
            }}
          >
            ← Retour
          </button>
          <div style={{ fontWeight: 900, fontSize: 16, color: '#09090b', flex: 1 }}>
            Quiz — {caseData ? `Cas #${caseData.case_number}` : '…'}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#71717a' }}>
            {stepIdx + 1} / {totalSteps}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#71717a', fontWeight: 700 }}>
            Chargement…
          </div>
        )}
        {error && (
          <div style={{
            margin: '24px 28px',
            background: '#fef2f2', border: '1px solid #fca5a5',
            color: '#991b1b', borderRadius: 14, padding: '14px 18px', fontWeight: 700,
          }}>
            {error}
          </div>
        )}

        {!loading && !error && caseData && quiz && (
          <div className="quiz-grid" style={{
            padding: '24px 28px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 22,
            alignItems: 'start',
          }}>
            {/* Left: ECG viewer */}
            <EcgPanel caseData={caseData} moduleSlug={moduleSlug} />

            {/* Right: Quiz panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Progress bar */}
              <div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 5,
                        borderRadius: 99,
                        background: i < stepIdx
                          ? '#0F766E'
                          : i === stepIdx
                            ? 'linear-gradient(135deg,#0F766E,#0891b2)'
                            : '#e4e4e7',
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>
                  Question {stepIdx + 1} sur {totalSteps}
                </div>
              </div>

              {/* Theme badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  background: '#f0f9ff', color: '#0891b2', border: '1px solid #bae6fd',
                  borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 900,
                  textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                }}>
                  {quiz.theme ? quiz.theme.charAt(0).toUpperCase() + quiz.theme.slice(1) : ''}
                </span>
              </div>

              {/* Question */}
              <div style={{
                background: 'white',
                borderRadius: 18,
                border: '1px solid #e4e4e7',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                padding: '20px 22px',
              }}>
                <div style={{ fontWeight: 900, fontSize: 15, color: '#09090b', lineHeight: 1.5 }}>
                  {question}
                </div>
              </div>

              {cooldownMs > 0 ? (
                <div style={{
                  borderRadius: 20,
                  border: '2px solid #fde68a',
                  background: '#fffbeb',
                  padding: '28px 24px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
                  <div style={{ fontWeight: 900, fontSize: 16, color: '#92400e', marginBottom: 8 }}>
                    Question bloquée
                  </div>
                  <div style={{ fontSize: 13, color: '#a16207', lineHeight: 1.5, marginBottom: 16 }}>
                    Vous avez répondu incorrectement à cette question.<br />
                    Attendez 24 heures pour réessayer.
                  </div>
                  <div style={{
                    display: 'inline-block',
                    background: '#fef3c7',
                    borderRadius: 12,
                    padding: '10px 18px',
                    fontWeight: 900,
                    fontSize: 18,
                    color: '#92400e',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {formatCountdown(cooldownMs)}
                  </div>
                </div>
              ) : (
                <>
                  {/* Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleSelect(opt)}
                        style={getButtonStyle(opt)}
                      >
                        <span style={{ marginRight: 8 }}>
                          {revealed
                            ? opt === correctAnswer ? '✓' : opt === selected ? '✗' : '·'
                            : opt === selected ? '●' : '○'
                          }
                        </span>
                        {opt}
                      </button>
                    ))}
                  </div>

                  {/* Explanation panel */}
                  {revealed && (
                    <div style={{
                      borderRadius: 16,
                      border: `1px solid ${isCorrect ? '#bbf7d0' : '#fde68a'}`,
                      background: isCorrect ? '#f0fdf4' : '#fffbeb',
                      padding: '16px 18px',
                    }}>
                      <div style={{
                        fontWeight: 900,
                        fontSize: 14,
                        color: isCorrect ? '#166534' : '#92400e',
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        {isCorrect ? '✓ Correct !' : '✗ Incorrect'}
                      </div>
                      <div style={{ fontSize: 13, color: isCorrect ? '#166534' : '#92400e', lineHeight: 1.55, marginBottom: 8 }}>
                        {isCorrect ? explanationCorrect : explanationWrong}
                      </div>
                      {!isCorrect && keyFinding && (
                        <div style={{
                          background: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '10px 12px',
                          fontSize: 12, color: '#78350f', fontStyle: 'italic',
                        }}>
                          <strong>Point clé :</strong> {keyFinding}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Report link */}
                  {revealed && (
                    <div style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setReportOpen(true)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 12, color: '#94a3b8', fontWeight: 700,
                          padding: '4px 0', display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontFamily: 'inherit',
                        }}
                      >
                        ⚑ Signaler un problème
                      </button>
                    </div>
                  )}

                  {/* CTA */}
                  <div>
                    {!revealed ? (
                      <button
                        onClick={handleValidate}
                        disabled={!selected}
                        style={{
                          width: '100%',
                          background: selected ? 'linear-gradient(135deg,#0F766E,#0891b2)' : '#e4e4e7',
                          color: selected ? 'white' : '#94a3b8',
                          border: 'none',
                          borderRadius: 16,
                          borderBottom: selected ? '4px solid #0a5550' : '4px solid #d4d4d8',
                          padding: '15px 28px',
                          fontSize: 15,
                          fontWeight: 900,
                          cursor: selected ? 'pointer' : 'not-allowed',
                          transition: 'all 0.15s',
                        }}
                      >
                        Valider
                      </button>
                    ) : (
                      <button
                        onClick={handleNext}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg,#0F766E,#0891b2)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 16,
                          borderBottom: '4px solid #0a5550',
                          padding: '15px 28px',
                          fontSize: 15,
                          fontWeight: 900,
                          cursor: 'pointer',
                        }}
                      >
                        {stepIdx < quizzes.length - 1 ? 'Question suivante →' : 'Voir les résultats'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
