import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { getModuleQuizzes, saveClassicQuizSession } from '../../../lib/queries'
import { supabase } from '../../../lib/supabase'
import type { Module, ModuleQuiz } from '../../../lib/types'
import { colors } from '../../../constants/colors'

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong'

export default function ClassicQuizScreen() {
  const router = useRouter()
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>()

  const [mod, setMod] = useState<Module | null>(null)
  const [questions, setQuestions] = useState<ModuleQuiz[]>([])
  const [shuffled, setShuffled] = useState<string[][]>([])
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')

  useEffect(() => {
    if (!moduleId) return
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
      const { data: modData } = await supabase
        .from('modules')
        .select('*')
        .eq('id', moduleId)
        .single()
      if (modData) setMod(modData)
      const qs = await getModuleQuizzes(moduleId as string)
      setQuestions(qs)
      setShuffled(qs.map(q => shuffle([q.correct_fr, ...q.distractors_fr])))
      setLoading(false)
    }
    load()
  }, [moduleId])

  function shuffle(arr: string[]): string[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const current = questions[idx]
  const currentOptions = shuffled[idx] ?? []

  function getState(opt: string): OptionState {
    if (!revealed) return opt === selected ? 'selected' : 'idle'
    if (opt === current?.correct_fr) return 'correct'
    if (opt === selected) return 'wrong'
    return 'idle'
  }

  function handleValidate() {
    if (!selected || revealed) return
    setRevealed(true)
    if (selected === current?.correct_fr) setScore(s => s + 1)
  }

  async function handleNext() {
    const isCorrect = selected === current?.correct_fr
    if (userId && moduleId) {
      await saveClassicQuizSession(userId, moduleId as string, 1, isCorrect ? 1 : 0)
    }
    if (idx >= questions.length - 1) {
      setDone(true)
    } else {
      setIdx(i => i + 1)
      setSelected(null)
      setRevealed(false)
    }
  }

  function restart() {
    setIdx(0)
    setSelected(null)
    setRevealed(false)
    setScore(0)
    setDone(false)
    setShuffled(questions.map(q => shuffle([q.correct_fr, ...q.distractors_fr])))
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    )
  }

  if (done) {
    const pct = questions.length > 0 ? score / questions.length : 0
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.doneContainer}>
          <View style={styles.doneCard}>
            <Text style={styles.doneEmoji}>
              {pct >= 0.8 ? '🏆' : pct >= 0.5 ? '👍' : '📚'}
            </Text>
            <Text style={styles.doneScore}>{score} / {questions.length}</Text>
            <Text style={styles.doneMsg}>
              {pct >= 0.8 ? 'Excellent !' : pct >= 0.5 ? 'Bien joué !' : 'Continue à réviser !'}
            </Text>
          </View>
          <TouchableOpacity style={styles.restartBtn} onPress={restart}>
            <Text style={styles.restartBtnText}>Recommencer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (!current) return null

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(idx / questions.length) * 100}%` as any }]} />
        </View>
        <Text style={styles.stepCount}>{idx + 1}/{questions.length}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Theme */}
        {current.theme && (
          <View style={styles.themeBadge}>
            <Text style={styles.themeBadgeText}>{current.theme.toUpperCase()}</Text>
          </View>
        )}

        {/* Question */}
        <Text style={styles.question}>{current.question_fr}</Text>

        {/* Options */}
        <View style={styles.options}>
          {currentOptions.map((opt, i) => {
            const state = getState(opt)
            return (
              <TouchableOpacity
                key={i}
                style={[styles.option, optionStyle(state)]}
                onPress={() => { if (!revealed) setSelected(opt) }}
                disabled={revealed}
                activeOpacity={0.85}
              >
                <View style={[styles.optionLetter, optionLetterBg(state)]}>
                  <Text style={[styles.optionLetterText, state !== 'idle' && { color: 'white' }]}>
                    {state === 'correct' ? '✓' : state === 'wrong' ? '✗' : String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text style={[styles.optionText, optionTextColor(state)]}>{opt}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Explanation */}
        {revealed && current.explanation_correct_fr && (
          <View style={[
            styles.explanation,
            selected === current.correct_fr ? styles.explanationCorrect : styles.explanationWrong,
          ]}>
            <Text style={[styles.explanationTitle, selected === current.correct_fr ? styles.explanationTitleCorrect : styles.explanationTitleWrong]}>
              {selected === current.correct_fr ? '✓ Correct !' : `✗ Bonne réponse : ${current.correct_fr}`}
            </Text>
            <Text style={styles.explanationText}>{current.explanation_correct_fr}</Text>
          </View>
        )}
      </ScrollView>

      {/* CTA */}
      <View style={styles.cta}>
        <TouchableOpacity
          style={[styles.ctaBtn, (!selected && !revealed) && styles.ctaBtnDisabled]}
          onPress={revealed ? handleNext : handleValidate}
          disabled={!selected && !revealed}
        >
          <Text style={styles.ctaBtnText}>
            {revealed
              ? idx >= questions.length - 1 ? 'Voir les résultats' : 'Suivant →'
              : 'Valider'}
          </Text>
        </TouchableOpacity>
      </View>
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
function optionLetterBg(state: OptionState) {
  switch (state) {
    case 'selected': return { backgroundColor: colors.primary }
    case 'correct':  return { backgroundColor: colors.success }
    case 'wrong':    return { backgroundColor: colors.error }
    default:         return {}
  }
}
function optionTextColor(state: OptionState) {
  switch (state) {
    case 'correct': return { color: colors.successText, fontWeight: '700' as any }
    case 'wrong':   return { color: colors.errorText, fontWeight: '700' as any }
    case 'selected': return { color: colors.primaryDark, fontWeight: '700' as any }
    default:        return {}
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#0891b2',
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeBtn: { padding: 4 },
  closeBtnText: { color: 'white', fontSize: 18, fontWeight: '700' as any },
  progressBar: {
    flex: 1, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 3,
    backgroundColor: 'white',
  },
  stepCount: { color: 'white', fontWeight: '700' as any, fontSize: 13 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 24 },
  themeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0f4ff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  themeBadgeText: {
    color: '#0c4a6e',
    fontWeight: '700' as any,
    fontSize: 11,
    letterSpacing: 1,
  },
  question: {
    fontSize: 20,
    fontWeight: '900' as any,
    color: colors.text,
    lineHeight: 28,
    marginBottom: 24,
  },
  options: { gap: 10 },
  option: {
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
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  optionLetterText: { fontWeight: '900' as any, fontSize: 14, color: colors.textSecondary },
  optionText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 20 },
  explanation: {
    borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1.5,
  },
  explanationCorrect: { backgroundColor: colors.successBg, borderColor: colors.success },
  explanationWrong: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
  explanationTitle: { fontWeight: '900' as any, fontSize: 14, marginBottom: 6 },
  explanationTitleCorrect: { color: colors.successText },
  explanationTitleWrong: { color: '#92400e' },
  explanationText: { fontSize: 13, color: colors.text, lineHeight: 20 },
  cta: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ctaBtn: {
    backgroundColor: '#0891b2',
    borderRadius: 16, padding: 16, alignItems: 'center',
  },
  ctaBtnDisabled: { opacity: 0.4 },
  ctaBtnText: { color: 'white', fontWeight: '900' as any, fontSize: 16 },
  doneContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  doneCard: {
    backgroundColor: '#0891b2',
    borderRadius: 28, padding: '40px 32px' as any,
    alignItems: 'center', width: '100%', marginBottom: 20,
  },
  doneEmoji: { fontSize: 52, marginBottom: 12 },
  doneScore: { fontSize: 36, fontWeight: '900' as any, color: 'white', marginBottom: 8 },
  doneMsg: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  restartBtn: {
    backgroundColor: '#0891b2',
    borderRadius: 16, padding: 16,
    alignItems: 'center', width: '100%', marginBottom: 12,
  },
  restartBtnText: { color: 'white', fontWeight: '900' as any, fontSize: 16 },
  backBtn: {
    backgroundColor: '#f4f4f5',
    borderRadius: 16, padding: 14,
    alignItems: 'center', width: '100%',
  },
  backBtnText: { color: colors.text, fontWeight: '700' as any, fontSize: 15 },
})
