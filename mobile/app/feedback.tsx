import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft, Send, CheckCircle } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { submitFeedback } from '@/lib/queries'
import type { FeedbackType } from '@/lib/types'

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: 'bug',        label: 'Bug'        },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'content',    label: 'Contenu'    },
  { value: 'other',      label: 'Autre'      },
]

export default function FeedbackScreen() {
  const router = useRouter()
  const [type, setType]             = useState<FeedbackType>('suggestion')
  const [message, setMessage]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]             = useState(false)

  async function handleSubmit() {
    if (!message.trim()) return
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await submitFeedback({
        reporter_id: user?.id ?? null,
        page_url: 'mobile/app',
        type,
        message: message.trim(),
        platform: 'mobile',
      })
      setDone(true)
    } catch {
      // silently ignore
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#09090b" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donner mon avis</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {done ? (
          <View style={styles.doneBox}>
            <CheckCircle size={56} color="#16a34a" strokeWidth={1.5} />
            <Text style={styles.doneTitle}>Merci pour ton retour !</Text>
            <Text style={styles.doneSub}>Ton avis nous aide à améliorer MEDIQ.</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Retour</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Type de retour</Text>
            <View style={styles.typeGrid}>
              {TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setType(t.value)}
                  style={[styles.typeChip, type === t.value && styles.typeChipActive]}
                >
                  <Text style={[styles.typeChipText, type === t.value && styles.typeChipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Ton message</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Décris ton problème ou ta suggestion…"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={6}
              style={styles.textarea}
              textAlignVertical="top"
            />

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!message.trim() || submitting}
              style={[styles.submitBtn, (!message.trim() || submitting) && styles.submitBtnDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Send size={16} color="white" strokeWidth={2} />
                  <Text style={styles.submitText}>Envoyer</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f4f7f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 12,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#09090b',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 20,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#e4e4e7',
  },
  typeChipActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#71717a',
  },
  typeChipTextActive: {
    color: 'white',
  },
  textarea: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e4e4e7',
    padding: 14,
    fontSize: 15,
    color: '#09090b',
    minHeight: 130,
    lineHeight: 22,
  },
  submitBtn: {
    marginTop: 24,
    backgroundColor: '#0F766E',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#d4d4d8',
  },
  submitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  doneBox: {
    marginTop: 60,
    alignItems: 'center',
    gap: 14,
  },
  doneTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#09090b',
    textAlign: 'center',
  },
  doneSub: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
  },
  doneBtn: {
    marginTop: 12,
    backgroundColor: '#0F766E',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  doneBtnText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 15,
  },
})
