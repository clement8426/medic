import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from 'react-native'
import { Star, Flame, Target, Users, MessageSquare } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getUserAllModuleStats } from '../../lib/queries'
import { colors } from '../../constants/colors'

export default function ProfileScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [xp, setXp] = useState(0)
  const [streak, setStreak] = useState(0)
  const [accuracy, setAccuracy] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (!u) return
      setEmail(u.email ?? '')
      getUserAllModuleStats(u.id).then(stats => {
        setXp(stats.reduce((acc, s) => acc + (s.xp ?? 0), 0))
        setStreak(Math.max(0, ...stats.map(s => s.current_streak ?? 0)))
        const totalQ = stats.reduce((acc, s) => acc + (s.total_quizzes_answered ?? 0), 0)
        const totalCorrect = stats.reduce((acc, s) => acc + Math.round((s.correct_rate ?? 0) * (s.total_quizzes_answered ?? 0)), 0)
        setAccuracy(totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0)
      })
    })
  }, [])

  const initials = email ? email.slice(0, 2).toUpperCase() : '??'

  async function handleSignOut() {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            setLoading(true)
            await supabase.auth.signOut()
            setLoading(false)
            router.replace('/')
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.emailText}>{email}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Statistiques</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Star size={16} color="#f59e0b" fill="#f59e0b" style={{ marginBottom: 4 }} />
            <Text style={styles.statValue}>{xp.toLocaleString()}</Text>
            <Text style={styles.statLabel}>XP total</Text>
          </View>
          <View style={styles.statCard}>
            <Flame size={16} color="#f97316" fill="#f97316" style={{ marginBottom: 4 }} />
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Target size={16} color={colors.primary} style={{ marginBottom: 4 }} />
            <Text style={styles.statValue}>{accuracy}%</Text>
            <Text style={styles.statLabel}>Précision</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Compte</Text>

        <View style={styles.card}>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsIcon}>📧</Text>
            <Text style={styles.settingsText}>{email || '—'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/friends')}
        >
          <View style={styles.menuIconSvg}>
            <Users size={20} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={styles.menuText}>Amis</Text>
          <Text style={styles.menuChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/feedback')}
        >
          <View style={styles.menuIconSvg}>
            <MessageSquare size={20} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={styles.menuText}>Donner mon avis</Text>
          <Text style={styles.menuChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuText}>Paramètres</Text>
          <Text style={styles.menuChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/notifications')}
        >
          <Text style={styles.menuIcon}>🔔</Text>
          <Text style={styles.menuText}>Notifications</Text>
          <Text style={styles.menuChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={loading}
        >
          <Text style={styles.signOutText}>
            {loading ? 'Déconnexion...' : '🚪 Se déconnecter'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: 'white',
    fontWeight: '900' as any,
    fontSize: 26,
  },
  emailText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '600' as any,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontWeight: '800' as any,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontWeight: '900' as any,
    fontSize: 20,
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '600' as any,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  settingsText: {
    fontSize: 15,
    color: colors.text,
  },
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  menuIconSvg: {
    width: 34,
    marginRight: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700' as any,
    color: colors.text,
  },
  menuChevron: {
    fontSize: 22,
    color: colors.textMuted,
  },
  signOutButton: {
    backgroundColor: colors.errorBg,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  signOutText: {
    color: colors.errorText,
    fontWeight: '700' as any,
    fontSize: 16,
  },
})
