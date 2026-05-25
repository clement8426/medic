'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { supabase } from '@/lib/supabase'
import { getModuleBySlug, getUserProgress } from '@/lib/queries'
import { ModuleIcon } from '@/components/ui/ModuleIcon'
import type { Module, Case, UserProgress } from '@/lib/types'

function DifficultyDots({ level }: { level: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3].map(i => (
        <span key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: i <= level ? '#0F766E' : '#e4e4e7',
          display: 'inline-block',
        }} />
      ))}
    </span>
  )
}

function formatTimeLeft(unlockAt: Date): string {
  const diffMs = unlockAt.getTime() - Date.now()
  const h = Math.floor(diffMs / 3600000)
  const m = Math.floor((diffMs % 3600000) / 60000)
  if (h > 0) return `${h}h${m > 0 ? m + 'min' : ''}`
  return `${m}min`
}

function getCaseStatus(caseId: string, progressByCase: Record<string, UserProgress[]>): {
  state: 'todo' | 'done' | 'locked'
  unlocksAt?: Date
} {
  const entries = progressByCase[caseId]
  if (!entries || entries.length === 0) return { state: 'todo' }

  const now = new Date()
  const lockedEntry = entries.find(e =>
    !e.answered_correctly &&
    e.next_review_at &&
    new Date(e.next_review_at) > now
  )
  if (lockedEntry) return { state: 'locked', unlocksAt: new Date(lockedEntry.next_review_at!) }

  const allCorrect = entries.every(e => e.answered_correctly)
  return { state: allCorrect ? 'done' : 'todo' }
}

export default function ModuleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [mod, setMod] = useState<Module | null>(null)
  const [cases, setCases] = useState<Case[]>([])
  const [progressByCase, setProgressByCase] = useState<Record<string, UserProgress[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userInitials, setUserInitials] = useState('?')
  const [userXp] = useState(0)
  const [userStreak] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) setUserInitials(user.email.slice(0, 2).toUpperCase())

        const m = await getModuleBySlug(slug)
        if (!m) { setError('Module introuvable'); setLoading(false); return }
        setMod(m)

        const { data, error: casesErr } = await supabase
          .from('cases')
          .select('*')
          .eq('module_id', m.id)
          .order('case_number')
        if (casesErr) { setError(casesErr.message); setLoading(false); return }
        const loadedCases: Case[] = data ?? []
        setCases(loadedCases)

        if (user && loadedCases.length > 0) {
          const progress = await getUserProgress(user.id, loadedCases.map(c => c.id))
          const byCase: Record<string, UserProgress[]> = {}
          for (const p of progress) {
            if (!byCase[p.case_id]) byCase[p.case_id] = []
            byCase[p.case_id].push(p)
          }
          setProgressByCase(byCase)
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  const doneCount = cases.filter(c => getCaseStatus(c.id, progressByCase).state === 'done').length

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
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: '#f4f4f5', border: 'none', borderRadius: 10,
              padding: '7px 14px', cursor: 'pointer',
              fontWeight: 700, fontSize: 13, color: '#09090b',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            ← Retour
          </button>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#09090b' }}>
            {mod?.name_fr ?? '…'}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#71717a', fontWeight: 700 }}>
            Chargement…
          </div>
        )}
        {error && (
          <div style={{
            margin: '24px 32px',
            background: '#fef2f2', border: '1px solid #fca5a5',
            color: '#991b1b', borderRadius: 14, padding: '14px 18px', fontWeight: 700,
          }}>
            {error}
          </div>
        )}

        {mod && (
          <>
            {/* Module header */}
            <div style={{
              background: 'linear-gradient(160deg,#0F766E 0%,#134e4a 100%)',
              padding: '32px',
              color: 'white',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 18,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ModuleIcon icon={mod.icon} size={28} color="white" strokeWidth={1.75} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{mod.name_fr}</div>
                  <div style={{ fontSize: 13, color: 'rgba(167,243,208,0.8)', marginTop: 2 }}>
                    {doneCount} / {cases.length} cas réussis
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', maxWidth: 600, lineHeight: 1.5 }}>
                {mod.description_fr}
              </div>
            </div>

            {/* Cases list */}
            <div style={{ padding: '28px 32px' }}>
              <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 16 }}>
                CAS CLINIQUES — {cases.length} cas
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cases.map(c => {
                  const { state, unlocksAt } = getCaseStatus(c.id, progressByCase)
                  const locked = state === 'locked'
                  const preview = c.report_fr
                    ? c.report_fr.replace(/\n/g, ' ').slice(0, 120) + (c.report_fr.length > 120 ? '…' : '')
                    : null

                  return (
                    <div
                      key={c.id}
                      onClick={() => { if (!locked) router.push(`/quiz/${c.id}`) }}
                      style={{
                        background: locked ? '#fafafa' : 'white',
                        borderRadius: 18,
                        border: `1px solid ${locked ? '#f0f0f0' : '#e4e4e7'}`,
                        boxShadow: locked ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                        padding: '18px 22px',
                        cursor: locked ? 'default' : 'pointer',
                        opacity: locked ? 0.65 : 1,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 18,
                        transition: 'transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={e => {
                        if (!locked) {
                          (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)'
                          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 18px rgba(15,118,110,0.12)'
                        }
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)'
                        ;(e.currentTarget as HTMLDivElement).style.boxShadow = locked ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'
                      }}
                    >
                      {/* Case number */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 14, flexShrink: 0, marginTop: 2,
                        background: locked
                          ? '#e4e4e7'
                          : state === 'done'
                            ? 'linear-gradient(135deg,#16a34a,#0891b2)'
                            : 'linear-gradient(135deg,#0F766E,#0891b2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, color: 'white', fontSize: locked ? 18 : 15,
                      }}>
                        {locked ? '🔒' : c.case_number}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontWeight: 900, fontSize: 15, color: locked ? '#a1a1aa' : '#09090b' }}>
                            Cas #{c.case_number}
                          </span>
                          <span style={{ fontSize: 12, color: '#71717a', fontWeight: 600 }}>
                            {c.age} ans · {c.sex}
                          </span>
                          <DifficultyDots level={c.difficulty} />
                        </div>

                        {preview && !locked && (
                          <div style={{
                            fontSize: 12, color: '#52525b', lineHeight: 1.5,
                            marginBottom: 10, fontStyle: 'italic',
                          }}>
                            {preview}
                          </div>
                        )}

                        {locked && unlocksAt && (
                          <div style={{ fontSize: 12, color: '#f97316', fontWeight: 700, marginBottom: 8 }}>
                            Disponible dans {formatTimeLeft(unlocksAt)}
                          </div>
                        )}

                        {c.tags?.length > 0 && !locked && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                            {c.tags.slice(0, 5).map(tag => (
                              <span key={tag} style={{
                                background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
                                borderRadius: 99, padding: '3px 10px', fontSize: 10, fontWeight: 700,
                              }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Status badge */}
                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginTop: 2 }}>
                        {state === 'done' && (
                          <span style={{
                            background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
                            borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 900,
                          }}>
                            ✓ Réussi
                          </span>
                        )}
                        {state === 'locked' && (
                          <span style={{
                            background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa',
                            borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 900,
                          }}>
                            Cooldown
                          </span>
                        )}
                        {state === 'todo' && (
                          <span style={{
                            background: '#f4f4f5', color: '#71717a', border: '1px solid #e4e4e7',
                            borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700,
                          }}>
                            À faire
                          </span>
                        )}
                        {!locked && <div style={{ color: '#94a3b8', fontSize: 18 }}>›</div>}
                      </div>
                    </div>
                  )
                })}
              </div>

              {cases.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', fontWeight: 700 }}>
                  Aucun cas disponible pour ce module.
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
