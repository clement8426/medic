import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Stethoscope, Syringe, Baby, HeartHandshake, GraduationCap, Sparkles } from 'lucide-react-native'
import { supabase } from '../lib/supabase'
import { upsertProfile } from '../lib/queries'
import { colors } from '../constants/colors'
import type { ProfTitle } from '../lib/types'

const TITLES: { value: ProfTitle; label: string; Icon: React.ComponentType<any> }[] = [
  { value: 'medecin',       label: 'Médecin',         Icon: Stethoscope    },
  { value: 'infirmier',     label: 'Infirmier(ère)',   Icon: Syringe        },
  { value: 'sage_femme',    label: 'Sage-femme',       Icon: Baby           },
  { value: 'aide_soignant', label: 'Aide-soignant(e)', Icon: HeartHandshake },
  { value: 'etudiant',      label: 'Étudiant(e)',      Icon: GraduationCap  },
  { value: 'autre',         label: 'Autre',            Icon: Sparkles       },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const [step, setStep]           = useState<1 | 2 | 3>(1)
  const [pseudo, setPseudo]       = useState('')
  const [title, setTitle]         = useState<ProfTitle | null>(null)
  const [gender, setGender]       = useState<'homme' | 'femme' | 'autre' | null>(null)
  const [institution, setInstitution] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [rgpdConsent, setRgpdConsent] = useState(false)
  const [saving, setSaving]       = useState(false)

  async function handleFinish() {
    if (!rgpdConsent) { Alert.alert('Consentement requis', 'Vous devez accepter la politique de confidentialité pour continuer.'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      await upsertProfile(user.id, {
        pseudo: pseudo.trim(),
        title,
        gender,
        institution: institution.trim() || null,
        show_email: false,
        is_anonymous: isAnonymous,
        avatar_url: null,
      })
      router.replace('/(tabs)/learn')
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur inattendue')
    } finally {
      setSaving(false)
    }
  }

  const canContinue1 = pseudo.trim().length > 0 && title !== null
  const canContinue2 = true
  const canFinish    = rgpdConsent

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Step indicator */}
        <View style={s.steps}>
          {[1, 2, 3].map((n, i) => (
            <View key={n} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[s.dot, step >= n && s.dotActive]}>
                <Text style={[s.dotText, step >= n && s.dotTextActive]}>{n}</Text>
              </View>
              {i < 2 && <View style={[s.line, step > n && s.lineActive]} />}
            </View>
          ))}
        </View>

        {step === 1 && (
          <>
            <Text style={s.title}>Créez votre profil</Text>
            <Text style={s.subtitle}>Ces informations apparaîtront dans le classement</Text>

            <Text style={s.label}>Pseudo *</Text>
            <TextInput
              style={s.input}
              value={pseudo}
              onChangeText={setPseudo}
              placeholder="VotrePseudo"
              placeholderTextColor={colors.textMuted}
              maxLength={40}
              autoCapitalize="none"
            />

            <Text style={[s.label, { marginTop: 18 }]}>Titre professionnel *</Text>
            <View style={s.grid}>
              {TITLES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[s.titleCard, title === t.value && s.titleCardSelected]}
                  onPress={() => setTitle(t.value)}
                >
                  <t.Icon size={22} color={title === t.value ? colors.primary : colors.textMuted} strokeWidth={1.75} />
                  <Text style={[s.titleLabel, title === t.value && s.titleLabelSelected]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.btn, !canContinue1 && s.btnDisabled]}
              onPress={() => canContinue1 && setStep(2)}
              disabled={!canContinue1}
            >
              <Text style={s.btnText}>Continuer →</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={s.title}>Informations optionnelles</Text>
            <Text style={s.subtitle}>Ces champs sont facultatifs</Text>

            <Text style={s.label}>Genre</Text>
            <View style={s.genderRow}>
              {([['homme', 'Homme'], ['femme', 'Femme'], ['autre', 'Autre']] as const).map(([v, l]) => (
                <TouchableOpacity
                  key={v}
                  style={[s.genderBtn, gender === v && s.genderBtnSelected]}
                  onPress={() => setGender(gender === v ? null : v)}
                >
                  <Text style={[s.genderText, gender === v && s.genderTextSelected]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.label, { marginTop: 18 }]}>Établissement</Text>
            <TextInput
              style={s.input}
              value={institution}
              onChangeText={setInstitution}
              placeholder="CHU de Lyon…"
              placeholderTextColor={colors.textMuted}
              maxLength={80}
            />

            <View style={s.row}>
              <TouchableOpacity
                style={[s.backBtn]}
                onPress={() => setStep(1)}
              >
                <Text style={s.backBtnText}>← Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { flex: 2 }]} onPress={() => setStep(3)}>
                <Text style={s.btnText}>Continuer →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={s.title}>Confidentialité</Text>
            <Text style={s.subtitle}>Dernière étape avant de commencer</Text>

            <TouchableOpacity
              style={[s.toggleRow, isAnonymous && s.toggleRowActive]}
              onPress={() => setIsAnonymous(!isAnonymous)}
            >
              <View style={[s.checkbox, isAnonymous && s.checkboxActive]}>
                {isAnonymous && <Text style={s.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>Mode anonyme</Text>
                <Text style={s.toggleSub}>Seul votre pseudo sera visible dans le classement</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.toggleRow, rgpdConsent && s.toggleRowActive, { marginTop: 12 }]}
              onPress={() => setRgpdConsent(!rgpdConsent)}
            >
              <View style={[s.checkbox, rgpdConsent && s.checkboxActive]}>
                {rgpdConsent && <Text style={s.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>J&apos;accepte la politique de confidentialité *</Text>
                <Text style={s.toggleSub} onPress={() => Linking.openURL('https://mediq.app/rgpd')}>
                  Voir la politique de confidentialité
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={s.rgpdNote}>
              Vos données sont protégées conformément au RGPD. Vous pouvez les modifier ou les supprimer à tout moment depuis les paramètres.
            </Text>

            <View style={s.row}>
              <TouchableOpacity style={s.backBtn} onPress={() => setStep(2)}>
                <Text style={s.backBtnText}>← Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, { flex: 2 }, !canFinish && s.btnDisabled]}
                onPress={handleFinish}
                disabled={!canFinish || saving}
              >
                <Text style={s.btnText}>{saving ? 'Création…' : 'Commencer !'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 48 },
  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e4e4e7', alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: colors.primary },
  dotText: { fontSize: 12, fontWeight: '700' as any, color: '#94a3b8' },
  dotTextActive: { color: 'white' },
  line: { width: 32, height: 2, backgroundColor: '#e4e4e7', marginHorizontal: 4 },
  lineActive: { backgroundColor: colors.primary },
  title: { fontSize: 24, fontWeight: '900' as any, color: colors.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  label: { fontWeight: '700' as any, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, backgroundColor: colors.bg, marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  titleCard: { width: '47%', backgroundColor: colors.bg, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', gap: 6 },
  titleCardSelected: { backgroundColor: '#e6f4f3', borderColor: colors.primary },
  titleLabel: { fontSize: 13, fontWeight: '700' as any, color: colors.text, textAlign: 'center' },
  titleLabelSelected: { color: colors.primary },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  genderBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', backgroundColor: 'white' },
  genderBtnSelected: { borderColor: colors.primary, backgroundColor: '#e6f4f3' },
  genderText: { fontWeight: '700' as any, fontSize: 14, color: colors.text },
  genderTextSelected: { color: colors.primary },
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 14, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.bg },
  toggleRowActive: { borderColor: colors.primary, backgroundColor: '#e6f4f3' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d4d4d8', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: 'white', fontSize: 13, fontWeight: '900' as any },
  toggleLabel: { fontWeight: '700' as any, fontSize: 14, color: colors.text },
  toggleSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rgpdNote: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 18, marginBottom: 8, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 10, marginTop: 28 },
  btn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: 'white', fontWeight: '900' as any, fontSize: 16 },
  backBtn: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: colors.border, backgroundColor: 'white' },
  backBtnText: { fontWeight: '700' as any, fontSize: 15, color: colors.textSecondary },
})
