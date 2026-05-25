import { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, Platform, ActivityIndicator, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { colors } from '../../constants/colors'
import type { ProfTitle } from '../../lib/types'

const TITLE_LABELS: Record<ProfTitle, { label: string; color: string; bg: string }> = {
  medecin:       { label: 'Médecin',         color: '#166534', bg: '#f0fdf4' },
  infirmier:     { label: 'Infirmier(ère)',   color: '#0c4a6e', bg: '#f0f9ff' },
  sage_femme:    { label: 'Sage-femme',       color: '#4c1d95', bg: '#faf5ff' },
  aide_soignant: { label: 'Aide-soignant(e)', color: '#9a3412', bg: '#fff7ed' },
  etudiant:      { label: 'Étudiant(e)',      color: '#374151', bg: '#f9fafb' },
  autre:         { label: 'Autre',            color: '#71717a', bg: '#fafafa' },
}

interface PlayerEntry {
  rank: number
  userId: string
  label: string
  title: ProfTitle | null
  avatarUrl: string | null
  xp: number
  streak: number
  isYou: boolean
}

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7f32']

export default function LeaderboardScreen() {
  const [players, setPlayers] = useState<PlayerEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id ?? null

    const { data, error } = await supabase.rpc('get_leaderboard')
    if (error) { console.error('[leaderboard]', error); setLoading(false); return }

    type LeaderRow = { user_id: string; display_name: string; title: string | null; is_anonymous: boolean; avatar_url: string | null; total_xp: number; max_streak: number }
    const sorted: PlayerEntry[] = (data as LeaderRow[] ?? []).map((row, i) => ({
      rank: i + 1,
      userId: row.user_id,
      label: row.is_anonymous ? 'Anonyme' : (row.display_name ?? '?'),
      title: row.is_anonymous ? null : (row.title as ProfTitle | null),
      avatarUrl: row.is_anonymous ? null : (row.avatar_url ?? null),
      xp: row.total_xp ?? 0,
      streak: row.max_streak ?? 0,
      isYou: row.user_id === uid,
    }))

    setPlayers(sorted)
    setLoading(false)
  }

  function Avatar({ p, size = 40 }: { p: PlayerEntry; size?: number }) {
    const initial = p.label === 'Anonyme' ? '?' : p.label.slice(0, 1).toUpperCase()
    const radius = size / 2
    if (p.avatarUrl) return (
      <Image source={{ uri: p.avatarUrl }} style={{ width: size, height: size, borderRadius: radius }} />
    )
    return (
      <View style={{
        width: size, height: size, borderRadius: radius,
        backgroundColor: p.isYou ? colors.primary : '#f1f5f9',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontWeight: '900', fontSize: size * 0.38, color: p.isYou ? 'white' : colors.textSecondary }}>
          {initial}
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Classement 🏆</Text>
        <Text style={s.headerSub}>Tous les utilisateurs — classés par XP</Text>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : players.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyEmoji}>🌱</Text>
          <Text style={s.emptyTitle}>Classement en construction</Text>
          <Text style={s.emptyBody}>Complétez des cas pour apparaître ici !</Text>
        </View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Podium top 3 */}
          {players.length >= 3 && (
            <View style={s.podium}>
              {[players[1], players[0], players[2]].map((p, idx) => {
                const rankIdx = idx === 1 ? 0 : idx === 0 ? 1 : 2
                const podiumH = idx === 1 ? 72 : 52
                return (
                  <View key={p.rank} style={s.podiumItem}>
                    <Avatar p={p} size={48} />
                    <Text style={s.podiumName} numberOfLines={1}>{p.isYou ? 'Vous' : p.label}</Text>
                    <Text style={s.podiumXp}>{p.xp.toLocaleString()} XP</Text>
                    <View style={[s.podiumBar, { height: podiumH, backgroundColor: RANK_COLORS[rankIdx] }]}>
                      <Text style={s.podiumBarEmoji}>{['🥇', '🥈', '🥉'][rankIdx]}</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          )}

          {/* Full list */}
          {players.map(p => {
            const titleMeta = p.title ? TITLE_LABELS[p.title] : null
            return (
              <View
                key={p.rank}
                style={[
                  s.card,
                  p.isYou && s.cardYou,
                ]}
              >
                <Text style={[s.rankText, p.rank <= 3 && { color: RANK_COLORS[p.rank - 1] }]}>
                  {p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : p.rank}
                </Text>

                <View style={{ marginHorizontal: 10 }}>
                  <Avatar p={p} size={40} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <Text style={[s.playerName, p.isYou && { color: colors.primary }]}>
                      {p.isYou ? 'Vous' : p.label}
                    </Text>
                    {titleMeta && (
                      <View style={[s.titleBadge, { backgroundColor: titleMeta.bg }]}>
                        <Text style={[s.titleBadgeText, { color: titleMeta.color }]}>{titleMeta.label}</Text>
                      </View>
                    )}
                  </View>
                  {p.streak > 0 && (
                    <Text style={s.streakText}>🔥 {p.streak} jour{p.streak > 1 ? 's' : ''}</Text>
                  )}
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.xpValue, p.isYou && { color: colors.primary }]}>{p.xp.toLocaleString()}</Text>
                  <Text style={s.xpLabel}>XP</Text>
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.primary, padding: 20, paddingTop: Platform.OS === 'ios' ? 12 : 16 },
  headerTitle: { fontSize: 22, fontWeight: '900' as any, color: 'white' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '900' as any, color: colors.text, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, marginBottom: 20 },
  podiumItem: { alignItems: 'center', width: 100 },
  podiumName: { fontSize: 11, fontWeight: '900' as any, color: colors.text, marginTop: 6, marginBottom: 2, textAlign: 'center' },
  podiumXp: { fontSize: 10, color: colors.textMuted, marginBottom: 4 },
  podiumBar: { width: '100%', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  podiumBarEmoji: { fontSize: 20 },
  card: { backgroundColor: 'white', borderRadius: 18, padding: 13, marginBottom: 9, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardYou: { borderWidth: 2, borderColor: colors.primary, backgroundColor: '#f0fdf4' },
  rankText: { width: 32, textAlign: 'center', fontSize: 15, fontWeight: '900' as any, color: '#94a3b8' },
  playerName: { fontWeight: '700' as any, fontSize: 15, color: colors.text },
  titleBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  titleBadgeText: { fontSize: 10, fontWeight: '700' as any },
  streakText: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  xpValue: { fontWeight: '900' as any, fontSize: 16, color: colors.primary },
  xpLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' as any },
})
