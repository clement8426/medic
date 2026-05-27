'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { ModuleIcon } from '@/components/ui/ModuleIcon'
import { supabase } from '@/lib/supabase'
import {
  getReviewQueue, getCaseById,
  getActiveModules, getCaseCountsByModule, getModuleQuizCounts, getUserAllModuleStats,
} from '@/lib/queries'
import type { UserProgress, Case, Module, UserModuleStats } from '@/lib/types'
import { getModuleName } from '@/lib/types'
import { useI18n } from '@/lib/i18n'

interface ReviewItem {
  progress: UserProgress
  caseData: Case | null
}

export default function ReviewPage() {
  const router = useRouter()
  const { lang } = useI18n()
  const [items, setItems] = useState<ReviewItem[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [caseCounts, setCaseCounts] = useState<Record<string, number>>({})
  const [quizCounts, setQuizCounts] = useState<Record<string, number>>({})
  const [moduleStats, setModuleStats] = useState<Record<string, UserModuleStats>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userInitials, setUserInitials] = useState('?')
  const [userXp, setUserXp] = useState(0)
  const [userStreak, setUserStreak] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        setUserInitials((user.email ?? '?').slice(0, 2).toUpperCase())

        const [queue, mods] = await Promise.all([
          getReviewQueue(user.id),
          getActiveModules(),
        ])

        const classicIds = mods.filter(m => m.category === 'classic').map(m => m.id)
        const [counts, qCounts, stats] = await Promise.all([
          getCaseCountsByModule(mods.map(x => x.id)),
          getModuleQuizCounts(classicIds),
          getUserAllModuleStats(user.id),
        ])
        setModules(mods)
        setCaseCounts(counts)
        setQuizCounts(qCounts)

        const statsMap: Record<string, UserModuleStats> = {}
        for (const s of stats) statsMap[s.module_id] = s
        setModuleStats(statsMap)
        setUserXp(stats.reduce((acc, s) => acc + (s.xp ?? 0), 0))
        setUserStreak(Math.max(0, ...stats.map(s => s.current_streak ?? 0)))

        const uniqueCaseIds = [...new Set(queue.map(p => p.case_id))]
        const caseMap: Record<string, Case | null> = {}
        await Promise.all(uniqueCaseIds.map(async cid => {
          caseMap[cid] = await getCaseById(cid)
        }))

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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#09090b' }}>Révision</div>
          {!loading && (
            <div style={{
              background: items.length > 0 ? '#fef9c3' : '#f0fdf4',
              border: `1px solid ${items.length > 0 ? '#fde047' : '#bbf7d0'}`,
              color: items.length > 0 ? '#854d0e' : '#166534',
              borderRadius: 99,
              padding: '4px 14px',
              fontSize: 12,
              fontWeight: 900,
            }}>
              {items.length > 0 ? `${items.length} à réviser` : 'À jour ✓'}
            </div>
          )}
        </div>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(160deg,#0F766E 0%,#134e4a 100%)',
          padding: '28px 32px',
          color: 'white',
        }}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>
            {loading ? '…' : items.length > 0
              ? `${items.length} cas à revoir aujourd'hui`
              : 'Tout est à jour ✨'}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
            {items.length > 0
              ? 'Terminez vos révisions avant de continuer'
              : 'Profitez-en pour avancer sur de nouveaux cas'}
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
              fontWeight: 700, marginBottom: 24,
            }}>
              {error}
            </div>
          )}

          {/* Review queue */}
          {!loading && items.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 14 }}>
                {items.length} cas à réviser
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                        {caseData ? `Cas #${caseData.case_number}` : 'Cas'}
                        {caseData ? ` — ${caseData.age} ans, ${caseData.sex === 'Homme' ? 'H' : 'F'}` : ''}
                      </div>
                      <div style={{ fontSize: 12, color: '#71717a' }}>
                        Intervalle : {progress.interval_days}j · Facilité : {progress.ease_factor?.toFixed(1)}
                      </div>
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
                      Réviser
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modules section — always shown */}
          {!loading && modules.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 14 }}>
                Continuer l'apprentissage
              </div>

              {[
                { key: 'clinical', label: 'Cas Cliniques' },
                { key: 'classic', label: 'Révision Classique' },
              ].map(section => {
                const sectionMods = modules.filter(m => (m.category ?? 'clinical') === section.key)
                if (sectionMods.length === 0) return null
                return (
                  <div key={section.key} style={{ marginBottom: 32 }}>
                    <div style={{ fontWeight: 900, fontSize: 12, color: '#71717a', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 12 }}>
                      {section.label}
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))',
                      gap: 14,
                    }}>
                      {sectionMods.map(mod => {
                        const count = caseCounts[mod.id] ?? 0
                        const isClassic = mod.category === 'classic'
                        const hasContent = isClassic ? (quizCounts[mod.id] ?? 0) > 0 : count > 0
                        const comingSoon = !hasContent
                        const completed = moduleStats[mod.id]?.cases_completed ?? 0
                        const progress = count > 0 ? Math.min(100, Math.round((completed / count) * 100)) : 0

                        function handleClick() {
                          if (comingSoon) return
                          if (isClassic) router.push(`/module/${mod.slug}/classic`)
                          else router.push(`/module/${mod.slug}`)
                        }

                        return (
                          <div
                            key={mod.id}
                            onClick={handleClick}
                            style={{
                              background: comingSoon ? '#fafafa' : 'white',
                              borderRadius: 18,
                              border: '1px solid #e4e4e7',
                              boxShadow: comingSoon ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                              padding: '18px 18px 14px',
                              cursor: comingSoon ? 'default' : 'pointer',
                              opacity: comingSoon ? 0.5 : 1,
                              display: 'flex',
                              gap: 14,
                              alignItems: 'flex-start',
                              transition: 'transform 0.15s, box-shadow 0.15s',
                            }}
                            onMouseEnter={e => {
                              if (!comingSoon) {
                                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
                                ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(15,118,110,0.12)'
                              }
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                              ;(e.currentTarget as HTMLDivElement).style.boxShadow = comingSoon ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'
                            }}
                          >
                            <div style={{
                              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                              background: comingSoon ? '#f4f4f5' : isClassic
                                ? 'linear-gradient(135deg,#0891b222,#6366f122)'
                                : 'linear-gradient(135deg,#0F766E22,#0891b222)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <ModuleIcon
                                icon={mod.icon}
                                size={22}
                                color={comingSoon ? '#a1a1aa' : isClassic ? '#0891b2' : '#0F766E'}
                                strokeWidth={1.75}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                                <div style={{ fontWeight: 900, fontSize: 14, color: comingSoon ? '#a1a1aa' : '#09090b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                                  {getModuleName(mod, lang)}
                                </div>
                                <span style={{
                                  flexShrink: 0,
                                  padding: '2px 8px', borderRadius: 99,
                                  fontSize: 10, fontWeight: 900,
                                  textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                                  background: comingSoon ? '#f4f4f5' : isClassic ? '#f0f9ff' : '#f0fdf4',
                                  color: comingSoon ? '#a1a1aa' : isClassic ? '#0c4a6e' : '#166534',
                                  border: `1px solid ${comingSoon ? '#e4e4e7' : isClassic ? '#bae6fd' : '#bbf7d0'}`,
                                }}>
                                  {comingSoon ? 'Bientôt' : isClassic ? 'Classique' : `${count} cas`}
                                </span>
                              </div>
                              {!comingSoon && !isClassic && (
                                <div>
                                  <div style={{ height: 4, background: '#f4f4f5', borderRadius: 99, marginTop: 8 }}>
                                    <div style={{
                                      height: '100%', width: `${progress}%`,
                                      background: 'linear-gradient(135deg,#0F766E,#0891b2)',
                                      borderRadius: 99,
                                    }} />
                                  </div>
                                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                    {completed} / {count} complétés
                                  </div>
                                </div>
                              )}
                              {isClassic && !comingSoon && (
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', marginTop: 6 }}>
                                  Réviser
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
