'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { supabase } from '@/lib/supabase'
import { getReviewQueue, getCaseById } from '@/lib/queries'
import type { UserProgress, Case } from '@/lib/types'

interface ReviewItem {
  progress: UserProgress
  caseData: Case | null
}

export default function ReviewPage() {
  const router = useRouter()
  const [items, setItems] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userInitials, setUserInitials] = useState('?')
  const [userXp] = useState(0)
  const [userStreak] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        setUserInitials((user.email ?? '?').slice(0, 2).toUpperCase())

        const queue = await getReviewQueue(user.id)

        // Fetch case data for each unique case_id
        const uniqueCaseIds = [...new Set(queue.map(p => p.case_id))]
        const caseMap: Record<string, Case | null> = {}
        await Promise.all(uniqueCaseIds.map(async cid => {
          caseMap[cid] = await getCaseById(cid)
        }))

        // Group by case_id — one entry per case
        const seen = new Set<string>()
        const result: ReviewItem[] = []
        for (const p of queue) {
          if (!seen.has(p.case_id)) {
            seen.add(p.case_id)
            result.push({ progress: p, caseData: caseMap[p.case_id] ?? null })
          }
        }
        setItems(result)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
          Révision du jour
        </div>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(160deg,#0F766E 0%,#134e4a 100%)',
          padding: '32px 32px',
          color: 'white',
        }}>
          <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>📚 Révision SRS</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
            Les cas qui nécessitent votre attention aujourd'hui
          </div>
        </div>

        <div style={{ padding: '28px 32px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 60, color: '#71717a', fontWeight: 700 }}>
              Chargement…
            </div>
          )}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5',
              color: '#991b1b', borderRadius: 14, padding: '14px 18px',
              fontWeight: 700, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 24px',
            }}>
              <div style={{ fontSize: 64, marginBottom: 18 }}>✨</div>
              <div style={{ fontWeight: 900, fontSize: 20, color: '#09090b', marginBottom: 8 }}>
                Rien à réviser aujourd'hui !
              </div>
              <div style={{ fontSize: 14, color: '#71717a', lineHeight: 1.5, marginBottom: 28 }}>
                Vous êtes à jour dans vos révisions.<br/>
                Continuez à étudier de nouveaux cas pour enrichir votre file de révision.
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  background: 'linear-gradient(135deg,#0F766E,#0891b2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 16,
                  borderBottom: '4px solid #0a5550',
                  padding: '13px 26px',
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Étudier de nouveaux cas →
              </button>
            </div>
          )}

          {items.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 16 }}>
                {items.length} CAS À RÉVISER
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {items.map(({ progress, caseData }) => (
                  <div
                    key={progress.case_id}
                    style={{
                      background: 'white',
                      borderRadius: 18,
                      border: '1px solid #e4e4e7',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                      background: 'linear-gradient(135deg,#0F766E,#0891b2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, color: 'white', fontSize: 15,
                    }}>
                      {caseData?.case_number ?? '?'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 14, color: '#09090b', marginBottom: 3 }}>
                        {caseData ? `Cas #${caseData.case_number}` : 'Cas'} — {caseData ? `${caseData.age} ans, ${caseData.sex === 'Homme' ? 'H' : 'F'}` : ''}
                      </div>
                      <div style={{ fontSize: 12, color: '#71717a' }}>
                        Intervalle : {progress.interval_days}j · Facilité : {progress.ease_factor?.toFixed(1)}
                      </div>
                      {progress.next_review_at && (
                        <div style={{ fontSize: 11, color: '#0891b2', fontWeight: 700, marginTop: 2 }}>
                          Prévu le {new Date(progress.next_review_at).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => router.push(`/quiz/${progress.case_id}`)}
                      style={{
                        background: 'linear-gradient(135deg,#0F766E,#0891b2)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 12,
                        borderBottom: '3px solid #0a5550',
                        padding: '9px 18px',
                        fontSize: 13,
                        fontWeight: 900,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap' as const,
                      }}
                    >
                      Réviser →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
