'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/ui/Sidebar'
import { supabase } from '@/lib/supabase'
import { getActiveModules, getCaseCountsByModule, getUserAllModuleStats } from '@/lib/queries'
import { ModuleIcon } from '@/components/ui/ModuleIcon'
import { Star, Flame, Target } from 'lucide-react'
import type { Module, UserModuleStats } from '@/lib/types'

export default function ProfilePage() {
  const [email, setEmail] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [initials, setInitials] = useState('?')
  const [modules, setModules] = useState<Module[]>([])
  const [caseCounts, setCaseCounts] = useState<Record<string, number>>({})
  const [moduleStats, setModuleStats] = useState<Record<string, UserModuleStats>>({})
  const [loading, setLoading] = useState(true)
  const [xp, setXp] = useState(0)
  const [streak, setStreak] = useState(0)
  const [accuracy, setAccuracy] = useState(0)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser()
      const u = data?.user
      if (u) {
        setEmail(u.email ?? '')
        setInitials((u.email ?? '?').slice(0, 2).toUpperCase())
        setCreatedAt(u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '')

        const [mods, stats] = await Promise.all([
          getActiveModules(),
          getUserAllModuleStats(u.id),
        ])
        setModules(mods)
        const counts = await getCaseCountsByModule(mods.map(m => m.id))
        setCaseCounts(counts)

        const statsMap: Record<string, UserModuleStats> = {}
        for (const s of stats) statsMap[s.module_id] = s
        setModuleStats(statsMap)

        const totalXp = stats.reduce((acc, s) => acc + (s.xp ?? 0), 0)
        setXp(totalXp)
        setStreak(Math.max(0, ...stats.map(s => s.current_streak ?? 0)))

        const totalQ = stats.reduce((acc, s) => acc + (s.total_quizzes_answered ?? 0), 0)
        const totalCorrect = stats.reduce((acc, s) => acc + Math.round((s.correct_rate ?? 0) * (s.total_quizzes_answered ?? 0)), 0)
        setAccuracy(totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f7f8' }}>
      <Sidebar xp={xp} streak={streak} initials={initials} />

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
          Mon Profil
        </div>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(160deg,#0F766E 0%,#134e4a 100%)',
          padding: '36px 32px',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 24,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 28, color: 'white',
              border: '3px solid rgba(255,255,255,0.3)',
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 20 }}>{email || '…'}</div>
              {createdAt && (
                <div style={{ fontSize: 13, color: 'rgba(167,243,208,0.8)', marginTop: 4 }}>
                  Membre depuis le {createdAt}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Stats grid */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 14 }}>
              STATISTIQUES
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {([
                { label: 'XP Total', value: xp.toLocaleString(), Icon: Star, iconColor: '#f59e0b' },
                { label: 'Streak', value: `${streak} j`, Icon: Flame, iconColor: '#f97316' },
                { label: 'Précision', value: `${accuracy}%`, Icon: Target, iconColor: '#0F766E' },
              ] as const).map(stat => (
                <div key={stat.label} style={{
                  background: 'white',
                  borderRadius: 18,
                  border: '1px solid #e4e4e7',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  padding: '18px 20px',
                  textAlign: 'center',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                    <stat.Icon size={18} color={stat.iconColor} strokeWidth={2} />
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 22, color: '#09090b', marginBottom: 3 }}>{stat.value}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modules progression */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 14 }}>
              PROGRESSION PAR MODULE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loading ? (
                <div style={{ color: '#71717a', fontWeight: 700, padding: '12px 0' }}>Chargement…</div>
              ) : modules.filter(mod => (caseCounts[mod.id] ?? 0) > 0).map(mod => {
                const count = caseCounts[mod.id] ?? 0
                const completed = moduleStats[mod.id]?.cases_completed ?? 0
                const pct = count > 0 ? Math.min(100, Math.round((completed / count) * 100)) : 0
                return (
                  <div key={mod.id} style={{
                    background: 'white',
                    borderRadius: 16,
                    border: '1px solid #e4e4e7',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}>
                    <ModuleIcon icon={mod.icon} size={20} color="#0F766E" strokeWidth={1.75} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: 13, color: '#09090b', marginBottom: 6 }}>
                        {mod.name_fr}
                      </div>
                      <div style={{ height: 5, background: '#f4f4f5', borderRadius: 99 }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: 'linear-gradient(135deg,#0F766E,#0891b2)',
                          borderRadius: 99, transition: 'width 0.4s',
                        }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#0F766E', minWidth: 40, textAlign: 'right' }}>
                      {completed} / {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
