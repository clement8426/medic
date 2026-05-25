'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { supabase } from '@/lib/supabase'
import { getActiveModules, getCaseCountsByModule, getModuleQuizCounts, getUserAllModuleStats } from '@/lib/queries'
import { ModuleIcon } from '@/components/ui/ModuleIcon'
import { Flame, Star, Target } from 'lucide-react'
import type { Module, UserModuleStats } from '@/lib/types'

export default function DashboardPage() {
  const router = useRouter()
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
        const { data: userData } = await supabase.auth.getUser()
        const email = userData?.user?.email ?? ''
        if (email) setUserInitials(email.slice(0, 2).toUpperCase())

        const mods = await getActiveModules()
        const classicIds = mods.filter(m => m.category === 'classic').map(m => m.id)
        const [counts, qCounts] = await Promise.all([
          getCaseCountsByModule(mods.map(x => x.id)),
          getModuleQuizCounts(classicIds),
        ])
        setModules(mods)
        setCaseCounts(counts)
        setQuizCounts(qCounts)

        if (userData?.user?.id) {
          const stats = await getUserAllModuleStats(userData.user.id)
          const statsMap: Record<string, UserModuleStats> = {}
          for (const s of stats) statsMap[s.module_id] = s
          setModuleStats(statsMap)
          setUserXp(stats.reduce((acc, s) => acc + (s.xp ?? 0), 0))
          setUserStreak(Math.max(0, ...stats.map(s => s.current_streak ?? 0)))
        }
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
          <div style={{ fontWeight: 900, fontSize: 20, color: '#09090b' }}>
            Tableau de bord
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: 99,
              padding: '4px 14px',
              fontWeight: 900,
              fontSize: 13,
              color: '#c2410c',
            }}>
              {userStreak} jours
            </div>
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 99,
              padding: '4px 14px',
              fontWeight: 900,
              fontSize: 13,
              color: '#166534',
            }}>
              {userXp.toLocaleString()} XP
            </div>
          </div>
        </div>

        {/* Gradient header */}
        <div style={{
          background: 'linear-gradient(160deg,#0F766E 0%,#134e4a 100%)',
          padding: '36px 32px',
          color: 'white',
        }}>
          <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(167,243,208,0.7)', marginBottom: 8 }}>
            MEDIQ — Formation médicale
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>
            Bonjour 👋
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', marginBottom: 28 }}>
            Continuez votre progression quotidienne
          </div>

          <div style={{ display: 'flex', gap: 20 }}>
            {([
              { label: 'Streak', value: `${userStreak} jours`, Icon: Flame },
              { label: 'XP Total', value: userXp.toLocaleString(), Icon: Star },
              { label: 'Précision', value: '—', Icon: Target },
            ] as const).map(stat => (
              <div key={stat.label} style={{
                background: 'rgba(255,255,255,0.12)',
                borderRadius: 16,
                padding: '16px 22px',
                minWidth: 110,
                backdropFilter: 'blur(8px)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <stat.Icon size={14} color="rgba(167,243,208,0.8)" strokeWidth={2} />
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{stat.value}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(167,243,208,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modules grid */}
        <div style={{ padding: '32px' }}>
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

          {[
            { key: 'clinical', label: 'Cas Cliniques', desc: 'Cas réels avec image, contexte patient et QCM basés sur le cas' },
            { key: 'classic', label: 'Révision Classique', desc: 'QCM thématiques sans fiche patient — pharmacologie, biochimie, anatomie...' },
          ].map(section => {
            const sectionMods = modules.filter(m => (m.category ?? 'clinical') === section.key)
            if (!loading && sectionMods.length === 0) return null
            return (
              <div key={section.key} style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                  <div style={{ fontWeight: 900, fontSize: 12, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {section.label}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: section.key === 'clinical' ? '#f0fdf4' : '#f0f9ff',
                    color: section.key === 'clinical' ? '#166534' : '#0c4a6e',
                    border: `1px solid ${section.key === 'clinical' ? '#bbf7d0' : '#bae6fd'}`,
                    textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                  }}>
                    {sectionMods.length} modules
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#71717a', marginBottom: 18 }}>{section.desc}</div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
                  gap: 20,
                }}>
                  {sectionMods.map(mod => {
                    const count = caseCounts[mod.id] ?? 0
                    const isClassic = mod.category === 'classic'
                    const hasQuestions = isClassic ? (quizCounts[mod.id] ?? 0) > 0 : count > 0
                    const comingSoon = !hasQuestions
                    const completed = moduleStats[mod.id]?.cases_completed ?? 0
                    const progress = count > 0 ? Math.min(100, Math.round((completed / count) * 100)) : 0

                    function handleClick() {
                      if (comingSoon) return
                      if (isClassic) {
                        router.push(`/module/${mod.slug}/classic`)
                      } else {
                        router.push(`/module/${mod.slug}`)
                      }
                    }

                    return (
                      <div
                        key={mod.id}
                        onClick={handleClick}
                        style={{
                          background: comingSoon ? '#fafafa' : 'white',
                          borderRadius: 22,
                          border: '1px solid #e4e4e7',
                          boxShadow: comingSoon ? 'none' : '0 2px 12px rgba(0,0,0,0.08)',
                          padding: '22px 22px 18px',
                          cursor: comingSoon ? 'default' : 'pointer',
                          opacity: comingSoon ? 0.55 : 1,
                          transition: 'transform 0.15s, box-shadow 0.15s',
                          position: 'relative',
                        }}
                        onMouseEnter={e => {
                          if (!comingSoon) {
                            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
                            ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(15,118,110,0.15)'
                          }
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                          ;(e.currentTarget as HTMLDivElement).style.boxShadow = comingSoon ? 'none' : '0 2px 12px rgba(0,0,0,0.08)'
                        }}
                      >
                        {/* Badge */}
                        <div style={{ position: 'absolute', top: 16, right: 16 }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 99,
                            fontSize: 10, fontWeight: 900,
                            textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                            background: comingSoon ? '#f4f4f5' : isClassic ? '#f0f9ff' : '#f0fdf4',
                            color: comingSoon ? '#a1a1aa' : isClassic ? '#0c4a6e' : '#166534',
                            border: `1px solid ${comingSoon ? '#e4e4e7' : isClassic ? '#bae6fd' : '#bbf7d0'}`,
                          }}>
                            {comingSoon ? 'À venir' : isClassic ? 'Classique' : `${count} cas`}
                          </span>
                        </div>

                        <div style={{
                          width: 52, height: 52, borderRadius: 16,
                          background: comingSoon ? '#f4f4f5' : isClassic
                            ? 'linear-gradient(135deg,#0891b222,#6366f122)'
                            : 'linear-gradient(135deg,#0F766E22,#0891b222)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginBottom: 14,
                        }}>
                          <ModuleIcon
                            icon={mod.icon}
                            size={26}
                            color={comingSoon ? '#a1a1aa' : isClassic ? '#0891b2' : '#0F766E'}
                            strokeWidth={1.75}
                          />
                        </div>
                        <div style={{ fontWeight: 900, fontSize: 16, color: comingSoon ? '#a1a1aa' : '#09090b', marginBottom: 4 }}>
                          {mod.name_fr}
                        </div>
                        <div style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.4 }}>
                          {comingSoon ? 'Contenu en cours de préparation' : (mod.description_fr?.slice(0, 80) + (mod.description_fr?.length > 80 ? '…' : ''))}
                        </div>

                        {/* Progress bar (clinical only) */}
                        {!comingSoon && !isClassic && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                                Progression
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 900, color: '#0F766E' }}>
                                {completed} / {count}
                              </span>
                            </div>
                            <div style={{ height: 6, background: '#f4f4f5', borderRadius: 99 }}>
                              <div style={{
                                height: '100%', width: `${progress}%`,
                                background: 'linear-gradient(135deg,#0F766E,#0891b2)',
                                borderRadius: 99, transition: 'width 0.4s',
                              }} />
                            </div>
                          </div>
                        )}

                        {/* Classic CTA */}
                        {isClassic && !comingSoon && (
                          <div style={{
                            fontSize: 11, fontWeight: 700, color: '#0891b2',
                            textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                          }}>
                            Réviser →
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
