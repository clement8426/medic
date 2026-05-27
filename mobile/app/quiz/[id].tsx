import { useState, useEffect, useMemo } from 'react'
import { View, Text, TouchableOpacity, Pressable, ScrollView, Image, StyleSheet, ActivityIndicator, Platform, Modal } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getCaseById, getQuizzesByCase, getQuizProgress, saveQuizAnswer, saveSessionStats, submitReport } from '../../lib/queries'
import { supabase } from '../../lib/supabase'
import type { Case, Quiz, QuizAnswer, UserProgress, ReportReason } from '../../lib/types'
import { shuffleOptions, getQuizField, getDistractors, computeXp, computeResultMessage, computeNextReview, getQuizCooldown, formatCountdown } from '../../lib/quiz-utils'
import { resolveImageUrl } from '../../lib/image-utils'
import { X, ZoomIn } from 'lucide-react-native'
import { colors } from '../../constants/colors'

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong'

export default function QuizQuestionScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [caseData, setCaseData] = useState<Case | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [moduleSlug, setModuleSlug] = useState('')
  const [showFullEcg, setShowFullEcg] = useState(false) // false = D2 band, true = 12 leads
  const [stepIdx, setStepIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [stepStartTime, setStepStartTime] = useState(Date.now())
  const [progressMap, setProgressMap] = useState<Map<string, UserProgress>>(new Map())
  const [cooldownMs, setCooldownMs] = useState(0)
  const [reportVisible, setReportVisible] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason | null>(null)
  const [reportDone, setReportDone] = useState(false)
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const { bottom: bottomInset } = useSafeAreaInsets()

  // Shuffled options for each step — computed once per quiz load
  const [shuffledOptions, setShuffledOptions] = useState<string[][]>([])

  useEffect(() => {
    if (!id) return
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [c, qs] = await Promise.all([
        getCaseById(id as string),
        getQuizzesByCase(id as string),
      ])
      if (!c) { setError('Cas introuvable'); setLoading(false); return }
      setCaseData(c)
      setQuizzes(qs)
      // Fetch module slug for image URL resolution
      const { data: mod } = await supabase
        .from('modules')
        .select('slug')
        .eq('id', c.module_id)
        .single()
      if (mod?.slug) setModuleSlug(mod.slug)
      // Shuffle options once
      setShuffledOptions(qs.map(q => shuffleOptions(q, 'fr')))
      setStepStartTime(Date.now())
      // Charger progression utilisateur
      const user = await supabase.auth.getUser()
      const uid = user.data.user?.id
      if (uid && qs.length > 0) {
        const prog = await getQuizProgress(uid, qs.map(q => q.id))
        const map = new Map<string, UserProgress>()
        for (const p of prog) {
          map.set(p.quiz_id, p)
        }
        setProgressMap(map)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Timer cooldown
  useEffect(() => {
    if (!currentQuiz) return
    const prog = progressMap.get(currentQuiz.id)
    const cd = getQuizCooldown(prog)
    if (cd.blocked) {
      setCooldownMs(cd.remainingMs)
      const interval = setInterval(() => {
        setCooldownMs(prev => {
          const next = prev - 1000
          if (next <= 0) {
            clearInterval(interval)
            return 0
          }
          return next
        })
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setCooldownMs(0)
    }
  }, [currentQuiz?.id, progressMap])

  const currentQuiz = quizzes[stepIdx]
  const currentOptions = shuffledOptions[stepIdx] ?? []

  function getOptionState(option: string): OptionState {
    if (!revealed) {
      return option === selected ? 'selected' : 'idle'
    }
    const correctAnswer = getQuizField(currentQuiz, 'correct', 'fr')
    if (option === correctAnswer) return 'correct'
    if (option === selected && option !== correctAnswer) return 'wrong'
    return 'idle'
  }

  function handleSelect(option: string) {
    if (revealed || cooldownMs > 0) return
    setSelected(option)
  }

  function handleValidate() {
    if (!selected || !currentQuiz || cooldownMs > 0) return
    setRevealed(true)
  }

  async function handleNext() {
    if (!currentQuiz || !selected || !caseData) return

    const correctAnswer = getQuizField(currentQuiz, 'correct', 'fr')
    const isCorrect = selected === correctAnswer
    const timeMs = Date.now() - stepStartTime

    const answer: QuizAnswer = {
      quiz_id: currentQuiz.id,
      step: currentQuiz.step,
      theme: currentQuiz.theme,
      correct_answer: correctAnswer,
      given_answer: selected,
      is_correct: isCorrect,
      time_ms: timeMs,
    }

    // Save answer to user_progress (SRS + cooldown)
    const uid = (await supabase.auth.getUser()).data.user?.id
    if (uid) {
      const prev = progressMap.get(currentQuiz.id)
      const srs = computeNextReview(isCorrect, prev?.ease_factor ?? 2.5, prev?.interval_days ?? 1)
      saveQuizAnswer(uid, {
        case_id: caseData.id,
        quiz_id: currentQuiz.id,
        answered_correctly: isCorrect,
        answer_given: selected,
        time_ms: timeMs,
        next_review_at: srs.nextReviewAt,
        ease_factor: srs.easeFactor,
        interval_days: srs.intervalDays,
      }).then(() => {
        // Refresh progress so cooldown updates immediately
        setProgressMap(prev => {
          const next = new Map(prev)
          next.set(currentQuiz.id, {
            ...(prev.get(currentQuiz.id) ?? { user_id: uid, quiz_id: currentQuiz.id, case_id: caseData.id }),
            answered_correctly: isCorrect,
            answer_given: selected,
            time_ms: timeMs,
            next_review_at: srs.nextReviewAt,
            ease_factor: srs.easeFactor,
            interval_days: srs.intervalDays,
            updated_at: new Date().toISOString(),
          } as any)
          return next
        })
      }).catch(() => {})
    }

    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)

    const isLast = stepIdx >= quizzes.length - 1

    if (isLast) {
      finishQuiz(newAnswers)
    } else {
      setStepIdx(s => s + 1)
      setSelected(null)
      setRevealed(false)
      setStepStartTime(Date.now())
    }
  }

  async function finishQuiz(finalAnswers: QuizAnswer[]) {
    if (!caseData) return
    const uid = (await supabase.auth.getUser()).data.user?.id
    if (uid && caseData.module_id) {
      await saveSessionStats(uid, caseData.module_id, computeXp(finalAnswers), finalAnswers).catch(() => {})
    }
    const session = {
      case_id: caseData.id,
      case_label: `Cas #${caseData.case_number}`,
      answers: finalAnswers,
      total_xp: computeXp(finalAnswers),
      started_at: Date.now(),
      module_slug: moduleSlug,
      case_age: caseData.age,
      case_sex: caseData.sex,
      report_fr: caseData.report_fr,
      image_url: caseData.image_url,
      focus_urls: caseData.focus_urls,
    }
    try {
      await AsyncStorage.setItem(`mediq_session_${caseData.id}`, JSON.stringify(session))
    } catch {}
    router.replace(`/session/recap?case_id=${caseData.id}`)
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

  async function handleSubmitReport() {
    if (!reportReason || !caseData) return
    setReportSubmitting(true)
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id
      if (uid) {
        await submitReport({
          reporter_id: uid,
          case_id: caseData.id,
          quiz_id: currentQuiz?.id ?? null,
          reason: reportReason,
        })
      }
      setReportDone(true)
      setTimeout(() => { setReportVisible(false); setReportDone(false); setReportReason(null) }, 1800)
    } finally {
      setReportSubmitting(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    )
  }

  if (error || !caseData || quizzes.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Aucun quiz disponible'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (!currentQuiz) return null

  const isLast = stepIdx >= quizzes.length - 1
  const correctAnswer = getQuizField(currentQuiz, 'correct', 'fr')
  const question = getQuizField(currentQuiz, 'question', 'fr')
  const explanationCorrect = getQuizField(currentQuiz, 'explanation_correct', 'fr')
  const keyFinding = getQuizField(currentQuiz, 'key_finding', 'fr')
  const isCurrentCorrect = selected === correctAnswer

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.closeButton}
        >
          <X size={22} color="white" strokeWidth={2.5} />
        </Pressable>

        <View style={styles.progressSegments}>
          {quizzes.map((_, i) => (
            <View
              key={i}
              style={[
                styles.segment,
                i < stepIdx && styles.segmentDone,
                i === stepIdx && styles.segmentActive,
              ]}
            />
          ))}
        </View>

        <Text style={styles.stepCount}>{stepIdx + 1}/{quizzes.length}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Theme badge */}
        <View style={styles.themeBadge}>
          <Text style={styles.themeBadgeText}>
            {currentQuiz.theme ? currentQuiz.theme.charAt(0).toUpperCase() + currentQuiz.theme.slice(1) : ''}
          </Text>
        </View>

        {/* ECG image (small) */}
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
        {getEcgImageUrl(caseData) ? (
          <View style={styles.smallImageContainer}>
            <Image
              source={{ uri: getEcgImageUrl(caseData) }}
              style={styles.smallImage}
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
        ) : null}

        {/* Patient context */}
        <View style={styles.patientCard}>
          <View style={styles.patientItem}>
            <Text style={styles.patientValue}>Cas #{caseData.case_number}</Text>
            <Text style={styles.patientLabel}>CAS</Text>
          </View>
          <View style={styles.patientDivider} />
          <View style={styles.patientItem}>
            <Text style={styles.patientValue}>{caseData.age} ans</Text>
            <Text style={styles.patientLabel}>ÂGE</Text>
          </View>
          <View style={styles.patientDivider} />
          <View style={styles.patientItem}>
            <Text style={styles.patientValue}>{caseData.sex === 'Homme' ? '♂ Homme' : '♀ Femme'}</Text>
            <Text style={styles.patientLabel}>SEXE</Text>
          </View>
        </View>

        {/* Rapport clinique */}
        {caseData.report_fr ? (
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>PRÉSENTATION CLINIQUE</Text>
            <Text style={styles.reportText}>{caseData.report_fr}</Text>
          </View>
        ) : null}

        {/* Données cliniques */}
        {caseData.data_fr && Object.keys(caseData.data_fr).length > 0 && (
          <View style={styles.clinicalCard}>
            <Text style={styles.clinicalTitle}>DONNÉES CLINIQUES</Text>
            {Object.entries(caseData.data_fr).map(([key, value]) => (
              <View key={key} style={styles.clinicalRow}>
                <Text style={styles.clinicalKey}>
                  {key.replace(/_/g, ' ')}
                </Text>
                <Text style={styles.clinicalValue}>
                  {Array.isArray(value)
                    ? (value as unknown[]).join(', ')
                    : typeof value === 'object' && value !== null
                      ? JSON.stringify(value)
                      : String(value ?? '—')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Question */}
        <Text style={styles.questionText}>{question}</Text>

        {cooldownMs > 0 ? (
          <View style={styles.cooldownBlock}>
            <Text style={styles.cooldownEmoji}>⏳</Text>
            <Text style={styles.cooldownTitle}>Question bloquée</Text>
            <Text style={styles.cooldownText}>
              {`Vous avez répondu incorrectement à cette question.\nAttendez 24 heures pour réessayer.`}
            </Text>
            <View style={styles.cooldownTimerBox}>
              <Text style={styles.cooldownTimer}>{formatCountdown(cooldownMs)}</Text>
            </View>
          </View>
        ) : (
          <>
            {/* Options */}
            <View style={styles.optionsContainer}>
              {currentOptions.map((option, i) => {
                const state = getOptionState(option)
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.optionButton, optionStyle(state)]}
                    onPress={() => handleSelect(option)}
                    disabled={revealed}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.optionLetter, optionLetterStyle(state)]}>
                      <Text style={[styles.optionLetterText, optionLetterTextStyle(state)]}>
                        {String.fromCharCode(65 + i)}
                      </Text>
                    </View>
                    <Text style={[styles.optionText, optionTextStyle(state)]}>{option}</Text>
                    {revealed && state === 'correct' && <Text style={styles.checkmark}>✓</Text>}
                    {revealed && state === 'wrong' && <Text style={styles.crossmark}>✗</Text>}
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Explanation panel after reveal */}
            {revealed && (
              <>
                <View style={[
                  styles.explanationPanel,
                  isCurrentCorrect ? styles.explanationPanelCorrect : styles.explanationPanelWrong,
                ]}>
                  <Text style={[styles.explanationTitle, isCurrentCorrect ? styles.explanationTitleCorrect : styles.explanationTitleWrong]}>
                    {isCurrentCorrect ? '✓ Correct !' : '✗ Incorrect'}
                  </Text>
                  {!isCurrentCorrect && (
                    <Text style={styles.correctAnswerHint}>
                      Bonne réponse : <Text style={{ fontWeight: '700' as any }}>{correctAnswer}</Text>
                    </Text>
                  )}
                  {(explanationCorrect || keyFinding) ? (
                    <Text style={styles.explanationText}>
                      {explanationCorrect || keyFinding}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => setReportVisible(true)}
                  style={styles.reportLink}
                >
                  <Text style={styles.reportLinkText}>⚑ Signaler un problème</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Report Modal */}
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
                <Text style={styles.modalSub}>
                  {currentQuiz?.theme ? currentQuiz.theme.charAt(0).toUpperCase() + currentQuiz.theme.slice(1) : 'Question'}
                </Text>
                <View style={styles.reasonGrid}>
                  {([
                    { value: 'wrong_answer' as ReportReason,     label: 'Réponse incorrecte'  },
                    { value: 'bad_translation' as ReportReason,  label: 'Mauvaise traduction'  },
                    { value: 'unclear_question' as ReportReason, label: 'Question ambiguë'     },
                    { value: 'wrong_options' as ReportReason,    label: 'Options incorrectes'  },
                    { value: 'wrong_difficulty' as ReportReason, label: 'Difficulté erronée'   },
                    { value: 'other' as ReportReason,            label: 'Autre'                },
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
                  <TouchableOpacity
                    onPress={() => { setReportVisible(false); setReportReason(null) }}
                    style={styles.modalCancelBtn}
                  >
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

      {/* CTA Button */}
      {cooldownMs === 0 && (
        <View style={[styles.ctaContainer, { paddingBottom: (Platform.OS === 'ios' ? 28 : 16) + bottomInset }]}>
          {!revealed ? (
            <TouchableOpacity
              style={[styles.ctaButton, !selected && styles.ctaButtonDisabled]}
              onPress={handleValidate}
              disabled={!selected}
            >
              <Text style={styles.ctaButtonText}>Valider</Text>
            </TouchableOpacity>
          ) : isLast ? (
            <TouchableOpacity style={styles.ctaButton} onPress={() => handleNext()}>
              <Text style={styles.ctaButtonText}>Voir les résultats 🎉</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.ctaButton} onPress={() => handleNext()}>
              <Text style={styles.ctaButtonText}>Suivant →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  )
}

function optionStyle(state: OptionState) {
  switch (state) {
    case 'selected': return { borderColor: colors.primary, backgroundColor: '#e0f2f1' }
    case 'correct':  return { borderColor: colors.success, backgroundColor: colors.successBg }
    case 'wrong':    return { borderColor: colors.error, backgroundColor: colors.errorBg }
    default:         return {}
  }
}

function optionLetterStyle(state: OptionState) {
  switch (state) {
    case 'selected': return { backgroundColor: colors.primary }
    case 'correct':  return { backgroundColor: colors.success }
    case 'wrong':    return { backgroundColor: colors.error }
    default:         return {}
  }
}

function optionLetterTextStyle(state: OptionState) {
  return state !== 'idle' ? { color: 'white' } : {}
}

function optionTextStyle(state: OptionState) {
  switch (state) {
    case 'correct': return { color: colors.successText, fontWeight: '700' as any }
    case 'wrong':   return { color: colors.errorText, fontWeight: '700' as any }
    case 'selected': return { color: colors.primaryDark, fontWeight: '700' as any }
    default:        return {}
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSegments: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  segmentDone: {
    backgroundColor: 'white',
  },
  segmentActive: {
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  stepCount: {
    color: 'white',
    fontWeight: '700' as any,
    fontSize: 13,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  themeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0f2f1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  themeBadgeText: {
    color: colors.primaryDark,
    fontWeight: '700' as any,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  smallImageContainer: {
    backgroundColor: 'black',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  smallImage: {
    width: '100%',
    height: 150,
    backgroundColor: 'black',
  },
  fullscreenBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  fullscreenText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700' as any,
  },
  patientCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    alignItems: 'center',
  },
  patientItem: {
    flex: 1,
    alignItems: 'center',
  },
  patientDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e4e4e7',
  },
  patientValue: {
    fontSize: 15,
    fontWeight: '900' as any,
    color: '#09090b',
    marginBottom: 2,
  },
  patientLabel: {
    fontSize: 10,
    fontWeight: '700' as any,
    color: '#94a3b8',
    textTransform: 'uppercase' as any,
    letterSpacing: 0.8,
  },
  reportCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  reportTitle: {
    fontSize: 10,
    fontWeight: '900' as any,
    color: '#166534',
    textTransform: 'uppercase' as any,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  reportText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 20,
    fontWeight: '600' as any,
  },
  clinicalCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    gap: 6,
  },
  clinicalTitle: {
    fontSize: 10,
    fontWeight: '900' as any,
    color: '#94a3b8',
    textTransform: 'uppercase' as any,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  clinicalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clinicalKey: {
    fontSize: 13,
    color: '#71717a',
    fontWeight: '700' as any,
    textTransform: 'capitalize' as any,
    flex: 1,
    marginRight: 8,
  },
  clinicalValue: {
    fontSize: 13,
    color: '#09090b',
    fontWeight: '900' as any,
    textAlign: 'right' as any,
    flexShrink: 1,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '900' as any,
    color: colors.text,
    lineHeight: 28,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLetterText: {
    fontWeight: '900' as any,
    fontSize: 14,
    color: colors.textSecondary,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  checkmark: {
    fontSize: 18,
    color: colors.success,
    fontWeight: '900' as any,
  },
  crossmark: {
    fontSize: 18,
    color: colors.error,
    fontWeight: '900' as any,
  },
  explanationPanel: {
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1.5,
  },
  explanationPanelCorrect: {
    backgroundColor: colors.successBg,
    borderColor: colors.success,
  },
  explanationPanelWrong: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
  },
  explanationTitle: {
    fontWeight: '900' as any,
    fontSize: 16,
    marginBottom: 6,
  },
  explanationTitleCorrect: {
    color: colors.successText,
  },
  explanationTitleWrong: {
    color: '#92400e',
  },
  correctAnswerHint: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 6,
  },
  explanationText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  ctaContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  ctaButtonDisabled: {
    opacity: 0.4,
  },
  ctaButtonText: {
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
  cooldownBlock: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
    padding: 28,
    alignItems: 'center' as any,
    marginVertical: 20,
  },
  cooldownEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  cooldownTitle: {
    fontWeight: '900' as any,
    fontSize: 16,
    color: '#92400e',
    marginBottom: 8,
  },
  cooldownText: {
    fontSize: 13,
    color: '#a16207',
    lineHeight: 20,
    textAlign: 'center' as any,
    marginBottom: 16,
  },
  cooldownTimerBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  cooldownTimer: {
    fontWeight: '900' as any,
    fontSize: 18,
    color: '#92400e',
  },
  reportLink: {
    alignSelf: 'flex-end' as const,
    marginTop: 6,
    paddingVertical: 4,
  },
  reportLinkText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700' as any,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 24,
  },
  modalBox: {
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 24,
    width: '100%',
  },
  modalTitle: {
    fontWeight: '900' as any,
    fontSize: 17,
    color: colors.text,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
  },
  reasonGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 20,
  },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'white',
  },
  reasonChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#f0fdf4',
  },
  reasonChipText: {
    fontSize: 13,
    fontWeight: '600' as any,
    color: colors.textMuted,
  },
  reasonChipTextActive: {
    color: colors.primary,
    fontWeight: '900' as any,
  },
  modalActions: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700' as any,
    color: colors.textSecondary,
  },
  modalSubmitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  modalSubmitBtnDisabled: {
    backgroundColor: colors.border,
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '900' as any,
    color: 'white',
  },
  toggleRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 10,
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
    fontSize: 12,
    fontWeight: '700' as any,
    color: '#71717a',
  },
  toggleTextActive: {
    color: 'white',
  },
  retryText: {
    color: 'white',
    fontWeight: '700' as any,
    fontSize: 14,
  },
})