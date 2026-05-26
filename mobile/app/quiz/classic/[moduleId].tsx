import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { getModuleQuizzes, getModuleQuizProgress, saveModuleQuizAnswer, saveClassicQuizSession } from '../../../lib/queries'
import { computeNextReview } from '../../../lib/quiz-utils'
import { supabase } from '../../../lib/supabase'
import type { Module, ModuleQuiz, ModuleQuizProgress } from '../../../lib/types'
import { colors } from '../../../constants/colors'

const SESSION_SIZE = 20
const MAX_REQUEUES = 2

type QueueItem = { q: ModuleQuiz; opts: string[]; requeued: number }
type OptionState = 'idle' | 'selected' | 'correct' | 'wrong'

function shuffleArr(arr: string[]): string[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQueue(
  questions: ModuleQuiz[],
  progressMap: Map<string, ModuleQuizProgress>,
  forceAll = false
): QueueItem[] {
  const now = new Date()
  const due: QueueItem[] = []
  const newQ: QueueItem[] = []
  const mastered: QueueItem[] = []

  for (const q of questions) {
    const prog = progressMap.get(q.id)
    const opts = shuffleArr([q.correct_fr, ...q.distractors_fr])
    const item: QueueItem = { q, opts, requeued: 0 }
    if (!prog) {
      newQ.push(item)
    } else if (!prog.next_review_at || new Date(prog.next_review_at) <= now) {
      due.push(item)
    } else {
      mastered.push(item)
    }
  }

  for (let i = newQ.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newQ[i], newQ[j]] = [newQ[j], newQ[i]]
  }

  if (forceAll) {
    for (let i = mastered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[mastered[i], mastered[j]] = [mastered[j], mastered[i]]
    }
    return [...due, ...newQ, ...mastered].slice(0, SESSION_SIZE)
  }
  return [...due, ...newQ].slice(0, SESSION_SIZE)
}

export default function ClassicQuizScreen() {
  const router = useRouter()
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>()

  const [mod, setMod] = useState<Module | null>(null)
  const [allQuestions, setAllQuestions] = useState<ModuleQuiz[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [noContent, setNoContent] = useState(false)
  const [allMastered, setAllMastered] = useState(false)

  const [queue, setQueue] = useState<QueueItem[]>([])
  const [qIdx, setQIdx] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [done, setDone] = useState(false)
  const [progressMap, setProgressMap] = useState<Map<string, ModuleQuizProgress>>(new Map())

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

      const [questions, progress] = await Promise.all([
        getModuleQuizzes(moduleId as string),
        user ? getModuleQuizProgress(user.id, moduleId as string) : Promise.resolve([]),
      ])

      if (questions.length === 0) { setNoContent(true); setLoading(false); return }
      setAllQuestions(questions)

      const pMap = new Map<string, ModuleQuizProgress>()
      for (const p of progress) pMap.set(p.quiz_id, p)
      setProgressMap(pMap)

      const q = buildQueue(questions, pMap)
      if (q.length === 0) { setAllMastered(true); setLoading(false); return }
      setQueue(q)
      setSessionTotal(q.length)
      setLoading(false)
    }
    load()
  }, [moduleId])

  function startForceSession() {
    const q = buildQueue(allQuestions, progressMap, true)
    setQueue(q)
    setSessionTotal(q.length)
    setQIdx(0)
    setSelected(null)
    setRevealed(false)
    setCorrectCount(0)
    setDone(false)
    setAllMastered(false)
  }

  function restart() {
    const q = buildQueue(allQuestions, progressMap)
    if (q.length === 0) { setAllMastered(true); return }
    setQueue(q)
    setSessionTotal(q.length)
    setQIdx(0)
    setSelected(null)
    setRevealed(false)
    setCorrectCount(0)
    setDone(false)
  }

  const current = queue[qIdx]

  function getState(opt: string): OptionState {
    if (!revealed) return opt === selected ? 'selected' : 'idle'
    if (opt === current?.q.correct_fr) return 'correct'
    if (opt === selected) return 'wrong'
    return 'idle'
  }

  function handleValidate() {
    if (!selected || revealed) return
    setRevealed(true)
  }

  async function handleNext() {
    if (!current || !selected) return
    const isCorrect = selected === current.q.correct_fr

    if (userId && moduleId) {
      const prog = progressMap.get(current.q.id)
      const srs = computeNextReview(isCorrect, prog?.ease_factor ?? 2.5, prog?.interval_days ?? 1)
      saveModuleQuizAnswer(userId, moduleId as string, current.q.id, isCorrect, srs.easeFactor, srs.intervalDays, srs.nextReviewAt)
        .catch(() => {})
      setProgressMap(prev => {
        const next = new Map(prev)
        next.set(current.q.id, {
          ...(prev.get(current.q.id) ?? { id: '', user_id: userId, created_at: new Date().toISOString() }),
          quiz_id: current.q.id,
          module_id: moduleId as string,
          answered_correctly: isCorrect,
          ease_factor: srs.easeFactor,
          interval_days: srs.intervalDays,
          next_review_at: srs.nextReviewAt,
          updated_at: new Date().toISOString(),
        } as ModuleQuizProgress)
        return next
      })
    }

    const newCorrect = isCorrect ? correctCount + 1 : correctCount
    if (isCorrect) setCorrectCount(newCorrect)

    let newQueue = queue
    if (!isCorrect && current.requeued < MAX_REQUEUES) {
      newQueue = [...queue]
      const insertAt = Math.min(qIdx + 3, newQueue.length)
      newQueue.splice(insertAt, 0, { ...current, requeued: current.requeued + 1 })
      setQueue(newQueue)
    }

    const nextIdx = qIdx + 1
    if (nextIdx >= newQueue.length) {
      if (userId && moduleId) {
        await saveClassicQuizSession(userId, moduleId as string, sessionTotal, newCorrect)
      }
      setDone(true)
    } else {
      setQIdx(nextIdx)
      setSelected(null)
      setRevealed(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    )
  }

  if (noContent) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🚧</Text>
          <Text style={styles.emptyTitle}>Questions bientôt disponibles</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (allMastered) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.doneContainer}>
          <View style={styles.doneCard}>
            <Text style={styles.doneEmoji}>🎓</Text>
            <Text style={styles.doneScore}>Tout maîtrisé !</Text>
            <Text style={styles.doneMsg}>Aucune question à réviser maintenant.{'\n'}Reviens plus tard selon ton SRS.</Text>
          </View>
          <TouchableOpacity style={styles.restartBtn} onPress={startForceSession}>
            <Text style={styles.restartBtnText}>Revoir quand même</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (done) {
    const pct = sessionTotal > 0 ? correctCount / sessionTotal : 0
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.doneContainer}>
          <View style={styles.doneCard}>
            <Text style={styles.doneEmoji}>{pct >= 0.8 ? '🏆' : pct >= 0.5 ? '👍' : '📚'}</Text>
            <Text style={styles.doneScore}>{correctCount} / {sessionTotal}</Text>
            <Text style={styles.doneMsg}>{pct >= 0.8 ? 'Excellent !' : pct >= 0.5 ? 'Bien joué !' : 'Continue à réviser !'}</Text>
            <Text style={styles.xpLabel}>+{correctCount * 2} XP gagnés</Text>
          </View>
          <TouchableOpacity style={styles.restartBtn} onPress={restart}>
            <Text style={styles.restartBtnText}>Nouvelle session</Text>
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
          <View style={[styles.progressFill, { width: `${Math.min(100, Math.round((correctCount / sessionTotal) * 100))}%` as any }]} />
        </View>
        <Text style={styles.stepCount}>{correctCount}/{sessionTotal} ✓</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Badges */}
        <View style={styles.badges}>
          {current.requeued > 0 && (
            <View style={styles.requeueBadge}>
              <Text style={styles.requeueBadgeText}>↩ Réessai {current.requeued}/{MAX_REQUEUES}</Text>
            </View>
          )}
          {current.q.theme && (
            <View style={styles.themeBadge}>
              <Text style={styles.themeBadgeText}>{current.q.theme.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Question */}
        <Text style={styles.question}>{current.q.question_fr}</Text>

        {/* Options */}
        <View style={styles.options}>
          {current.opts.map((opt, i) => {
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
        {revealed && current.q.explanation_correct_fr && (
          <View style={[
            styles.explanation,
            selected === current.q.correct_fr ? styles.explanationCorrect : styles.explanationWrong,
          ]}>
            <Text style={[styles.explanationTitle, selected === current.q.correct_fr ? styles.explanationTitleCorrect : styles.explanationTitleWrong]}>
              {selected === current.q.correct_fr ? '✓ Correct !' : `✗ Bonne réponse : ${current.q.correct_fr}`}
            </Text>
            <Text style={styles.explanationText}>{current.q.explanation_correct_fr}</Text>
            {selected !== current.q.correct_fr && current.requeued < MAX_REQUEUES && (
              <Text style={styles.requeueNote}>↩ Cette question reviendra dans la session</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* CTA */}
      <View style={styles.cta}>
        <TouchableOpacity
          style={[styles.ctaBtn, (!selected && !revealed) && styles.ctaBtnDisabled]}
          onPress={revealed ? handleNext : handleValidate}
          disabled={!selected && !revealed}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>
            {revealed ? 'Suivant →' : 'Valider'}
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontWeight: '900' as any, fontSize: 18, color: colors.text, marginBottom: 24, textAlign: 'center' },
  header: {
    backgroundColor: '#0891b2',
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  closeBtn: { padding: 4 },
  closeBtnText: { color: 'white', fontSize: 18, fontWeight: '700' as any },
  progressBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#22c55e' },
  stepCount: { color: 'white', fontWeight: '700' as any, fontSize: 13 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 24 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  requeueBadge: { backgroundColor: '#fff7ed', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  requeueBadgeText: { color: '#c2410c', fontWeight: '700' as any, fontSize: 11 },
  themeBadge: { alignSelf: 'flex-start', backgroundColor: '#e0f4ff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  themeBadgeText: { color: '#0c4a6e', fontWeight: '700' as any, fontSize: 11, letterSpacing: 1 },
  question: { fontSize: 20, fontWeight: '900' as any, color: colors.text, lineHeight: 28, marginBottom: 24 },
  options: { gap: 10 },
  option: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 16, padding: 14, borderWidth: 2, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  optionLetter: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  optionLetterText: { fontWeight: '900' as any, fontSize: 14, color: colors.textSecondary },
  optionText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 20 },
  explanation: { borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1.5 },
  explanationCorrect: { backgroundColor: colors.successBg, borderColor: colors.success },
  explanationWrong: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
  explanationTitle: { fontWeight: '900' as any, fontSize: 14, marginBottom: 6 },
  explanationTitleCorrect: { color: colors.successText },
  explanationTitleWrong: { color: '#92400e' },
  explanationText: { fontSize: 13, color: colors.text, lineHeight: 20 },
  requeueNote: { marginTop: 8, fontSize: 11, fontWeight: '700' as any, color: '#c2410c' },
  cta: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 28 : 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: colors.border },
  ctaBtn: { backgroundColor: '#0891b2', borderRadius: 16, padding: 16, alignItems: 'center' },
  ctaBtnDisabled: { opacity: 0.4 },
  ctaBtnText: { color: 'white', fontWeight: '900' as any, fontSize: 16 },
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  doneCard: { backgroundColor: '#0891b2', borderRadius: 28, paddingVertical: 40, paddingHorizontal: 32, alignItems: 'center', width: '100%', marginBottom: 20 },
  doneEmoji: { fontSize: 52, marginBottom: 12 },
  doneScore: { fontSize: 28, fontWeight: '900' as any, color: 'white', marginBottom: 8 },
  doneMsg: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  xpLabel: { marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: '700' as any },
  restartBtn: { backgroundColor: '#0891b2', borderRadius: 16, padding: 16, alignItems: 'center', width: '100%', marginBottom: 12 },
  restartBtnText: { color: 'white', fontWeight: '900' as any, fontSize: 16 },
  backBtn: { backgroundColor: '#f4f4f5', borderRadius: 16, padding: 14, alignItems: 'center', width: '100%' },
  backBtnText: { color: colors.text, fontWeight: '700' as any, fontSize: 15 },
})
