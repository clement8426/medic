'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/ui/Sidebar'
import { supabase } from '@/lib/supabase'

const TITLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  medecin:       { label: 'Médecin',         color: '#166534', bg: '#f0fdf4' },
  infirmier:     { label: 'Infirmier(ère)',   color: '#0c4a6e', bg: '#f0f9ff' },
  sage_femme:    { label: 'Sage-femme',       color: '#4c1d95', bg: '#faf5ff' },
  aide_soignant: { label: 'Aide-soignant(e)', color: '#9a3412', bg: '#fff7ed' },
  etudiant:      { label: 'Étudiant(e)',      color: '#374151', bg: '#f9fafb' },
  autre:         { label: 'Autre',            color: '#71717a', bg: '#fafafa' },
}

interface PlayerEntry {
  rank: number
  label: string
  title: string | null
  xp: number
  streak: number
  isYou: boolean
  avatarUrl: string | null
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
      if (!user) { setLoading(false); return }
      if (user.email) setUserInitials(user.email.slice(0, 2).toUpperCase())

      const { data, error } = await supabase.rpc('get_leaderboard')
      if (error) { console.error(error); setLoading(false); return }

      type LeaderRow = { user_id: string; display_name: string; title: string | null; is_anonymous: boolean; total_xp: number; max_streak: number; avatar_url: string | null }
      const sorted: PlayerEntry[] = (data as LeaderRow[] ?? []).map((row, i) => ({
        rank: i + 1,
        label: row.is_anonymous ? 'Anonyme' : (row.display_name ?? '?'),
        title: row.is_anonymous ? null : (row.title ?? null),
        xp: row.total_xp ?? 0,
        streak: row.max_streak ?? 0,
        isYou: row.user_id === user.id,
        avatarUrl: row.is_anonymous ? null : (row.avatar_url ?? null),
      }))

      const me = sorted.find(p => p.isYou)
      setUserXp(me?.xp ?? 0)
      setUserStreak(me?.streak ?? 0)

      setPlayers(sorted)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f7f8' }}>
      <Sidebar xp={userXp} streak={userStreak} initials={userInitials} />

      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{
          background: 'white',
          borderBottom: '1px solid #e4e4e7',
          padding: '16px 32px',
          position: 'sticky', top: 0, zIndex: 10,
          fontWeight: 900, fontSize: 18, color: '#09090b',
        }}>
          Classement 🏆
        </div>

        <div style={{
          background: 'linear-gradient(160deg,#0F766E 0%,#134e4a 100%)',
          padding: '32px', color: 'white', textAlign: 'center',
        }}>
          <div style={{ fontSize: 44 }}>🏆</div>
          <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8 }}>Classement global</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
            Tous les utilisateurs — classés par XP
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
              textAlign: 'center', padding: '48px 24px',
              background: 'white', borderRadius: 22,
              border: '1px solid #e4e4e7', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
              <div style={{ fontWeight: 900, fontSize: 18, color: '#09090b', marginBottom: 8 }}>
                Classement en construction
              </div>
              <div style={{ fontSize: 14, color: '#71717a', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
                Complétez des cas pour apparaître dans le classement.
              </div>
            </div>
          )}

          {!loading && players.length > 0 && (
            <>
              {players.length >= 3 && (
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginBottom: 28 }}>
                  {[players[1], players[0], players[2]].map((p, idx) => {
                    const height = idx === 1 ? 80 : 60
                    const rankIdx = idx === 1 ? 0 : idx === 0 ? 1 : 2
                    const initial = p.label === 'Anonyme' ? '?' : p.label.slice(0, 1).toUpperCase()
                    return (
                      <div key={p.rank} style={{ textAlign: 'center', flex: '0 0 110px' }}>
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt={p.label} style={{ width: 52, height: 52, borderRadius: 18, objectFit: 'cover', margin: '0 auto 6px', border: `2px solid ${RANK_COLORS[rankIdx]}`, display: 'block' }} />
                        ) : (
                          <div style={{
                            width: 52, height: 52, borderRadius: 18, margin: '0 auto 6px',
                            background: p.isYou ? 'linear-gradient(135deg,#0F766E,#0891b2)' : `${RANK_COLORS[rankIdx]}33`,
                            border: `2px solid ${RANK_COLORS[rankIdx]}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 900, color: p.isYou ? 'white' : '#09090b', fontSize: 20,
                          }}>
                            {initial}
                          </div>
                        )}
                        <div style={{ fontSize: 12, fontWeight: 900, color: '#09090b', marginBottom: 2 }}>
                          {p.isYou ? 'Vous' : p.label}
                        </div>
                        <div style={{ fontSize: 11, color: '#71717a' }}>{p.xp.toLocaleString()} XP</div>
                        <div style={{
                          height, background: RANK_COLORS[rankIdx],
                          borderRadius: '10px 10px 0 0', marginTop: 6,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 900, fontSize: 20,
                        }}>
                          {['🥇', '🥈', '🥉'][rankIdx]}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {players.map(p => {
                  const initial = p.label === 'Anonyme' ? '?' : p.label.slice(0, 1).toUpperCase()
                  return (
                    <div key={p.rank} style={{
                      background: p.isYou ? '#f0fdf4' : 'white',
                      border: `1px solid ${p.isYou ? '#0F766E' : '#e4e4e7'}`,
                      borderRadius: 16,
                      boxShadow: p.isYou ? '0 0 0 2px rgba(15,118,110,0.15)' : '0 1px 6px rgba(0,0,0,0.05)',
                      padding: '13px 18px',
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                      <div style={{
                        width: 30, fontWeight: 900, fontSize: 15,
                        color: p.rank <= 3 ? RANK_COLORS[p.rank - 1] : '#94a3b8',
                        textAlign: 'center', flexShrink: 0,
                      }}>
                        {p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : p.rank}
                      </div>

                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.label} style={{ width: 40, height: 40, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{
                          width: 40, height: 40, borderRadius: 14, flexShrink: 0,
                          background: p.isYou ? 'linear-gradient(135deg,#0F766E,#0891b2)' : '#f4f4f5',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 900, color: p.isYou ? 'white' : '#09090b', fontSize: 16,
                        }}>
                          {initial}
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' as const }}>
                          <span style={{ fontWeight: 900, fontSize: 14, color: p.isYou ? '#0F766E' : '#09090b' }}>
                            {p.isYou ? 'Vous' : p.label}
                          </span>
                          {p.title && TITLE_LABELS[p.title] && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                              background: TITLE_LABELS[p.title].bg,
                              color: TITLE_LABELS[p.title].color,
                              border: `1px solid ${TITLE_LABELS[p.title].color}33`,
                            }}>
                              {TITLE_LABELS[p.title].label}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>
                          🔥 {p.streak} jour{p.streak !== 1 ? 's' : ''} de streak
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 900, fontSize: 15, color: '#09090b' }}>
                          {p.xp.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' as const }}>XP</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
