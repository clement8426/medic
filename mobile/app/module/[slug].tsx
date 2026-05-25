import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { getModuleBySlug, getCasesByModule, getUserProgress } from '../../lib/queries'
import { supabase } from '../../lib/supabase'
import { ModuleIcon } from '../../components/ModuleIcon'
import type { Module, Case, UserProgress } from '../../lib/types'
import { colors } from '../../constants/colors'

const DIFFICULTY_COLORS = ['#22c55e', '#f97316', '#ef4444']

function DifficultyDots({ level, max = 3 }: { level: number; max?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i < level ? DIFFICULTY_COLORS[Math.min(level - 1, 2)] : colors.border }} />
      ))}
    </View>
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
    !e.answered_correctly && e.next_review_at && new Date(e.next_review_at) > now
  )
  if (lockedEntry) return { state: 'locked', unlocksAt: new Date(lockedEntry.next_review_at!) }

  const allCorrect = entries.every(e => e.answered_correctly)
  return { state: allCorrect ? 'done' : 'todo' }
}

export default function ModuleDetailScreen() {
  const router = useRouter()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [module, setModule]           = useState<Module | null>(null)
  const [cases, setCases]             = useState<Case[]>([])
  const [progressByCase, setProgressByCase] = useState<Record<string, UserProgress[]>>({})
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    loadData()
  }, [slug])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const mod = await getModuleBySlug(slug as string)
      if (!mod) { setError('Module introuvable'); setLoading(false); return }
      setModule(mod)

      const { data: { user } } = await supabase.auth.getUser()
      const cs = await getCasesByModule(mod.id)
      setCases(cs)

      if (user && cs.length > 0) {
        const progress = await getUserProgress(user.id, cs.map(c => c.id))
        const byCase: Record<string, UserProgress[]> = {}
        for (const p of progress) {
          if (!byCase[p.case_id]) byCase[p.case_id] = []
          byCase[p.case_id].push(p)
        }
        setProgressByCase(byCase)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const doneCount = cases.filter(c => getCaseStatus(c.id, progressByCase).state === 'done').length

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        {module && (
          <View style={styles.headerContent}>
            <View style={styles.headerIconRow}>
              <View style={[styles.iconBadge, { backgroundColor: module.color ?? '#e0f2f1' }]}>
                <ModuleIcon icon={module.icon} size={22} color="white" strokeWidth={1.75} />
              </View>
              <Text style={styles.headerTitle}>{module.name_fr}</Text>
            </View>
            <Text style={styles.headerDesc}>{module.description_fr}</Text>
            {cases.length > 0 && (
              <Text style={styles.headerProgress}>
                {doneCount} / {cases.length} cas réussis
              </Text>
            )}
          </View>
        )}
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>
            {cases.length} cas disponible{cases.length !== 1 ? 's' : ''}
          </Text>

          {cases.map((c, idx) => {
            const { state, unlocksAt } = getCaseStatus(c.id, progressByCase)
            const isLocked = state === 'locked'
            const isDone   = state === 'done'
            const preview  = c.report_fr ? c.report_fr.slice(0, 100) + (c.report_fr.length > 100 ? '…' : '') : null

            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.caseCard, isLocked && styles.caseCardLocked, isDone && styles.caseCardDone]}
                onPress={() => !isLocked && router.push(`/case/${c.id}`)}
                activeOpacity={isLocked ? 1 : 0.8}
              >
                <View style={[styles.caseNumber, isDone && styles.caseNumberDone, isLocked && styles.caseNumberLocked]}>
                  <Text style={[styles.caseNumberText, isDone && styles.caseNumberTextDone]}>
                    {isLocked ? '🔒' : isDone ? '✓' : (c.case_number ?? idx + 1)}
                  </Text>
                </View>

                <View style={styles.caseContent}>
                  <View style={styles.caseHeader}>
                    <Text style={[styles.casePatient, isLocked && styles.textMuted]}>
                      {c.sex === 'Homme' ? '♂' : '♀'} {c.age} ans
                    </Text>
                    <DifficultyDots level={c.difficulty ?? 1} />
                  </View>

                  {preview && (
                    <Text style={[styles.casePreview, isLocked && styles.textMuted]} numberOfLines={2}>
                      {preview}
                    </Text>
                  )}

                  {c.tags && c.tags.length > 0 && (
                    <View style={styles.tagsRow}>
                      {c.tags.slice(0, 3).map(tag => (
                        <View key={tag} style={[styles.tag, isLocked && styles.tagLocked]}>
                          <Text style={[styles.tagText, isLocked && styles.textMuted]}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {isLocked && unlocksAt && (
                    <View style={styles.lockBadge}>
                      <Text style={styles.lockBadgeText}>⏱ Disponible dans {formatTimeLeft(unlocksAt)}</Text>
                    </View>
                  )}

                  {isDone && (
                    <Text style={styles.doneBadge}>Réussi ✓</Text>
                  )}
                </View>

                {!isLocked && <Text style={styles.chevron}>›</Text>}
              </TouchableOpacity>
            )
          })}

          {cases.length === 0 && (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Aucun cas dans ce module</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.primary, padding: 20, paddingTop: Platform.OS === 'ios' ? 12 : 16 },
  backButton: { marginBottom: 8, alignSelf: 'flex-start' },
  backIcon: { fontSize: 28, color: 'white', fontWeight: '700' as any, lineHeight: 28 },
  headerContent: {},
  headerIconRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  iconBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '900' as any, color: 'white', flex: 1 },
  headerDesc: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
  headerProgress: { fontSize: 13, color: 'rgba(167,243,208,0.9)', fontWeight: '700' as any, marginTop: 6 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontWeight: '800' as any, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },
  caseCard: { backgroundColor: 'white', borderRadius: 22, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  caseCardLocked: { opacity: 0.65, backgroundColor: '#f9fafb' },
  caseCardDone: { borderWidth: 1.5, borderColor: '#16a34a22', backgroundColor: '#f0fdf4' },
  caseNumber: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#e0f2f1', alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
  caseNumberDone: { backgroundColor: '#16a34a' },
  caseNumberLocked: { backgroundColor: '#f4f4f5' },
  caseNumberText: { fontWeight: '900' as any, fontSize: 14, color: colors.primaryDark },
  caseNumberTextDone: { color: 'white', fontSize: 16 },
  caseContent: { flex: 1 },
  caseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  casePatient: { fontWeight: '900' as any, fontSize: 15, color: colors.text },
  casePreview: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 17, marginBottom: 6 },
  textMuted: { color: colors.textMuted },
  tagsRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  tag: { backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagLocked: { backgroundColor: '#f4f4f5' },
  tagText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' as any },
  lockBadge: { marginTop: 8, backgroundColor: '#fff7ed', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#fed7aa' },
  lockBadgeText: { fontSize: 11, color: '#c2410c', fontWeight: '700' as any },
  doneBadge: { fontSize: 11, color: '#16a34a', fontWeight: '700' as any, marginTop: 6 },
  chevron: { fontSize: 22, color: colors.textMuted, marginLeft: 8, alignSelf: 'center' },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  errorText: { color: colors.errorText, fontSize: 15, marginBottom: 12 },
  retryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: 'white', fontWeight: '700' as any },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
})
