'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { supabase } from '@/lib/supabase'
import { getModuleBySlug, getModuleQuizzes } from '@/lib/queries'
import { ModuleIcon } from '@/components/ui/ModuleIcon'
import type { Module, ModuleQuiz } from '@/lib/types'

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong'

export default function ClassicQuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()

  const [mod, setMod] = useState<Module | null>(null)
  const [questions, setQuestions] = useState<ModuleQuiz[]>([])
  const [shuffled, setShuffled] = useState<string[][]>([])
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userInitials, setUserInitials] = useState('?')
  const [userXp] = useState(0)
  const [userStreak] = useState(0)

  useEffect(() => {
    async function load() {
      const m = await getModuleBySlug(slug)
      if (!m) { setLoading(false); return }
      setMod(m)
      const qs = await getModuleQuizzes(m.id)
      setQuestions(qs)
      setShuffled(qs.map(q => shuffleAnswers(q)))
      setLoading(false)
    }
    load()
    supabase.auth.getUser().then(({ data }) => {
      const email = data?.user?.email ?? ''
      if (email) setUserInitials(email.slice(0, 2).toUpperCase())
    })
  }, [slug])

  function shuffleAnswers(q: ModuleQuiz): string[] {
    const all = [q.correct_fr, ...q.distractors_fr]
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    return all
  }

  const current = questions[idx]
  const currentOptions = shuffled[idx] ?? []

  function getState(opt: string): OptionState {
    if (!revealed) return opt === selected ? 'selected' : 'idle'
    if (opt === current?.correct_fr) return 'correct'
    if (opt === selected) return 'wrong'
    return 'idle'
  }

  function handleValidate() {
    if (!selected || revealed) return
    setRevealed(true)
    if (selected === current?.correct_fr) setScore(s => s + 1)
  }

  function handleNext() {
    if (idx >= questions.length - 1) {
      setDone(true)
    } else {
      setIdx(i => i + 1)
      setSelected(null)
      setRevealed(false)
    }
  }

  const optionBg = (state: OptionState) => {
    if (state === 'correct') return { background: '#f0fdf4', border: '2px solid #22c55e' }
    if (state === 'wrong') return { background: '#fef2f2', border: '2px solid #ef4444' }
    if (state === 'selected') return { background: '#e0f2f1', border: '2px solid #0F766E' }
    return { background: 'white', border: '2px solid #e4e4e7' }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f7f8' }}>
      <Sidebar xp={userXp} streak={userStreak} initials={userInitials} />

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {/* Topbar */}
        <div style={{
          background: 'white', borderBottom: '1px solid #e4e4e7',
          padding: '16px 32px', position: 'sticky', top: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: '#f4f4f5', border: 'none', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
          >
            ← Retour
          </button>
          {mod && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'linear-gradient(135deg,#0891b222,#6366f122)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ModuleIcon icon={mod.icon} size={18} color="#0891b2" strokeWidth={1.75} />
              </div>
              <span style={{ fontWeight: 900, fontSize: 16, color: '#09090b' }}>{mod.name_fr}</span>
              <span style={{
                background: '#f0f9ff', color: '#0c4a6e', border: '1px solid #bae6fd',
                borderRadius: 99, padding: '3px 10px', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>Classique</span>
            </div>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: '#71717a', fontWeight: 700 }}>Chargement…</div>
        )}

        {!loading && questions.length === 0 && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
            <div style={{ fontWeight: 900, fontSize: 20, color: '#09090b', marginBottom: 8 }}>Questions bientôt disponibles</div>
            <div style={{ fontSize: 14, color: '#71717a' }}>Ce module est en cours de préparation.</div>
          </div>
        )}

        {done && (
          <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
            <div style={{
              background: 'linear-gradient(160deg,#0F766E,#134e4a)',
              borderRadius: 28, padding: '40px 32px', color: 'white', marginBottom: 24,
            }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>
                {score / questions.length >= 0.8 ? '🏆' : score / questions.length >= 0.5 ? '👍' : '📚'}
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>
                {score} / {questions.length}
              </div>
              <div style={{ fontSize: 15, color: 'rgba(167,243,208,0.8)' }}>
                {score / questions.length >= 0.8 ? 'Excellent !' : score / questions.length >= 0.5 ? 'Bien joué !' : 'Continue à réviser !'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => { setIdx(0); setSelected(null); setRevealed(false); setScore(0); setDone(false); setShuffled(questions.map(q => shuffleAnswers(q))) }}
                style={{ background: '#0F766E', color: 'white', border: 'none', borderRadius: 14, padding: '14px 28px', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}
              >
                Recommencer
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                style={{ background: '#f4f4f5', color: '#09090b', border: 'none', borderRadius: 14, padding: '14px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
              >
                Tableau de bord
              </button>
            </div>
          </div>
        )}

        {!loading && !done && current && (
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
            {/* Progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
              <div style={{ flex: 1, height: 6, background: '#e4e4e7', borderRadius: 99 }}>
                <div style={{
                  height: '100%',
                  width: `${((idx) / questions.length) * 100}%`,
                  background: 'linear-gradient(135deg,#0891b2,#6366f1)',
                  borderRadius: 99, transition: 'width 0.3s',
                }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#71717a', whiteSpace: 'nowrap' }}>
                {idx + 1} / {questions.length}
              </span>
            </div>

            {/* Theme badge */}
            {current.theme && (
              <div style={{
                display: 'inline-block', background: '#f0f9ff', color: '#0c4a6e',
                border: '1px solid #bae6fd', borderRadius: 10,
                padding: '4px 12px', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20,
              }}>
                {current.theme}
              </div>
            )}

            {/* Question */}
            <div style={{
              background: 'white', borderRadius: 20, border: '1px solid #e4e4e7',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '28px 28px 24px',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#09090b', lineHeight: 1.5, marginBottom: 24 }}>
                {current.question_fr}
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {currentOptions.map((opt, i) => {
                  const state = getState(opt)
                  const style = optionBg(state)
                  return (
                    <button
                      key={i}
                      onClick={() => { if (!revealed) setSelected(opt) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 16px', borderRadius: 14,
                        cursor: revealed ? 'default' : 'pointer',
                        textAlign: 'left', width: '100%', transition: 'all 0.15s',
                        ...style,
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
                      <span style={{
                        fontSize: 14, fontWeight: state === 'correct' ? 700 : 600,
                        color: state === 'correct' ? '#166534' : state === 'wrong' ? '#991b1b' : '#09090b',
                      }}>
                        {opt}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Explanation */}
              {revealed && current.explanation_correct_fr && (
                <div style={{
                  marginTop: 18, padding: '14px 18px', borderRadius: 14,
                  background: selected === current.correct_fr ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${selected === current.correct_fr ? '#86efac' : '#fde68a'}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: selected === current.correct_fr ? '#166534' : '#92400e', marginBottom: 6 }}>
                    {selected === current.correct_fr ? 'Correct !' : `Bonne réponse : ${current.correct_fr}`}
                  </div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>
                    {current.explanation_correct_fr}
                  </p>
                </div>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={revealed ? handleNext : handleValidate}
              disabled={!selected && !revealed}
              style={{
                width: '100%', padding: '16px', borderRadius: 16,
                border: 'none', fontWeight: 900, fontSize: 15, cursor: 'pointer',
                background: !selected && !revealed ? '#e4e4e7' : 'linear-gradient(135deg,#0891b2,#6366f1)',
                color: !selected && !revealed ? '#a1a1aa' : 'white',
                transition: 'opacity 0.15s',
              }}
            >
              {revealed ? (idx >= questions.length - 1 ? 'Voir les résultats' : 'Question suivante →') : 'Valider'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
