'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/ui/Sidebar'
import { supabase } from '@/lib/supabase'

interface PlayerEntry {
  rank: number
  initials: string
  userId: string
  xp: number
  streak: number
  isYou: boolean
}

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7f32']

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<PlayerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [userInitials, setUserInitials] = useState('?')
  const [userXp, setUserXp] = useState(0)
  const [userStreak, setUserStreak] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id ?? null
      if (user?.email) setUserInitials(user.email.slice(0, 2).toUpperCase())

      // Aggregate XP + streak across all modules per user
      const { data, error } = await supabase
        .from('user_module_stats')
        .select('*')

      if (error) {
        console.error('[leaderboard] query error:', error)
        setLoading(false)
        return
      }

      // Group by user_id, sum xp, max streak (defensive access — columns may not exist yet)
      const map = new Map<string, { xp: number; streak: number }>()
      for (const row of data ?? []) {
        const rowXp = (row as Record<string, unknown>).xp as number | undefined ?? 0
        const rowStreak = (row as Record<string, unknown>).current_streak as number | undefined ?? 0
        const cur = map.get(row.user_id)
        if (cur) {
          cur.xp += rowXp
          cur.streak = Math.max(cur.streak, rowStreak)
        } else {
          map.set(row.user_id, { xp: rowXp, streak: rowStreak })
        }
      }

      const sorted: PlayerEntry[] = Array.from(map.entries())
        .sort((a, b) => b[1].xp - a[1].xp)
        .slice(0, 10)
        .map(([userId, stats], i) => ({
          rank: i + 1,
          userId,
          initials: userId.slice(0, 2).toUpperCase(),
          xp: stats.xp,
          streak: stats.streak,
          isYou: userId === uid,
        }))

      setPlayers(sorted)

      const me = sorted.find(p => p.isYou)
      if (me) { setUserXp(me.xp); setUserStreak(me.streak) }

      setLoading(false)
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
          Classement 🏆
        </div>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(160deg,#0F766E 0%,#134e4a 100%)',
          padding: '32px',
          color: 'white',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 44 }}>🏆</div>
          <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8 }}>Classement MEDIQ</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
            Basé sur les XP gagnés en complétant des cas
          </div>
        </div>

        <div style={{ padding: '24px 32px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 48, color: '#71717a', fontWeight: 700 }}>
              Chargement…
            </div>
          )}

          {!loading && players.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              background: 'white',
              borderRadius: 22,
              border: '1px solid #e4e4e7',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
              <div style={{ fontWeight: 900, fontSize: 18, color: '#09090b', marginBottom: 8 }}>
                Classement en construction
              </div>
              <div style={{ fontSize: 14, color: '#71717a', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
                Le classement s'enrichira dès que des utilisateurs auront complété des cas.
                Commencez dès maintenant pour être le premier !
              </div>
            </div>
          )}

          {!loading && players.length > 0 && (
            <>
              {/* Podium (top 3) */}
              {players.length >= 3 && (
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
                  {[players[1], players[0], players[2]].map((p, idx) => {
                    const height = idx === 1 ? 80 : 60
                    const rankIdx = idx === 1 ? 0 : idx === 0 ? 1 : 2
                    return (
                      <div key={p.userId} style={{ textAlign: 'center', flex: '0 0 110px' }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: 18, margin: '0 auto 6px',
                          background: p.isYou
                            ? 'linear-gradient(135deg,#0F766E,#0891b2)'
                            : `${RANK_COLORS[rankIdx]}33`,
                          border: `2px solid ${RANK_COLORS[rankIdx]}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 900, color: p.isYou ? 'white' : '#09090b', fontSize: 16,
                        }}>
                          {p.initials}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 900, color: '#09090b', marginBottom: 2 }}>
                          {p.isYou ? 'Vous' : p.initials}
                        </div>
                        <div style={{ fontSize: 11, color: '#71717a' }}>{p.xp.toLocaleString()} XP</div>
                        <div style={{
                          height,
                          background: RANK_COLORS[rankIdx],
                          borderRadius: '10px 10px 0 0',
                          marginTop: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 900,
                          fontSize: 20,
                        }}>
                          {['🥇', '🥈', '🥉'][rankIdx]}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Full list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {players.map(p => (
                  <div
                    key={p.userId}
                    style={{
                      background: p.isYou ? '#f0fdf4' : 'white',
                      border: `1px solid ${p.isYou ? '#0F766E' : '#e4e4e7'}`,
                      borderRadius: 16,
                      boxShadow: p.isYou ? '0 0 0 2px rgba(15,118,110,0.15)' : '0 1px 6px rgba(0,0,0,0.05)',
                      padding: '13px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                    }}
                  >
                    <div style={{
                      width: 30,
                      fontWeight: 900,
                      fontSize: 15,
                      color: p.rank <= 3 ? RANK_COLORS[p.rank - 1] : '#94a3b8',
                      textAlign: 'center',
                      flexShrink: 0,
                    }}>
                      {p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : p.rank}
                    </div>

                    <div style={{
                      width: 40, height: 40, borderRadius: 14, flexShrink: 0,
                      background: p.isYou
                        ? 'linear-gradient(135deg,#0F766E,#0891b2)'
                        : '#f4f4f5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, color: p.isYou ? 'white' : '#09090b', fontSize: 14,
                    }}>
                      {p.initials}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: 14, color: p.isYou ? '#0F766E' : '#09090b' }}>
                        {p.isYou ? 'Vous' : p.initials}{' '}
                        {p.isYou && <span style={{ fontSize: 11, fontWeight: 700, color: '#0F766E' }}>(vous)</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#71717a', marginTop: 1 }}>
                        🔥 {p.streak} jour{p.streak > 1 ? 's' : ''} de streak
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900, fontSize: 15, color: '#09090b' }}>
                        {p.xp.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' as const }}>XP</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
