import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getReviewQueue } from '../../lib/queries'
import type { UserProgress } from '../../lib/types'
import { colors } from '../../constants/colors'

export default function ReviewScreen() {
  const router = useRouter()
  const [queue, setQueue] = useState<UserProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQueue()
  }, [])

  async function loadQueue() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const items = await getReviewQueue(user.id)
    setQueue(items)
    setLoading(false)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Révision du jour</Text>
        <Text style={styles.headerSub}>
          {loading ? '...' : `${queue.length} élément${queue.length !== 1 ? 's' : ''} à revoir`}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {!loading && queue.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>Rien à réviser</Text>
            <Text style={styles.emptySubtitle}>Vous êtes à jour ! Revenez demain pour vos révisions.</Text>
          </View>
        )}

        {!loading && queue.map((item, idx) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[
                styles.resultDot,
                item.answered_correctly ? styles.resultDotCorrect : styles.resultDotWrong,
              ]} />
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>Cas #{item.case_id.slice(0, 8)}</Text>
                <Text style={styles.cardSub}>
                  {item.answered_correctly ? '✓ Correct précédemment' : '✗ À retravailler'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.reviewButton}
                onPress={() => router.push(`/case/${item.case_id}`)}
              >
                <Text style={styles.reviewButtonText}>Réviser</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900' as any,
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  resultDotCorrect: {
    backgroundColor: colors.success,
  },
  resultDotWrong: {
    backgroundColor: colors.error,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontWeight: '900' as any,
    fontSize: 14,
    color: colors.text,
  },
  cardSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reviewButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  reviewButtonText: {
    color: 'white',
    fontWeight: '700' as any,
    fontSize: 13,
  },
})
