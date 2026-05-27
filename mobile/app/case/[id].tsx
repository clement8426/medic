import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, ActivityIndicator, Platform, Modal } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { getCaseById, submitReport } from '../../lib/queries'
import { supabase } from '../../lib/supabase'
import type { Case, ReportReason } from '../../lib/types'
import { resolveImageUrl, resolveFocusUrl } from '../../lib/image-utils'
import { Flag, ChevronLeft, ZoomIn } from 'lucide-react-native'
import { colors } from '../../constants/colors'

export default function CaseScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [moduleSlug, setModuleSlug] = useState('ecg')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFullEcg, setShowFullEcg] = useState(false) // false = D2 band, true = 12 leads
  const { bottom: bottomInset } = useSafeAreaInsets()
  const [reportVisible, setReportVisible] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason | null>(null)
  const [reportDone, setReportDone] = useState(false)
  const [reportSubmitting, setReportSubmitting] = useState(false)

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

  async function handleSubmitReport() {
    if (!reportReason || !caseData) return
    setReportSubmitting(true)
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id
      if (uid) {
        await submitReport({ reporter_id: uid, case_id: caseData.id, quiz_id: null, reason: reportReason })
      }
      setReportDone(true)
      setTimeout(() => { setReportVisible(false); setReportDone(false); setReportReason(null) }, 1800)
    } finally {
      setReportSubmitting(false)
    }
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={26} color="white" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lecture du cas</Text>
        <TouchableOpacity style={styles.flagButton} onPress={() => setReportVisible(true)}>
          <Flag size={18} color="rgba(255,255,255,0.8)" strokeWidth={2} />
        </TouchableOpacity>
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
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + bottomInset }]} showsVerticalScrollIndicator={false}>
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
              <ZoomIn size={14} color="white" strokeWidth={2} />
              <Text style={styles.fullscreenText}>Plein écran</Text>
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

          {/* Présentation clinique */}
          {caseData.report_fr && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Présentation clinique</Text>
              <Text style={styles.reportText}>{caseData.report_fr}</Text>
            </View>
          )}

          {/* Données cliniques */}
          {(() => {
            const HIDDEN = new Set(['report', 'report_fr', 'report_de', 'report_en', 'report_it'])
            const entries = Object.entries(caseData.data_fr ?? {}).filter(([k]) => !HIDDEN.has(k))
            if (entries.length === 0) return null
            return (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>Données cliniques</Text>
                {entries.map(([key, val], i) => (
                  <View key={key} style={[styles.dataRow, i > 0 && styles.dataRowBorder]}>
                    <Text style={styles.dataKey}>{key}</Text>
                    <Text style={styles.dataVal}>{String(val)}</Text>
                  </View>
                ))}
              </View>
            )
          })()}

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
      <Modal visible={reportVisible} transparent animationType="fade" onRequestClose={() => setReportVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {reportDone ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>✓</Text>
                <Text style={{ fontWeight: '900' as any, fontSize: 15, color: colors.primary }}>Signalement envoyé</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Merci pour votre retour !</Text>
              </View>
            ) : (
              <>
                <Text style={styles.modalTitle}>Signaler un problème</Text>
                <Text style={styles.modalSub}>Cas clinique</Text>
                <View style={styles.reasonGrid}>
                  {([
                    { value: 'wrong_answer' as ReportReason,     label: 'Données incorrectes'   },
                    { value: 'bad_translation' as ReportReason,  label: 'Mauvaise traduction'   },
                    { value: 'unclear_question' as ReportReason, label: 'Présentation ambiguë'  },
                    { value: 'wrong_options' as ReportReason,    label: 'Image incorrecte'      },
                    { value: 'wrong_difficulty' as ReportReason, label: 'Difficulté erronée'    },
                    { value: 'other' as ReportReason,            label: 'Autre'                 },
                  ]).map(r => (
                    <TouchableOpacity
                      key={r.value}
                      onPress={() => setReportReason(r.value)}
                      style={[styles.reasonChip, reportReason === r.value && styles.reasonChipActive]}
                    >
                      <Text style={[styles.reasonChipText, reportReason === r.value && styles.reasonChipTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => { setReportVisible(false); setReportReason(null) }} style={styles.modalCancelBtn}>
                    <Text style={styles.modalCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSubmitReport}
                    disabled={!reportReason || reportSubmitting}
                    style={[styles.modalSubmitBtn, (!reportReason || reportSubmitting) && styles.modalSubmitBtnDisabled]}
                  >
                    <Text style={styles.modalSubmitText}>{reportSubmitting ? 'Envoi…' : 'Envoyer'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900' as any,
    color: 'white',
  },
  flagButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: { fontWeight: '900' as any, fontSize: 17, color: colors.text, marginBottom: 4 },
  modalSub: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  reasonChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    backgroundColor: '#f4f4f5', borderWidth: 1.5, borderColor: 'transparent',
  },
  reasonChipActive: { borderColor: colors.primary, backgroundColor: '#f0fdf4' },
  reasonChipText: { fontSize: 13, fontWeight: '600' as any, color: colors.textMuted },
  reasonChipTextActive: { color: colors.primary },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1, padding: 13, borderRadius: 12,
    backgroundColor: '#f4f4f5', alignItems: 'center',
  },
  modalCancelText: { fontWeight: '700' as any, color: colors.textMuted },
  modalSubmitBtn: {
    flex: 1, padding: 13, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  modalSubmitBtnDisabled: { opacity: 0.4 },
  modalSubmitText: { fontWeight: '900' as any, color: 'white' },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
    fontStyle: 'italic',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 12,
  },
  dataRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dataKey: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600' as any,
    flex: 1,
    textTransform: 'capitalize',
  },
  dataVal: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700' as any,
    flex: 2,
    textAlign: 'right',
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
