import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getActiveModules, getCaseCountsByModule, getModuleQuizCounts, getUserAllModuleStats } from '../../lib/queries'
import { ModuleIcon } from '../../components/ModuleIcon'
import { Flame, Star, BookOpen as BookOpenIcon } from 'lucide-react-native'
import type { Module, UserModuleStats } from '../../lib/types'
import { colors } from '../../constants/colors'

export default function LearnScreen() {
  const router = useRouter()
  const [modules, setModules] = useState<Module[]>([])
  const [caseCounts, setCaseCounts] = useState<Record<string, number>>({})
  const [quizCounts, setQuizCounts] = useState<Record<string, number>>({})
  const [moduleStats, setModuleStats] = useState<Record<string, UserModuleStats>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [totalXp, setTotalXp] = useState(0)
  const [streak, setStreak] = useState(0)
  const [totalCases, setTotalCases] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? '')
      if (data.user?.id) loadStats(data.user.id)
    })
    loadModules()
  }, [])

  async function loadStats(userId: string) {
    const stats = await getUserAllModuleStats(userId)
    const statsMap: Record<string, UserModuleStats> = {}
    for (const s of stats) statsMap[s.module_id] = s
    setModuleStats(statsMap)
    setTotalXp(stats.reduce((acc, s) => acc + (s.xp ?? 0), 0))
    setStreak(Math.max(0, ...stats.map(s => s.current_streak ?? 0)))
    setTotalCases(stats.reduce((acc, s) => acc + (s.cases_completed ?? 0), 0))
  }

  async function loadModules() {
    try {
      const data = await getActiveModules()
      setModules(data)
      const classicIds = data.filter(m => m.category === 'classic').map(m => m.id)
      const [counts, qCounts] = await Promise.all([
        getCaseCountsByModule(data.map(m => m.id)),
        getModuleQuizCounts(classicIds),
      ])
      setCaseCounts(counts)
      setQuizCounts(qCounts)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const initials = userEmail ? userEmail[0].toUpperCase() : '?'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerGreeting}>Bonjour 👋</Text>
            <Text style={styles.headerSub}>Prêt à apprendre ?</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <View style={styles.statValueRow}>
              <Flame size={14} color="white" strokeWidth={2} />
              <Text style={styles.statValue}>{streak}</Text>
            </View>
            <Text style={styles.statLabel}>Jours</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statValueRow}>
              <Star size={14} color="white" strokeWidth={2} />
              <Text style={styles.statValue}>{totalXp}</Text>
            </View>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statValueRow}>
              <BookOpenIcon size={14} color="white" strokeWidth={2} />
              <Text style={styles.statValue}>{totalCases}</Text>
            </View>
            <Text style={styles.statLabel}>Cas</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {error && (
          <View style={[styles.centered, { marginTop: 32 }]}>
            <Text style={styles.errorText}>Impossible de charger les modules</Text>
            <TouchableOpacity onPress={loadModules} style={styles.retryButton}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && (
          <>
            {[
              { key: 'clinical' as const, label: 'Cas Cliniques' },
              { key: 'classic' as const, label: 'Révision Classique' },
            ].map(section => {
              const sectionMods = modules.filter(m => (m.category ?? 'clinical') === section.key)
              if (sectionMods.length === 0) return null
              return (
                <View key={section.key}>
                  <Text style={styles.sectionTitle}>{section.label}</Text>
                  {sectionMods.map(module => {
                    const count = caseCounts[module.id] ?? 0
                    const isClassic = module.category === 'classic'
                    const hasContent = isClassic ? (quizCounts[module.id] ?? 0) > 0 : count > 0
                    const comingSoon = !hasContent

                    function handlePress() {
                      if (comingSoon) return
                      if (isClassic) {
                        router.push(`/quiz/classic/${module.id}`)
                      } else {
                        router.push(`/module/${module.slug}`)
                      }
                    }

                    return (
                      <TouchableOpacity
                        key={module.id}
                        style={[styles.card, comingSoon && styles.cardComingSoon]}
                        onPress={handlePress}
                        activeOpacity={comingSoon ? 1 : 0.8}
                      >
                        <View style={styles.cardRow}>
                          <View style={[
                            styles.moduleIcon,
                            { backgroundColor: comingSoon ? '#f4f4f5' : isClassic ? '#e0f4ff' : (module.color ?? '#e0f2f1') },
                          ]}>
                            <ModuleIcon
                              icon={module.icon}
                              size={24}
                              color={comingSoon ? '#a1a1aa' : isClassic ? '#0891b2' : '#0F766E'}
                              strokeWidth={1.75}
                            />
                          </View>
                          <View style={styles.cardContent}>
                            <View style={styles.cardHeader}>
                              <Text style={[styles.cardTitle, comingSoon && styles.textMuted]} numberOfLines={1}>
                                {module.name_fr}
                              </Text>
                              {comingSoon ? (
                                <View style={styles.badgeComingSoon}>
                                  <Text style={styles.badgeComingSoonText}>À venir</Text>
                                </View>
                              ) : isClassic ? (
                                <View style={styles.badgeClassic}>
                                  <Text style={styles.badgeClassicText}>Classique</Text>
                                </View>
                              ) : (
                                <View style={styles.badgeActive}>
                                  <Text style={styles.badgeActiveText}>{count} cas</Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.cardDesc, comingSoon && styles.textMuted]} numberOfLines={2}>
                              {comingSoon ? 'Contenu en cours de préparation' : module.description_fr}
                            </Text>
                            {!comingSoon && !isClassic && (
                              <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, {
                                  width: `${Math.min(100, Math.round(((moduleStats[module.id]?.cases_completed ?? 0) / count) * 100))}%`
                                }]} />
                              </View>
                            )}
                            {isClassic && !comingSoon && (
                              <Text style={styles.classicCta}>Réviser →</Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )
            })}
          </>
        )}

        {!loading && !error && modules.length === 0 && (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Aucun module disponible</Text>
          </View>
        )}
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerGreeting: {
    fontSize: 22,
    fontWeight: '900' as any,
    color: 'white',
  },
  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: '900' as any,
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValueRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  statValue: {
    color: 'white',
    fontWeight: '900' as any,
    fontSize: 15,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontWeight: '800' as any,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
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
    alignItems: 'flex-start',
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontWeight: '900' as any,
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: colors.bg,
    borderRadius: 4,
  },
  progressBarFill: {
    height: 5,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  cardComingSoon: {
    opacity: 0.55,
    backgroundColor: '#fafafa',
    shadowOpacity: 0,
    elevation: 0,
  },
  textMuted: {
    color: '#a1a1aa',
  },
  badgeActive: {
    backgroundColor: colors.successBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  badgeActiveText: {
    color: colors.successText,
    fontSize: 11,
    fontWeight: '700' as any,
  },
  badgeComingSoon: {
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  badgeComingSoonText: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '700' as any,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
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
  badgeClassic: {
    backgroundColor: '#e0f4ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  badgeClassicText: {
    color: '#0c4a6e',
    fontSize: 11,
    fontWeight: '700' as any,
  },
  classicCta: {
    fontSize: 12,
    fontWeight: '700' as any,
    color: '#0891b2',
    marginTop: 6,
  },
})
