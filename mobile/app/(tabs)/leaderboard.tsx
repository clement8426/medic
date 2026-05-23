import { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { colors } from '../../constants/colors'

interface PlayerEntry {
  rank: number
  initials: string
  userId: string
  xp: number
  streak: number
  isYou: boolean
}

const RANK_CONFIG: Record<number, { bg: string; text: string; emoji: string }> = {
  1: { bg: '#FFF8E1', text: '#B8860B', emoji: '🥇' },
  2: { bg: '#F5F5F5', text: '#757575', emoji: '🥈' },
  3: { bg: '#FFF3E0', text: '#C65A00', emoji: '🥉' },
}

export default function LeaderboardScreen() {
  const [players, setPlayers] = useState<PlayerEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id ?? null

    const { data, error } = await supabase
      .from('user_module_stats')
      .select('*')

    if (error) {
      console.error('[leaderboard] error:', error)
      setLoading(false)
      return
    }

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
    setLoading(false)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Classement</Text>
        <Text style={styles.headerSub}>XP cumulés sur tous les modules</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : players.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>Classement en construction</Text>
          <Text style={styles.emptyBody}>
            Complétez des cas pour apparaître ici en premier !
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {players.map(player => {
            const config = RANK_CONFIG[player.rank]
            const isTop3 = player.rank <= 3

            return (
              <View
                key={player.userId}
                style={[
                  styles.playerCard,
                  isTop3 && { backgroundColor: config.bg },
                  player.isYou && styles.playerCardYou,
                ]}
              >
                <View style={styles.rankContainer}>
                  {isTop3 ? (
                    <Text style={styles.rankEmoji}>{config.emoji}</Text>
                  ) : (
                    <Text style={[styles.rankNumber, { color: colors.textMuted }]}>
                      {player.rank}
                    </Text>
                  )}
                </View>

                <View style={[
                  styles.initialsCircle,
                  isTop3 && { borderColor: config.text },
                  player.isYou && styles.initialsCircleYou,
                ]}>
                  <Text style={[
                    styles.initialsText,
                    isTop3 && { color: config.text },
                    player.isYou && styles.initialsTextYou,
                  ]}>
                    {player.initials}
                  </Text>
                </View>

                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, isTop3 && { color: config.text }, player.isYou && { color: colors.primary }]}>
                    {player.isYou ? 'Vous' : player.initials}
                    {player.isYou && <Text style={styles.youTag}> (vous)</Text>}
                  </Text>
                  {player.streak > 0 && (
                    <Text style={styles.streakText}>🔥 {player.streak} jour{player.streak > 1 ? 's' : ''}</Text>
                  )}
                </View>

                <View style={styles.xpContainer}>
                  <Text style={[styles.xpValue, isTop3 && { color: config.text }, player.isYou && { color: colors.primary }]}>
                    {player.xp.toLocaleString()}
                  </Text>
                  <Text style={styles.xpLabel}>XP</Text>
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900' as any,
    color: 'white',
  },
  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900' as any,
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  playerCard: {
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  playerCardYou: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
  },
  rankEmoji: {
    fontSize: 22,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '900' as any,
  },
  initialsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  initialsCircleYou: {
    backgroundColor: colors.primary,
  },
  initialsText: {
    fontWeight: '900' as any,
    fontSize: 14,
    color: colors.textSecondary,
  },
  initialsTextYou: {
    color: 'white',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontWeight: '700' as any,
    fontSize: 15,
    color: colors.text,
  },
  youTag: {
    fontSize: 12,
    fontWeight: '600' as any,
    color: colors.primary,
  },
  streakText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  xpContainer: {
    alignItems: 'flex-end',
  },
  xpValue: {
    fontWeight: '900' as any,
    fontSize: 16,
    color: colors.primary,
  },
  xpLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600' as any,
  },
})
