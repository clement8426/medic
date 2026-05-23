import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SessionResult, QuizAnswer } from '../../lib/types'
import { computeStars, computeResultMessage, computeXp } from '../../lib/quiz-utils'
import { resolveImageUrl } from '../../lib/image-utils'
import { colors } from '../../constants/colors'

export default function SessionRecapScreen() {
  const router = useRouter()
  const { case_id } = useLocalSearchParams<{ case_id: string }>()
  const [session, setSession] = useState<SessionResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!case_id) { setLoading(false); return }
    loadSession()
  }, [case_id])

  async function loadSession() {
    try {
      const raw = await AsyncStorage.getItem(`mediq_session_${case_id}`)
      if (raw) setSession(JSON.parse(raw))
    } catch {}
    setLoading(false)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    )
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Session introuvable</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/(tabs)/learn')}>
            <Text style={styles.primaryButtonText}>Tableau de bord</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const stars = computeStars(session.answers)
  const message = computeResultMessage(session.answers)
  const xp = computeXp(session.answers)
  const correct = session.answers.filter(a => a.is_correct).length
  const total = session.answers.length
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0

  const starEmojis = Array.from({ length: 3 }).map((_, i) => i < stars ? '⭐' : '☆')
  const imageUrl = session.image_url
    ? (session.module_slug === 'ecg' && session.focus_urls?.d2_band
        ? session.focus_urls.d2_band
        : resolveImageUrl(session.image_url, session.module_slug || ''))
    : null

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.starsRow}>{starEmojis.join(' ')}</Text>
          <Text style={styles.resultMessage}>{message}</Text>
          <Text style={styles.caseLabel}>{session.case_label}</Text>
          <View style={styles.statsRow}>
            {[
              { label: 'Réponses', value: `${correct}/${total}` },
              { label: 'Score', value: `${pct}%` },
              { label: 'XP', value: `+${xp}` },
            ].map(s => (
              <View key={s.label} style={styles.statBox}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Case image */}
        {imageUrl && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUrl }} style={styles.caseImage} resizeMode="contain" />
          </View>
        )}

        {/* Correction card */}
        {session.report_fr && (
          <View style={styles.correctionCard}>
            <Text style={styles.correctionLabel}>CORRECTION — DIAGNOSTIC</Text>
            <Text style={styles.correctionText}>{session.report_fr}</Text>
          </View>
        )}

        {/* Answer detail */}
        <Text style={styles.sectionLabel}>Détail des réponses</Text>

        {session.answers.map((answer, idx) => (
          <View key={answer.quiz_id} style={[styles.answerCard, answer.is_correct ? styles.answerCardCorrect : styles.answerCardWrong]}>
            <View style={styles.answerHeader}>
              <View style={[styles.answerDot, answer.is_correct ? styles.dotCorrect : styles.dotWrong]} />
              <Text style={styles.answerTheme}>
                {answer.theme ? answer.theme.charAt(0).toUpperCase() + answer.theme.slice(1) : ''}
              </Text>
              <Text style={[styles.answerIcon, { color: answer.is_correct ? colors.success : colors.error }]}>
                {answer.is_correct ? '✓' : '✗'}
              </Text>
            </View>
            <View style={styles.answerContent}>
              {!answer.is_correct && (
                <Text style={styles.correctAnswerText}>
                  Bonne réponse : <Text style={{ fontWeight: '700' as any }}>{answer.correct_answer}</Text>
                </Text>
              )}
              <Text style={[styles.givenAnswerText, answer.is_correct ? { color: colors.successText } : { color: colors.errorText }]}>
                {answer.is_correct ? answer.given_answer : `Votre réponse : ${answer.given_answer ?? 'aucune'}`}
              </Text>
            </View>
          </View>
        ))}

        {/* XP earned */}
        <View style={styles.xpCard}>
          <Text style={styles.xpEmoji}>🎉</Text>
          <Text style={styles.xpText}>+{xp} XP gagnés</Text>
        </View>

        {/* Actions */}
        {session.module_slug && (
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace(`/module/${session.module_slug}` as any)}>
            <Text style={styles.primaryButtonText}>Retour au module →</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={session.module_slug ? styles.secondaryButton : styles.primaryButton}
          onPress={() => router.replace('/(tabs)/learn')}
        >
          <Text style={session.module_slug ? styles.secondaryButtonText : styles.primaryButtonText}>
            Tableau de bord
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 28,
    paddingTop: Platform.OS === 'ios' ? 20 : 28,
    alignItems: 'center',
  },
  starsRow: {
    fontSize: 40,
    letterSpacing: 4,
    marginBottom: 12,
  },
  resultMessage: {
    fontSize: 28,
    fontWeight: '900' as any,
    color: 'white',
    marginBottom: 4,
  },
  caseLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900' as any,
    color: 'white',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700' as any,
    color: 'rgba(167,243,208,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  imageContainer: {
    backgroundColor: '#0a0a0a',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  caseImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#0a0a0a',
  },
  correctionCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#86efac',
    padding: 18,
    marginHorizontal: 16,
    marginTop: 12,
  },
  correctionLabel: {
    fontSize: 10,
    fontWeight: '900' as any,
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  correctionText: {
    fontSize: 14,
    fontWeight: '600' as any,
    color: '#166534',
    lineHeight: 22,
  },
  sectionLabel: {
    fontWeight: '800' as any,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  answerCard: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  answerCardCorrect: {
    backgroundColor: colors.successBg,
    borderColor: colors.success,
  },
  answerCardWrong: {
    backgroundColor: colors.errorBg,
    borderColor: colors.error,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  answerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotCorrect: {
    backgroundColor: colors.success,
  },
  dotWrong: {
    backgroundColor: colors.error,
  },
  answerTheme: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700' as any,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  answerIcon: {
    fontSize: 18,
    fontWeight: '900' as any,
  },
  answerContent: {},
  correctAnswerText: {
    fontSize: 13,
    color: colors.errorText,
    marginBottom: 2,
  },
  givenAnswerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  xpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 10,
  },
  xpEmoji: {
    fontSize: 28,
  },
  xpText: {
    fontSize: 20,
    fontWeight: '900' as any,
    color: colors.primary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '900' as any,
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '700' as any,
    fontSize: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    color: colors.errorText,
    fontSize: 15,
  },
})
