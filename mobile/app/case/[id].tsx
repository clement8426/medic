import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { getCaseById } from '../../lib/queries'
import { supabase } from '../../lib/supabase'
import type { Case } from '../../lib/types'
import { resolveImageUrl, resolveFocusUrl } from '../../lib/image-utils'
import { colors } from '../../constants/colors'

export default function CaseScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [moduleSlug, setModuleSlug] = useState('ecg')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFullEcg, setShowFullEcg] = useState(false) // false = D2 band, true = 12 leads

  useEffect(() => {
    if (!id) return
    loadCase()
  }, [id])

  async function loadCase() {
    setLoading(true)
    setError(null)
    const data = await getCaseById(id as string)
    if (!data) {
      setError('Cas introuvable')
    } else {
      setCaseData(data)
      // Fetch module slug to build correct storage URL
      const { data: mod } = await supabase
        .from('modules')
        .select('slug')
        .eq('id', data.module_id)
        .single()
      if (mod?.slug) setModuleSlug(mod.slug)
    }
    setLoading(false)
  }

  function getImageUrl(c: Case): string {
    return resolveImageUrl(c.image_url, moduleSlug)
  }

  function getEcgImageUrl(c: Case): string {
    if (moduleSlug !== 'ecg') return getImageUrl(c)
    if (!showFullEcg && c.focus_urls?.d2_band) {
      return c.focus_urls.d2_band
    }
    return resolveImageUrl(c.image_url || '', moduleSlug)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lecture du cas</Text>
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCase}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && caseData && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ECG Image */}
          {moduleSlug === 'ecg' && (
            <View style={styles.toggleRow}>
              {(['DII', '12 Dérivations'] as const).map((label, idx) => (
                <TouchableOpacity
                  key={label}
                  onPress={() => setShowFullEcg(idx === 1)}
                  style={[
                    styles.toggleBtn,
                    showFullEcg === (idx === 1) && styles.toggleBtnActive,
                  ]}
                >
                  <Text style={[
                    styles.toggleText,
                    showFullEcg === (idx === 1) && styles.toggleTextActive,
                  ]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: getEcgImageUrl(caseData) }}
              style={styles.ecgImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.fullscreenBadge}
              onPress={() => router.push(`/image/${caseData.id}`)}
            >
              <Text style={styles.fullscreenText}>🔍 Plein écran</Text>
            </TouchableOpacity>
          </View>

          {/* Patient info */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Patient</Text>
            <View style={styles.patientGrid}>
              <PatientStat label="Âge" value={`${caseData.age} ans`} />
              <PatientStat label="Sexe" value={caseData.sex === 'Homme' ? '♂ Homme' : '♀ Femme'} />
              {caseData.weight_kg && <PatientStat label="Poids" value={`${caseData.weight_kg} kg`} />}
              {caseData.height_cm && <PatientStat label="Taille" value={`${caseData.height_cm} cm`} />}
            </View>
          </View>

          {/* Tags */}
          {caseData.tags && caseData.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {caseData.tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Quiz CTA */}
          <TouchableOpacity
            style={styles.quizButton}
            onPress={() => router.push(`/quiz/${caseData.id}`)}
          >
            <Text style={styles.quizButtonText}>Commencer le quiz →</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function PatientStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={patientStyles.container}>
      <Text style={patientStyles.label}>{label}</Text>
      <Text style={patientStyles.value}>{value}</Text>
    </View>
  )
}

const patientStyles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: '45%',
    marginBottom: 8,
  },
  label: {
    fontWeight: '800' as any,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  value: {
    fontWeight: '700' as any,
    fontSize: 15,
    color: colors.text,
    marginTop: 2,
  },
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  backIcon: {
    fontSize: 28,
    color: 'white',
    fontWeight: '700' as any,
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900' as any,
    color: 'white',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  imageContainer: {
    backgroundColor: 'black',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  ecgImage: {
    width: '100%',
    height: 250,
    backgroundColor: 'black',
  },
  fullscreenBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fullscreenText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700' as any,
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
  sectionLabel: {
    fontWeight: '800' as any,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  patientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reportText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: '#e0f2f1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '700' as any,
  },
  quizButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  quizButtonText: {
    color: 'white',
    fontWeight: '900' as any,
    fontSize: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
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
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f4f4f5',
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontWeight: '700' as any,
    fontSize: 12,
    color: '#71717a',
  },
  toggleTextActive: {
    color: 'white',
  },
})
