import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { getModuleBySlug, getCasesByModule } from '../../lib/queries'
import { ModuleIcon } from '../../components/ModuleIcon'
import type { Module, Case } from '../../lib/types'
import { colors } from '../../constants/colors'

const DIFFICULTY_COLORS = ['#22c55e', '#f97316', '#ef4444']

function DifficultyDots({ level, max = 3 }: { level: number; max?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i < level ? DIFFICULTY_COLORS[Math.min(level - 1, 2)] : colors.border,
          }}
        />
      ))}
    </View>
  )
}

export default function ModuleDetailScreen() {
  const router = useRouter()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [module, setModule] = useState<Module | null>(null)
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      const cs = await getCasesByModule(mod.id)
      setCases(cs)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          {module && (
            <>
              <View style={styles.headerIconRow}>
                <View style={[styles.iconBadge, { backgroundColor: module.color ?? '#e0f2f1' }]}>
                  <ModuleIcon icon={module.icon} size={22} color="white" strokeWidth={1.75} />
                </View>
                <Text style={styles.headerTitle}>{module.name_fr}</Text>
              </View>
              <Text style={styles.headerDesc}>{module.description_fr}</Text>
            </>
          )}
        </View>
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

          {cases.map((c, idx) => (
            <TouchableOpacity
              key={c.id}
              style={styles.caseCard}
              onPress={() => router.push(`/case/${c.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.caseNumber}>
                <Text style={styles.caseNumberText}>{c.case_number ?? idx + 1}</Text>
              </View>
              <View style={styles.caseContent}>
                <View style={styles.caseHeader}>
                  <Text style={styles.casePatient}>
                    {c.sex === 'Homme' ? '♂' : '♀'} {c.age} ans
                  </Text>
                  <DifficultyDots level={c.difficulty ?? 1} />
                </View>
                {c.tags && c.tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {c.tags.slice(0, 3).map(tag => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}

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
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  backButton: {
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  backIcon: {
    fontSize: 28,
    color: 'white',
    fontWeight: '700' as any,
    lineHeight: 28,
  },
  headerContent: {},
  headerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeText: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900' as any,
    color: 'white',
    flex: 1,
  },
  headerDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
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
    marginBottom: 12,
  },
  caseCard: {
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  caseNumber: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e0f2f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  caseNumberText: {
    fontWeight: '900' as any,
    fontSize: 14,
    color: colors.primaryDark,
  },
  caseContent: {
    flex: 1,
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  casePatient: {
    fontWeight: '900' as any,
    fontSize: 15,
    color: colors.text,
  },
  caseExcerpt: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600' as any,
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
    marginLeft: 8,
    alignSelf: 'center',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  errorText: {
    color: colors.errorText,
    fontSize: 15,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: 'white',
    fontWeight: '700' as any,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
})
