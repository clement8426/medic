'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { supabase } from '@/lib/supabase'
import { computeXp, computeStars, computeResultMessage } from '@/lib/quiz-utils'
import { getUserSidebarStats } from '@/lib/queries'
import { resolveImageUrl } from '@/lib/image-utils'
import type { QuizAnswer } from '@/lib/types'

interface SessionData {
  case_id: string
  case_label: string
  answers: QuizAnswer[]
  total_xp: number
  started_at: number
  case_age?: number
  case_sex?: string
  module_slug?: string
  report_fr?: string
  image_url?: string
  focus_urls?: Record<string, string> | null
}

function Stars({ count }: { count: 1 | 2 | 3 }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {[1, 2, 3].map(i => (
        <span key={i} style={{ fontSize: 36, opacity: i <= count ? 1 : 0.25 }}>⭐</span>
      ))}
    </div>
  )
}

function RecapContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const caseId = searchParams.get('case_id') ?? ''

  const [session, setSession] = useState<SessionData | null>(null)
  const [userInitials, setUserInitials] = useState('?')
  const [userXp, setUserXp] = useState(0)
  const [userStreak, setUserStreak] = useState(0)

  useEffect(() => {
    const raw = sessionStorage.getItem(`mediq_session_${caseId}`)
    if (raw) {
      try { setSession(JSON.parse(raw)) } catch {}
    }
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user
      if (u?.email) setUserInitials(u.email.slice(0, 2).toUpperCase())
      if (u) getUserSidebarStats(u.id).then(({ xp, streak }) => { setUserXp(xp); setUserStreak(streak) })
    })
  }, [caseId])

  if (!session) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f7f8' }}>
        <Sidebar xp={userXp} streak={userStreak} initials={userInitials} />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#71717a', fontWeight: 700 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div>Aucune session trouvée.</div>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                marginTop: 18,
                background: 'linear-gradient(135deg,#0F766E,#0891b2)',
                color: 'white', border: 'none', borderRadius: 14,
                borderBottom: '4px solid #0a5550',
                padding: '12px 24px', fontSize: 14, fontWeight: 900, cursor: 'pointer',
              }}
            >
              Tableau de bord
            </button>
          </div>
        </main>
      </div>
    )
  }

  const { answers, case_label, case_age, case_sex, module_slug, report_fr, image_url, focus_urls } = session
  const imageUrl = resolveImageUrl(image_url || '', module_slug || '')
  const d2Url = focus_urls?.d2_band ? resolveImageUrl(focus_urls.d2_band, module_slug || '') : imageUrl
  const stars = computeStars(answers)
  const message = computeResultMessage(answers)
  const xp = computeXp(answers)
  const correct = answers.filter(a => a.is_correct).length
  const total = answers.length
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f7f8' }}>
      <Sidebar xp={userXp} streak={userStreak} initials={userInitials} />

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {/* Topbar */}
        <div style={{
          background: 'white',
          borderBottom: '1px solid #e4e4e7',
          padding: '16px 32px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          fontWeight: 900,
          fontSize: 18,
          color: '#09090b',
        }}>
          Résultats
        </div>

        {/* Gradient header */}
        <div style={{
          background: 'linear-gradient(160deg,#0F766E 0%,#134e4a 100%)',
          padding: '40px 32px',
          color: 'white',
          textAlign: 'center',
        }}>
          <Stars count={stars} />
          <div style={{ fontSize: 32, fontWeight: 900, marginTop: 14 }}>{message}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 6, marginBottom: 24 }}>
            {case_label}
          </div>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'Réponses', value: `${correct}/${total}` },
              { label: 'Score', value: `${pct}%` },
              { label: 'XP gagnés', value: `+${xp} XP` },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'rgba(255,255,255,0.12)',
                borderRadius: 16,
                padding: '16px 24px',
                minWidth: 100,
                backdropFilter: 'blur(8px)',
              }}>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{stat.value}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(167,243,208,0.7)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginTop: 3 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Case image */}
          {(d2Url || imageUrl) && (
            <div style={{
              background: '#0a0a0a',
              borderRadius: 22,
              overflow: 'hidden',
              border: '1px solid #27272a',
            }}>
              <img
                src={module_slug === 'ecg' && d2Url ? d2Url : imageUrl}
                alt="Image clinique"
                style={{ width: '100%', maxHeight: 200, objectFit: 'contain', display: 'block' }}
              />
            </div>
          )}

          {/* Correction card */}
          {report_fr && (
            <div style={{
              background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
              borderRadius: 22,
              border: '1px solid #86efac',
              padding: '20px 24px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#166534', marginBottom: 10 }}>
                CORRECTION — DIAGNOSTIC
              </div>
              <p style={{ fontSize: 14, color: '#166534', lineHeight: 1.65, margin: 0, fontWeight: 600 }}>
                {report_fr}
              </p>
            </div>
          )}

          {/* Case info card */}
          <div style={{
            background: 'white',
            borderRadius: 22,
            border: '1px solid #e4e4e7',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            padding: '20px 24px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 14 }}>
              INFORMATIONS DU CAS
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 20, color: '#09090b' }}>{case_age ?? '—'} ans</div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginTop: 2 }}>ÂGE</div>
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 20, color: '#09090b' }}>
                  {case_sex === 'Homme' ? '♂ Homme' : case_sex === 'Femme' ? '♀ Femme' : '—'}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginTop: 2 }}>SEXE</div>
              </div>
            </div>
          </div>

          {/* Answer details */}
          <div style={{
            background: 'white',
            borderRadius: 22,
            border: '1px solid #e4e4e7',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            padding: '20px 24px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 16 }}>
              DÉTAIL DES RÉPONSES
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {answers.map((ans, i) => (
                <div
                  key={ans.quiz_id}
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${ans.is_correct ? '#bbf7d0' : '#fca5a5'}`,
                    background: ans.is_correct ? '#f0fdf4' : '#fef2f2',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                      background: ans.is_correct ? '#22c55e' : '#ef4444',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 900, fontSize: 13,
                    }}>
                      {ans.is_correct ? '✓' : '✗'}
                    </span>
                    <span style={{
                      fontWeight: 900, fontSize: 13,
                      color: ans.is_correct ? '#166534' : '#991b1b',
                    }}>
                      Question {i + 1} — {ans.theme}
                    </span>
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: 11,
                      color: '#94a3b8',
                      fontWeight: 700,
                    }}>
                      {(ans.time_ms / 1000).toFixed(1)}s
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: ans.is_correct ? '#166534' : '#991b1b', marginBottom: ans.is_correct ? 0 : 6 }}>
                    <strong>Bonne réponse :</strong> {ans.correct_answer}
                  </div>

                  {!ans.is_correct && ans.given_answer && (
                    <div style={{ fontSize: 12, color: '#991b1b', marginBottom: 4 }}>
                      <strong>Votre réponse :</strong> {ans.given_answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: 14 }}>
            {module_slug && (
              <button
                onClick={() => router.push(`/module/${module_slug}`)}
                style={{
                  flex: 1,
                  background: 'white',
                  color: '#0F766E',
                  border: '2px solid #0F766E',
                  borderRadius: 16,
                  padding: '14px 22px',
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Retour au module →
              </button>
            )}
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg,#0F766E,#0891b2)',
                color: 'white',
                border: 'none',
                borderRadius: 16,
                borderBottom: '4px solid #0a5550',
                padding: '14px 22px',
                fontSize: 14,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              🏠 Tableau de bord
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function SessionRecapPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f4f7f8', color: '#71717a', fontWeight: 700 }}>
        Chargement…
      </div>
    }>
      <RecapContent />
    </Suspense>
  )
}
